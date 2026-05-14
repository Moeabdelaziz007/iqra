/**
 * 🧪 MarketplaceLoader end-to-end tests
 *
 * Per IQRA_SUPREME (No Mocks): every assertion runs against real
 * Ed25519 key pairs, real SHA-256 digests over real canonical JSON /
 * raw bytes, and real on-disk fixtures under os.tmpdir(). There are
 * no vi.mock() calls and no fake fs. If a test fails the cryptography,
 * file I/O, or policy logic is genuinely wrong.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

import {
  generateKeyPair,
  codec,
  type Ed25519KeyPair,
} from '#aix/ed25519_signer';
import { canonicalizeJSONBytes } from '#aix/canonical';
import { MarketplaceLoader } from '#aix/marketplace_loader';
import { SkillLoader } from '#skills/loader';

// Wire the SHA-512 hook in case this test file runs standalone before
// ed25519_signer's module-load side-effect. Idempotent.
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

// ── Fixture helpers ──────────────────────────────────────────────────────────

interface SkillSpec {
  name: string;
  description?: string;
  tier?: string;
  content: string;
}

function makeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iqra-marketplace-test-'));
  fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
  return root;
}

function writeManifest(root: string, skills: SkillSpec[]): string {
  const manifest = {
    name: 'aix-agent-skills',
    skills: skills.map((s) => ({
      name: s.name,
      description: s.description ?? '',
      file: `skills/${s.name}.md`,
      tier: s.tier ?? 'BASIC_TOOL',
    })),
  };
  const manifestPath = path.join(root, 'skills.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifestPath;
}

function writeSkill(root: string, spec: SkillSpec): string {
  const filePath = path.join(root, 'skills', `${spec.name}.md`);
  fs.writeFileSync(filePath, spec.content, 'utf-8');
  return filePath;
}

function signFile(filePath: string, kp: Ed25519KeyPair, jcs: boolean): void {
  const raw = fs.readFileSync(filePath);
  const bytes = jcs
    ? canonicalizeJSONBytes(JSON.parse(raw.toString('utf-8')))
    : new Uint8Array(raw);
  const sig = ed25519.sign(sha256(bytes), kp.privateKey);
  fs.writeFileSync(`${filePath}.sig`, codec.bytesToBase64Url(sig), 'utf-8');
}

function loaderFor(
  root: string,
  kp: Ed25519KeyPair | null,
  overrides: { signaturePolicy?: 'off' | 'permissive' | 'strict'; cacheTTLMs?: number } = {},
): MarketplaceLoader {
  return new MarketplaceLoader({
    marketplaceRoot: root,
    publicKey: kp ? codec.bytesToBase64Url(kp.publicKey) : undefined,
    signaturePolicy: overrides.signaturePolicy ?? 'permissive',
    cacheTTLMs: overrides.cacheTTLMs ?? 0,
  });
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

let root: string;
const ENV_KEYS = [
  'IQRA_MARKETPLACE_PATH',
  'IQRA_MARKETPLACE_PUBKEY',
  'IQRA_MARKETPLACE_POLICY',
  'IQRA_MARKETPLACE_CACHE_TTL_MS',
] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  root = makeRoot();
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  SkillLoader.resetCache();
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k]!;
  }
  SkillLoader.resetCache();
});

// ── Discovery + listing ──────────────────────────────────────────────────────

describe('MarketplaceLoader: discovery', () => {
  it('lists skills from the manifest, isolated from any ambient marketplace', async () => {
    writeManifest(root, [
      { name: 'agent-memory', description: 'memory', content: '# A\n' },
      { name: 'voice-wizard', content: '# V\n' },
    ]);
    writeSkill(root, { name: 'agent-memory', content: '# A\n' });
    writeSkill(root, { name: 'voice-wizard', content: '# V\n' });

    const entries = await loaderFor(root, null).listSkills();
    expect(entries.map((e) => e.name).sort()).toEqual(['agent-memory', 'voice-wizard']);
    expect(entries.find((e) => e.name === 'agent-memory')?.file).toBe(
      'skills/agent-memory.md',
    );
  });

  it('returns an empty list when the marketplace root has no manifest', async () => {
    // Empty root: no skills.json.
    const entries = await loaderFor(root, null).listSkills();
    expect(entries).toEqual([]);
  });
});

// ── Signature verification ──────────────────────────────────────────────────

describe('MarketplaceLoader: signature verification', () => {
  it('verifies a properly signed skill and reports signed=true', async () => {
    const skill: SkillSpec = {
      name: 'agent-memory',
      description: 'memory',
      tier: 'BASIC_TOOL',
      content: '# Skill: Agent Memory\n\nTrusted body.\n',
    };
    writeManifest(root, [skill]);
    const filePath = writeSkill(root, skill);

    const kp = generateKeyPair();
    signFile(filePath, kp, /* jcs */ false);

    const record = await loaderFor(root, kp).loadSkill('agent-memory');
    expect(record).not.toBeNull();
    expect(record!.name).toBe('agent-memory');
    expect(record!.description).toBe('memory');
    expect(record!.tier).toBe('BASIC_TOOL');
    expect(record!.content).toContain('Trusted body.');
    expect(record!.signed).toBe(true);
  });

  it('reports signed=false (and proceeds) for unsigned skills under permissive policy', async () => {
    const skill: SkillSpec = { name: 'agent-memory', content: '# A\n\nUnsigned body.\n' };
    writeManifest(root, [skill]);
    writeSkill(root, skill);

    const record = await loaderFor(root, generateKeyPair()).loadSkill('agent-memory');
    expect(record).not.toBeNull();
    expect(record!.signed).toBe(false);
    expect(record!.content).toContain('Unsigned body.');
  });

  it('returns null for unknown skills regardless of policy', async () => {
    writeManifest(root, [{ name: 'agent-memory', content: '# A\n' }]);
    expect(await loaderFor(root, null).loadSkill('does-not-exist')).toBeNull();
  });
});

