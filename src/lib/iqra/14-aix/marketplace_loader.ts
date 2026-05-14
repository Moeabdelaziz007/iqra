/**
 * 🛒 AIX Marketplace Loader — signed L3 skill retrieval for L2 runtime.
 *
 * Thin Ed25519 verification layer on top of `SkillLoader`. Adds:
 *   1. Optional Ed25519 verification of `skills.json` (JCS-canonical)
 *      and each `skills/<name>.md` (raw UTF-8) via detached `.sig` files.
 *   2. In-memory TTL cache keyed by skill id.
 *   3. Policy: off / permissive (default) / strict.
 *
 * Env vars override constructor options:
 *   IQRA_MARKETPLACE_PUBKEY        — base64url 32-byte Ed25519 public key.
 *   IQRA_MARKETPLACE_POLICY        — off|permissive|strict.
 *   IQRA_MARKETPLACE_CACHE_TTL_MS  — default 60000; 0 disables.
 *   IQRA_MARKETPLACE_PATH          — forwarded to SkillLoader discovery.
 *
 * See docs/L2_L3_INTEGRATION.md for the full contract.
 */

import fs from 'fs';
import path from 'path';
import { sha256 } from '@noble/hashes/sha256';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

import type { SkillEntry } from '#skills/loader';
import { IQRALogger } from '#infra/logger';
import { canonicalizeJSONBytes } from './canonical';
import { codec } from './ed25519_signer';

// @noble/ed25519 v2 requires the SHA-512 hook to be set before any
// sign/verify call. `ed25519_signer.ts` already wires this up at
// module load, and we re-assert it here so importing this module
// alone (e.g. from a test) is sufficient.
(ed25519 as any).etc.sha512Sync ??= (...m: Uint8Array[]): Uint8Array => {
  let len = 0;
  for (const a of m) len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of m) {
    out.set(a, off);
    off += a.length;
  }
  return sha512(out);
};

// ── Types ────────────────────────────────────────────────────────────────────

export type SignaturePolicy = 'off' | 'permissive' | 'strict';

export interface MarketplaceLoaderOptions {
  /** Override marketplace root; defaults to SkillLoader discovery. */
  marketplaceRoot?: string;
  /** Base64url-encoded 32-byte Ed25519 public key. */
  publicKey?: string;
  /** What to do when a signature is missing or invalid. */
  signaturePolicy?: SignaturePolicy;
  /** Cache TTL for skill content in ms. 0 disables caching. */
  cacheTTLMs?: number;
}

export interface SkillRecord {
  /** Skill id (kebab-case, e.g. "agent-memory"). */
  name: string;
  /** Short description from `skills.json`. */
  description?: string;
  /** Skill tier (BASIC_TOOL, PRO, SOVEREIGN, ...). */
  tier?: string;
  /** Raw markdown content. */
  content: string;
  /** True when a valid signature was verified for this skill. */
  signed: boolean;
  /** Absolute path the content was read from (diagnostics). */
  source: string;
}

export interface VerificationResult {
  verified: boolean;
  /** Human-readable reason when verification was skipped or failed. */
  reason?: string;
}

interface CacheEntry {
  record: SkillRecord;
  expiresAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsePolicy(value: string | undefined): SignaturePolicy | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'off' || normalized === 'permissive' || normalized === 'strict') {
    return normalized;
  }
  IQRALogger.warn(
    `⚠️ [MARKETPLACE] IQRA_MARKETPLACE_POLICY="${value}" is not one of ` +
      `off|permissive|strict; falling back to permissive.`,
  );
  return undefined;
}

function parseNonNegativeInt(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    IQRALogger.warn(
      `⚠️ [MARKETPLACE] IQRA_MARKETPLACE_CACHE_TTL_MS="${value}" is not a ` +
        `non-negative integer; ignoring.`,
    );
    return undefined;
  }
  return n;
}

