/**
 * 📤 AIX Manifest Exporter — IQRA agent → AIX v0.369.0 JSON manifest
 *
 * This is the single seam where IQRA's internal primitives get
 * translated into the AIX format. Every other module in `14-aix/`
 * funnels through here when the goal is to emit a manifest.
 *
 * Design rules:
 *   - No side effects: pure function over inputs → manifest object.
 *   - Output is canonicalize-stable: the same inputs produce a
 *     byte-identical manifest after RFC 8785 canonicalization. This
 *     is what makes signatures portable.
 *   - Optional sections stay optional: if the caller has no ABOM data,
 *     no abom block is emitted. We do not fabricate empty arrays.
 *   - The exporter does NOT sign. Use `signManifest` afterwards if you
 *     want the security.signature block populated.
 *
 * Per IQRA_SUPREME: No Mocks, No Hallucinations. Every field in the
 * manifest must come from real input data passed by the caller.
 */

import * as ed25519 from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { canonicalizeJSONBytes } from './canonical';
import { codec, signPayload } from './ed25519_signer';
import { toAxiomDID, AXIOM_AUTHORITY } from './did_translator';
import { mapChain, type IQRATrustChainEntry } from './trustchain_mapper';
import { buildEvolutionSection, type IQRAExperienceSnapshot } from './evolution_section';
import { buildAbom, type AbomInput } from './abom_builder';
import type {
  AIXManifest,
  AIXMeta,
  AIXPersona,
  AIXSecurity,
  AIXIdentityLayer,
  AIXIdentityVerification,
  AIXPiNetwork,
  AIXMetaArbiterConfig,
} from './types';

export interface ManifestExportInput {
  /** Bare id segment (e.g. `iqra-sovereign`). Translated to did:axiom by the exporter. */
  owner_id: string;

  meta: Omit<AIXMeta, 'updated'> & { updated?: string };
  persona: AIXPersona;

  /** Ed25519 public key bytes for the identity_layer.publicKey block. */
  publicKey: Uint8Array;

  /** Optional verification block. Defaults to `unverified / trust_level=0`. */
  verification?: AIXIdentityVerification;

  /** Issued/expires for the identity. Defaults: issuedAt = now, expiresAt = undefined. */
  issuedAt?: Date;
  expiresAt?: Date;

  /** Security section. The exporter sets `level` default to 3 (sovereign tier). */
  security?: Partial<AIXSecurity>;

  /** Optional sections — passed through to the AIX section directly. */
  pi_network?: AIXPiNetwork;
  meta_arbiter?: AIXMetaArbiterConfig;

  /** IQRA-side primitives the exporter will translate. */
  trustchain?: IQRATrustChainEntry[];
  experience?: IQRAExperienceSnapshot;
  abom?: AbomInput;
}

/**
 * Produce a fully-typed AIX manifest object. The result is ready to
 * be JSON.stringify'd OR fed into `signManifest()` for a signature.
 */
export function exportManifest(input: ManifestExportInput): AIXManifest {
  const ownerDID = toAxiomDID(input.owner_id);

  const issuedAt = (input.issuedAt ?? new Date()).toISOString();

  const identity_layer: AIXIdentityLayer = {
    id: ownerDID,
    provider: {
      type: 'axiom_id',
      name: 'AxiomID',
      authority: AXIOM_AUTHORITY,
    },
    verification: input.verification ?? { status: 'unverified', trust_level: 0 },
    issuedAt,
    publicKey: {
      algorithm: 'Ed25519',
      value: codec.bytesToBase64Url(input.publicKey),
      encoding: 'base64url',
    },
  };
  if (input.expiresAt) identity_layer.expiresAt = input.expiresAt.toISOString();

  const security: AIXSecurity = {
    level: input.security?.level ?? 3,
    ...input.security,
  };

  const manifest: AIXManifest = {
    meta: {
      ...input.meta,
      updated: input.meta.updated ?? issuedAt,
    },
    persona: input.persona,
    security,
    identity_layer,
  };

  if (input.trustchain && input.trustchain.length > 0) {
    manifest.trustchain = mapChain(input.trustchain, ownerDID);
  }
  if (input.experience) {
    const ev = buildEvolutionSection(input.experience);
    if (Object.keys(ev).length > 0) manifest.evolution = ev;
  }
  if (input.abom) {
    const abom = buildAbom(input.abom);
    if (Object.keys(abom).length > 0) manifest.abom = abom;
  }
  if (input.pi_network) manifest.pi_network = input.pi_network;
  if (input.meta_arbiter) manifest.meta_arbiter = input.meta_arbiter;

  return manifest;
}

/**
 * Sign the manifest using Ed25519 over its canonical JSON. The
 * signature lands in `security.signature` and the `security.checksum`
 * is set to the SHA-256 hex of the canonical payload that was signed.
 *
 * Two-pass design: we first canonicalize the manifest WITHOUT the
 * signature/checksum fields, then attach them. Verification reverses
 * this (drop signature+checksum → canonicalize → compare).
 */
export function signManifest(manifest: AIXManifest, privateKey: Uint8Array): AIXManifest {
  // Strip mutable fields before canonicalization.
  const { signature: _sig, checksum: _cs, ...securityWithoutSig } = manifest.security;
  const payloadForSig: AIXManifest = {
    ...manifest,
    security: securityWithoutSig as AIXSecurity,
  };
  const signed = signPayload(payloadForSig, privateKey);
  const next: AIXManifest = {
    ...manifest,
    security: {
      ...manifest.security,
      checksum: signed.payload_hash,
      signature: {
        algorithm: 'Ed25519',
        value: signed.signature.value,
        canonicalization: 'JCS',
      },
    },
  };
  return next;
}

/**
 * Verify a manifest's signature. Returns:
 *   - ok: true when checksum matches the recomputed canonical hash AND
 *         the embedded signature verifies against the embedded publicKey.
 *   - reason: short tag on failure.
 */
export function verifyManifest(manifest: AIXManifest): { ok: true } | { ok: false; reason: string } {
  const sig = manifest.security.signature;
  const checksum = manifest.security.checksum;
  const pub = manifest.identity_layer.publicKey;
  if (!sig || !checksum || !pub) {
    return { ok: false, reason: 'MISSING_SIGNATURE_FIELDS' };
  }
  // Strip signature/checksum, recanonicalize, recompute digest.
  const { signature: _s, checksum: _c, ...securityWithoutSig } = manifest.security;
  const payload: AIXManifest = { ...manifest, security: securityWithoutSig as AIXSecurity };
  const bytes = canonicalizeJSONBytes(payload);
  const recomputed = codec.bytesToHex(sha256(bytes));
  if (recomputed !== checksum) {
    return { ok: false, reason: 'CHECKSUM_MISMATCH' };
  }
  // Ed25519 verify. We import `@noble/ed25519` statically at the top of
  // the file (not via `require`) so this module stays ESM-pure and
  // bundles cleanly under Edge/Workers runtimes.
  try {
    const pubBytes = codec.base64UrlToBytes(pub.value);
    const sigBytes = codec.base64UrlToBytes(sig.value);
    const digest = sha256(bytes);
    if (!ed25519.verify(sigBytes, digest, pubBytes)) {
      return { ok: false, reason: 'BAD_SIGNATURE' };
    }
  } catch {
    return { ok: false, reason: 'VERIFY_THROWN' };
  }
  return { ok: true };
}