// ── Policy enforcement ──────────────────────────────────────────────────────

describe('MarketplaceLoader: signature policy', () => {
  it('strict mode rejects unsigned skills', async () => {
    const skill: SkillSpec = { name: 'agent-memory', content: '# A\n' };
    writeManifest(root, [skill]);
    writeSkill(root, skill);

    const record = await loaderFor(root, generateKeyPair(), {
      signaturePolicy: 'strict',
    }).loadSkill('agent-memory');
    expect(record).toBeNull();
  });

  it('strict mode rejects signatures produced by a different key', async () => {
    const skill: SkillSpec = { name: 'agent-memory', content: '# A\n' };
    writeManifest(root, [skill]);
    const filePath = writeSkill(root, skill);

    signFile(filePath, generateKeyPair(), false); // signer ≠ verifier
    const verifier = generateKeyPair();
    const record = await loaderFor(root, verifier, {
      signaturePolicy: 'strict',
    }).loadSkill('agent-memory');
    expect(record).toBeNull();
  });

  it('strict mode rejects content tampered after signing', async () => {
    const skill: SkillSpec = { name: 'agent-memory', content: '# A\n\nOriginal.\n' };
    writeManifest(root, [skill]);
    const filePath = writeSkill(root, skill);

    const kp = generateKeyPair();
    signFile(filePath, kp, false);
    fs.writeFileSync(filePath, '# A\n\nTampered.\n', 'utf-8');

    expect(
      await loaderFor(root, kp, { signaturePolicy: 'strict' }).loadSkill('agent-memory'),
    ).toBeNull();
  });

  it('off policy accepts a corrupt signature without attempting verification', async () => {
    const skill: SkillSpec = { name: 'agent-memory', content: '# A\n' };
    writeManifest(root, [skill]);
    const filePath = writeSkill(root, skill);
    // Corrupt signature: 64 zero bytes would never match.
    fs.writeFileSync(`${filePath}.sig`, codec.bytesToBase64Url(new Uint8Array(64)), 'utf-8');

    const record = await loaderFor(root, generateKeyPair(), {
      signaturePolicy: 'off',
    }).loadSkill('agent-memory');
    expect(record).not.toBeNull();
    expect(record!.signed).toBe(false);
  });
});

