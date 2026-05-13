/**
 * 🧬 IQRA × AIX — public surface
 *
 * The 14-aix layer is IQRA's bridge to the AIX Format v0.369.0
 * sovereign protocol. Every external consumer should import from
 * this index, never from internal modules directly, so we can
 * refactor freely behind the seam.
 *
 * Layer responsibility map:
 *
 *   types               — TS surface mirroring aix-format JSON Schema
 *   canonical           — RFC 8785 (JCS) canonical JSON
 *   ed25519_signer      — real Ed25519 keys, sign, verify (no mocks)
 *   did_translator      — did:web ↔ did:axiom (axiomid.app rooted)
 *   pi_network_claim    — Pi dev browser domain-claim artifact
 *   trustchain_mapper   — IQRA TrustChain → AIX trustchain section
 *   evolution_section   — IQRA ExperienceBuffer → AIX evolution section
 *   abom_builder        — Agent Bill of Materials assembler
 *   manifest_exporter   — export + sign + verify the manifest as a whole
 *
 * Constitutional alignment (IQRA_SUPREME):
 *   - No Mocks: every signature here is real Ed25519 over real bytes.
 *   - No Hallucinations: optional sections only emit when input data exists.
 *   - Memory Governance is the heart: evolution section is derived
 *     deterministically from the experience buffer.
 */

export * from './types';
export { IQRA_VERSION, AIX_FORMAT_VERSION, AXIOM_PROTOCOL } from './version';
export {
  canonicalizeJSON,
  canonicalizeJSONBytes,
} from './canonical';
export {
  generateKeyPair,
  generateKeyPairB64,
  publicKeyFromPrivate,
  signPayload,
  verifySignedPayload,
  signBytes,
  verifyBytes,
  codec,
  type Ed25519KeyPair,
  type Ed25519KeyPairB64,
  type SignedPayload,
} from './ed25519_signer';
export {
  AXIOM_AUTHORITY,
  toAxiomDID,
  toWebDID,
  translateDID,
  isAxiomRooted,
  didId,
} from './did_translator';
export {
  createPiClaim,
  verifyPiClaim,
  bootstrapPiClaim,
  type PiClaimManifest,
  type PiClaimArtifact,
  type PiClaimInput,
} from './pi_network_claim';
export {
  mapEntry,
  mapChain,
  type IQRATrustChainEntry,
} from './trustchain_mapper';
export {
  buildEvolutionSection,
  type IQRAExperienceSnapshot,
} from './evolution_section';
export {
  buildAbom,
  type AbomInput,
} from './abom_builder';
export {
  exportManifest,
  signManifest,
  verifyManifest,
  type ManifestExportInput,
} from './manifest_exporter';
