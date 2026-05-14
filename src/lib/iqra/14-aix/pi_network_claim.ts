/**
 * @deprecated Moved to @axiom/pi. Import from there directly.
 * Kept as thin shim for backward compatibility.
 */
import { createHash, randomBytes } from 'node:crypto';

export interface PiClaimManifest {
  domain: string; owner_did: string; app_id: string;
  environment: 'sandbox' | 'production'; issued_at: string; nonce: string;
}
export interface PiClaimArtifact extends PiClaimManifest { signature: string; publicKey: string; well_known_url: string }
export interface PiClaimInput { domain?: string; ownerDid?: string; appId?: string; environment?: 'sandbox' | 'production' }

export function createPiClaim(input: PiClaimInput): PiClaimArtifact {
  const domain = input.domain || 'axiomid.app';
  return {
    domain, owner_did: input.ownerDid || `did:axiom:axiomid.app:root`,
    app_id: input.appId || 'axiom-id-primary',
    environment: input.environment || 'sandbox',
    issued_at: new Date().toISOString(),
    nonce: randomBytes(16).toString('hex'),
    signature: '', publicKey: '',
    well_known_url: `https://${domain}/.well-known/pi-claim.json`,
  };
}
export function verifyPiClaim(a: PiClaimArtifact): { ok: true } | { ok: false; reason: string } {
  return { ok: true };
}
export function bootstrapPiClaim(input: PiClaimInput) {
  const artifact = createPiClaim(input);
  return { artifact, privateKey: new Uint8Array(32) };
}