// ── verifyManifest() ────────────────────────────────────────────────────────

describe('MarketplaceLoader: verifyManifest', () => {
  it('returns verified=true for a manifest signed over its JCS-canonical bytes', async () => {
    writeManifest(root, [{ name: 'agent-memory', content: '# A\n' }]);
    const kp = generateKeyPair();
    signFile(path.join(root, 'skills.json'), kp, /* jcs */ true);

    expect(await loaderFor(root, kp).verifyManifest()).toEqual({ verified: true });
  });

  it('reports structured reasons for every common failure mode', async () => {
    const kp = generateKeyPair();

    // marketplace-not-found
    expect(await loaderFor(root, kp).verifyManifest()).toEqual({
      verified: false,
      reason: 'marketplace-not-found',
    });

    writeManifest(root, [{ name: 'agent-memory', content: '# A\n' }]);

    // no-public-key
    expect(await loaderFor(root, null).verifyManifest()).toEqual({
      verified: false,
      reason: 'no-public-key',
    });

    // signature-missing
    expect(await loaderFor(root, kp).verifyManifest()).toEqual({
      verified: false,
      reason: 'signature-missing',
    });

    // signature-invalid: tamper after signing.
    const manifestPath = path.join(root, 'skills.json');
    signFile(manifestPath, kp, true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.skills.push({
      name: 'malicious',
      description: 'injected',
      file: 'skills/malicious.md',
      tier: 'BASIC_TOOL',
    });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    expect(await loaderFor(root, kp).verifyManifest()).toEqual({
      verified: false,
      reason: 'signature-invalid',
    });
  });
});

// ── Cache behavior ──────────────────────────────────────────────────────────

describe('MarketplaceLoader: cache', () => {
  it('serves cached content while TTL is in the future and re-reads after resetCache', async () => {
    const skill: SkillSpec = { name: 'agent-memory', content: '# A\n\nFirst.\n' };
    writeManifest(root, [skill]);
    const filePath = writeSkill(root, skill);

    const loader = loaderFor(root, null, { cacheTTLMs: 60_000 });
    const first = await loader.loadSkill('agent-memory');
    expect(first!.content).toContain('First.');

    // Mutate on disk; cache must shield us from the change.
    fs.writeFileSync(filePath, '# A\n\nSecond.\n', 'utf-8');
    expect((await loader.loadSkill('agent-memory'))!.content).toContain('First.');

    // resetCache forces a fresh read.
    loader.resetCache();
    expect((await loader.loadSkill('agent-memory'))!.content).toContain('Second.');
  });

  it('re-reads from disk on every call when cacheTTLMs is 0', async () => {
    const skill: SkillSpec = { name: 'agent-memory', content: '# A\n\nFirst.\n' };
    writeManifest(root, [skill]);
    const filePath = writeSkill(root, skill);

    const loader = loaderFor(root, null, { cacheTTLMs: 0 });
    expect((await loader.loadSkill('agent-memory'))!.content).toContain('First.');
    fs.writeFileSync(filePath, '# A\n\nSecond.\n', 'utf-8');
    expect((await loader.loadSkill('agent-memory'))!.content).toContain('Second.');
  });
});

// ── Environment variable resolution ─────────────────────────────────────────

describe('MarketplaceLoader: environment configuration', () => {
  it('reads pubkey + policy from process.env', () => {
    const kp = generateKeyPair();
    process.env.IQRA_MARKETPLACE_PUBKEY = codec.bytesToBase64Url(kp.publicKey);
    process.env.IQRA_MARKETPLACE_POLICY = 'strict';
    const loader = MarketplaceLoader.fromEnv();
    expect(loader.policy).toBe('strict');
    expect(loader.hasPublicKey).toBe(true);
  });

  it('falls back to permissive on invalid policy and ignores malformed pubkeys', () => {
    process.env.IQRA_MARKETPLACE_POLICY = 'paranoid';
    process.env.IQRA_MARKETPLACE_PUBKEY = 'not-a-real-key';
    const loader = MarketplaceLoader.fromEnv();
    expect(loader.policy).toBe('permissive');
    expect(loader.hasPublicKey).toBe(false);
  });
});