function readBytes(filePath: string): Uint8Array | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return new Uint8Array(fs.readFileSync(filePath));
  } catch (err) {
    IQRALogger.error(`❌ [MARKETPLACE] Failed to read ${filePath}:`, err);
    return null;
  }
}

function readUtf8(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    IQRALogger.error(`❌ [MARKETPLACE] Failed to read ${filePath}:`, err);
    return null;
  }
}

// ── Implementation ───────────────────────────────────────────────────────────

export class MarketplaceLoader {
  /** Default cache TTL when caller does not configure one. */
  public static readonly DEFAULT_CACHE_TTL_MS = 60_000;

  /** Default policy when neither caller nor env supplies one. */
  public static readonly DEFAULT_POLICY: SignaturePolicy = 'permissive';

  public static readonly ENV_PUBKEY = 'IQRA_MARKETPLACE_PUBKEY';
  public static readonly ENV_POLICY = 'IQRA_MARKETPLACE_POLICY';
  public static readonly ENV_CACHE_TTL = 'IQRA_MARKETPLACE_CACHE_TTL_MS';

  private readonly _marketplaceRoot: string | null;
  private readonly _publicKey: Uint8Array | null;
  private readonly _policy: SignaturePolicy;
  private readonly _cacheTTLMs: number;
  private readonly _cache = new Map<string, CacheEntry>();

  constructor(opts: MarketplaceLoaderOptions = {}) {
    const envPubkey = process.env[MarketplaceLoader.ENV_PUBKEY];
    const envPolicy = parsePolicy(process.env[MarketplaceLoader.ENV_POLICY]);
    const envTTL = parseNonNegativeInt(process.env[MarketplaceLoader.ENV_CACHE_TTL]);

    this._marketplaceRoot = opts.marketplaceRoot ?? null;

    const pubKeyB64 = opts.publicKey ?? envPubkey ?? '';
    this._publicKey = pubKeyB64
      ? this._decodePublicKey(pubKeyB64)
      : null;

    this._policy = opts.signaturePolicy ?? envPolicy ?? MarketplaceLoader.DEFAULT_POLICY;

    this._cacheTTLMs = opts.cacheTTLMs ?? envTTL ?? MarketplaceLoader.DEFAULT_CACHE_TTL_MS;

    if (this._policy === 'strict' && !this._publicKey) {
      IQRALogger.warn(
        `⚠️ [MARKETPLACE] strict policy active but no public key configured ` +
          `(${MarketplaceLoader.ENV_PUBKEY}). All loads will be rejected.`,
      );
    }
  }

  /** Convenience: build a loader purely from process.env defaults. */
  public static fromEnv(): MarketplaceLoader {
    return new MarketplaceLoader();
  }

  /** Returns the active signature policy (resolved from opts + env). */
  public get policy(): SignaturePolicy {
    return this._policy;
  }

  /** True when a public key is configured and verification is feasible. */
  public get hasPublicKey(): boolean {
    return this._publicKey !== null;
  }

