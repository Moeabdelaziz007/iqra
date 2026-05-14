/**
 * @deprecated Moved to @axiom/identity/ed25519. Import from there directly.
 * Kept as thin shim for backward compatibility using @noble/ed25519 directly.
 */
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

(ed.etc as any).sha512Sync = (...m: Uint8Array[]) => sha512(m[0]);
(ed.etc as any).sha512Async = async (...m: Uint8Array[]) => sha512(m[0]);

export function generateKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = ed.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export type Ed25519KeyPair = { publicKey: Uint8Array; privateKey: Uint8Array };
export type Ed25519KeyPairB64 = { publicKey: string; privateKey: string };

export const codec = {
  encodePublic: (pk: Uint8Array) => Buffer.from(pk).toString('hex'),
  encodePrivate: (sk: Uint8Array) => Buffer.from(sk).toString('hex'),
  decodePublic: (hex: string) => Buffer.from(hex, 'hex'),
  decodePrivate: (hex: string) => Buffer.from(hex, 'hex'),
};

export function generateKeyPairB64(): { publicKey: string; privateKey: string } {
  const kp = generateKeyPair();
  return {
    publicKey: Buffer.from(kp.publicKey).toString('base64'),
    privateKey: Buffer.from(kp.privateKey).toString('base64'),
  };
}

export function publicKeyFromPrivate(privateKey: Uint8Array): Uint8Array {
  return ed.getPublicKey(privateKey);
}

export function signPayload(payload: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed.sign(payload, privateKey);
}

export function verifySignedPayload(
  payload: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): boolean {
  return ed.verify(signature, payload, publicKey);
}

export function signBytes(bytes: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed.sign(bytes, privateKey);
}

export function verifyBytes(
  bytes: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): boolean {
  return ed.verify(signature, bytes, publicKey);
}