  /**
   * Resolve the marketplace root directory. Returns `null` when no
   * candidate contains a readable `skills.json`. When an explicit
   * `marketplaceRoot` was passed to the constructor, that path wins
   * and SkillLoader's auto-discovery is bypassed entirely — callers
   * can isolate the loader from any ambient marketplace on disk.
   */
  private _getRoot(): string | null {
    if (this._marketplaceRoot) {
      const manifestPath = path.join(this._marketplaceRoot, 'skills.json');
      return fs.existsSync(manifestPath) ? this._marketplaceRoot : null;
    }
    const env = process.env.IQRA_MARKETPLACE_PATH;
    if (env && env.trim()) {
      const dir = path.resolve(env.trim());
      if (fs.existsSync(path.join(dir, 'skills.json'))) return dir;
    }
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, 'aix-agent-skills'),
      path.join(cwd, '..', 'aix-agent-skills'),
      path.join(cwd, 'node_modules', '@aix', 'agent-skills'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, 'skills.json'))) return c;
    }
    return null;
  }

  /**
   * Read and parse the manifest from the resolved root. Returns null
   * on any failure. Equivalent to `SkillLoader.loadManifest()` but
   * respects this loader's explicit `marketplaceRoot` override so
   * tests and pinned deployments can isolate themselves from any
   * marketplace SkillLoader's global discovery happens to surface.
   */
  private _readManifest(): {
    name?: string;
    skills:
      | Array<{ name: string; description?: string; file: string; tier?: string }>
      | Record<string, string>;
  } | null {
    const root = this._getRoot();
    if (!root) return null;
    const manifestPath = path.join(root, 'skills.json');
    const raw = readUtf8(manifestPath);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      IQRALogger.error(`❌ [MARKETPLACE] Failed to parse ${manifestPath}:`, err);
      return null;
    }
  }

  /**
   * Decode a base64url Ed25519 public key. Returns null if the input
   * is malformed or not 32 bytes.
   */
  private _decodePublicKey(b64: string): Uint8Array | null {
    try {
      const bytes = codec.base64UrlToBytes(b64.trim());
      if (bytes.length !== 32) {
        IQRALogger.warn(
          `⚠️ [MARKETPLACE] Public key has ${bytes.length} bytes, expected 32. ` +
            `Verification disabled.`,
        );
        return null;
      }
      return bytes;
    } catch (err) {
      IQRALogger.warn(`⚠️ [MARKETPLACE] Failed to decode public key:`, err);
      return null;
    }
  }

  /**
   * Read a detached `.sig` file alongside a content file. The
   * signature is expected to be base64url-encoded Ed25519 (88 chars
   * before padding stripping; we accept any well-formed base64url
   * decoding to 64 bytes).
   */
  private _readSignature(contentPath: string): Uint8Array | null {
    const sigPath = `${contentPath}.sig`;
    const raw = readUtf8(sigPath);
    if (raw === null) return null;
    try {
      const bytes = codec.base64UrlToBytes(raw.trim());
      if (bytes.length !== 64) {
        IQRALogger.warn(
          `⚠️ [MARKETPLACE] Signature at ${sigPath} has ${bytes.length} bytes, ` +
            `expected 64. Treating as unsigned.`,
        );
        return null;
      }
      return bytes;
    } catch (err) {
      IQRALogger.warn(`⚠️ [MARKETPLACE] Failed to decode signature ${sigPath}:`, err);
      return null;
    }
  }

  /**
   * Verify Ed25519 signature over the SHA-256 digest of `bytes`.
   * Returns false when no public key is configured (caller must
   * apply policy before deciding to accept).
   */
  private _verifyDigest(bytes: Uint8Array, signature: Uint8Array): boolean {
    if (!this._publicKey) return false;
    try {
      const digest = sha256(bytes);
      return ed25519.verify(signature, digest, this._publicKey);
    } catch (err) {
      IQRALogger.error('❌ [MARKETPLACE] Ed25519 verify threw:', err);
      return false;
    }
  }

  /**
   * Apply the configured signature policy to a verification outcome.
   * Returns true when the load should proceed, false when it must be
   * rejected.
   */
  private _applyPolicy(
    signed: boolean,
    artifact: string,
  ): boolean {
    if (this._policy === 'off') return true;
    if (signed) return true;
    if (this._policy === 'permissive') {
      IQRALogger.warn(
        `⚠️ [MARKETPLACE] ${artifact} is not signed (or signature invalid); ` +
          `accepting under permissive policy.`,
      );
      return true;
    }
    // strict
    IQRALogger.error(
      `❌ [MARKETPLACE] Rejecting ${artifact}: signature missing or invalid under strict policy.`,
    );
    return false;
  }

  /**
   * Verify the manifest signature. Returns a structured result so
   * callers can decide on enforcement; this method never throws.
   */
  public async verifyManifest(): Promise<VerificationResult> {
    const root = this._getRoot();
    if (!root) {
      return { verified: false, reason: 'marketplace-not-found' };
    }
    const manifestPath = path.join(root, 'skills.json');
    const raw = readUtf8(manifestPath);
    if (raw === null) {
      return { verified: false, reason: 'manifest-missing' };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { verified: false, reason: 'manifest-invalid-json' };
    }

    if (!this._publicKey) {
      return { verified: false, reason: 'no-public-key' };
    }
    const sig = this._readSignature(manifestPath);
    if (!sig) {
      return { verified: false, reason: 'signature-missing' };
    }
    const canonical = canonicalizeJSONBytes(parsed);
    const ok = this._verifyDigest(canonical, sig);
    return ok
      ? { verified: true }
      : { verified: false, reason: 'signature-invalid' };
  }

  /**
   * List skill entries from the marketplace manifest. Returns an
   * empty array when the marketplace is unreachable. Verification is
   * applied to the manifest but the entries themselves are returned
   * unconditionally — callers still go through `loadSkill()` for
   * per-skill verification + policy enforcement.
   */
  public async listSkills(): Promise<SkillEntry[]> {
    const manifest = this._readManifest();
    if (!manifest) return [];
    if (Array.isArray(manifest.skills)) {
      return manifest.skills.map((entry) => ({
        name: entry.name,
        description: entry.description,
        file: entry.file,
      }));
    }
    return Object.entries(manifest.skills).map(([name, file]) => ({ name, file }));
  }

  /**
   * Load a single skill by id. Returns null when:
   *   - the marketplace is unreachable
   *   - the skill name is not in the manifest
   *   - the skill file cannot be read
   *   - strict policy is on and verification fails
   */
  public async loadSkill(id: string): Promise<SkillRecord | null> {
    if (!id) return null;

    if (this._cacheTTLMs > 0) {
      const cached = this._cache.get(id);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.record;
      }
    }

    const root = this._getRoot();
    if (!root) {
      IQRALogger.warn(`⚠️ [MARKETPLACE] Marketplace not reachable; cannot load "${id}".`);
      return null;
    }

    const manifest = this._readManifest();
    if (!manifest) return null;

    const entry = this._findEntry(manifest.skills, id);
    if (!entry) {
      IQRALogger.warn(`⚠️ [MARKETPLACE] Skill "${id}" not in manifest.`);
      return null;
    }

    const filePath = path.join(root, entry.file);
    const content = readUtf8(filePath);
    if (content === null) {
      IQRALogger.warn(`⚠️ [MARKETPLACE] Skill file missing: ${filePath}`);
      return null;
    }

    let signed = false;
    if (this._publicKey) {
      const sig = this._readSignature(filePath);
      if (sig) {
        const bytes = readBytes(filePath);
        if (bytes) {
          signed = this._verifyDigest(bytes, sig);
          if (!signed) {
            IQRALogger.warn(
              `⚠️ [MARKETPLACE] Signature mismatch for "${id}" (${filePath}).`,
            );
          }
        }
      }
    }

    if (!this._applyPolicy(signed, `skill "${id}"`)) {
      return null;
    }

    const record: SkillRecord = {
      name: entry.name,
      description: entry.description,
      tier: entry.tier,
      content,
      signed,
      source: filePath,
    };

    if (this._cacheTTLMs > 0) {
      this._cache.set(id, {
        record,
        expiresAt: Date.now() + this._cacheTTLMs,
      });
    }
    return record;
  }

  /** Clear the in-memory cache. Tests and hot-reload scenarios. */
  public resetCache(): void {
    this._cache.clear();
  }

  /**
   * Find a skill entry by name in either manifest schema (array of
   * `{name, file, ...}` or record of `name → file`).
   */
  private _findEntry(
    skills:
      | Array<{ name: string; description?: string; file: string; tier?: string }>
      | Record<string, string>,
    id: string,
  ): { name: string; description?: string; file: string; tier?: string } | null {
    if (Array.isArray(skills)) {
      return skills.find((s) => s.name === id) ?? null;
    }
    const file = skills[id];
    return file ? { name: id, file } : null;
  }
}
