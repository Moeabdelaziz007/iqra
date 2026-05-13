/**
 * Unit Tests: src/lib/iqra/14-aix/ed25519_signer.ts — hmac hash wiring
 *
 * This PR added wiring for ed25519.hashes.sha512, sha512Async,
 * hmacSha512, and hmacSha512Async on top of the existing sha512Sync /
 * sha512Async etc. hooks. These ensure the library can operate in
 * pure-sync mode on all runtimes.
 *
 * Tests are "no mocks" (IQRA_SUPREME principle): we exercise the real
 * Ed25519 cryptography so any regression in the hash wiring is caught
 * by a failing signature, not a mock assertion.
 *
 * Covers:
 *  - generateKeyPair() produces 32-byte keys
 *  - signPayload() + verifySignedPayload() — the primary sign/verify loop
 *    (exercises sha512Sync wiring added/updated in this PR)
 *  - Payload tampering is detected (hash mismatch path)
 *  - signBytes() + verifyBytes() — low-level byte-level signing
 *  - publicKeyFromPrivate() is deterministic
 *  - codec round-trips: base64url and hex
 *  - generateKeyPairB64() produces base64url strings
 */

import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  generateKeyPairB64,
  signPayload,
  verifySignedPayload,
  signBytes,
  verifyBytes,
  publicKeyFromPrivate,
  codec,
} from '#aix/ed25519_signer';

// ── generateKeyPair ───────────────────────────────────────────────────────────

describe('generateKeyPair()', () => {
  it('returns a 32-byte private key', () => {
    const { privateKey } = generateKeyPair();
    expect(privateKey).toBeInstanceOf(Uint8Array);
    expect(privateKey.byteLength).toBe(32);
  });

  it('returns a 32-byte public key', () => {
    const { publicKey } = generateKeyPair();
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(publicKey.byteLength).toBe(32);
  });

  it('generates unique keypairs each call', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    expect(codec.bytesToHex(a.privateKey)).not.toBe(codec.bytesToHex(b.privateKey));
  });
});

// ── generateKeyPairB64 ────────────────────────────────────────────────────────

describe('generateKeyPairB64()', () => {
  it('returns base64url-encoded strings (no +, /, = padding)', () => {
    const { privateKey, publicKey } = generateKeyPairB64();
    expect(typeof privateKey).toBe('string');
    expect(typeof publicKey).toBe('string');
    // base64url must not contain +, /, or = padding
    expect(privateKey).not.toMatch(/[+/=]/);
    expect(publicKey).not.toMatch(/[+/=]/);
  });

  it('encodes a 32-byte key as ~43-char base64url string', () => {
    const { publicKey } = generateKeyPairB64();
    // ceil(32 * 4/3) = 43 chars (no padding)
    expect(publicKey.length).toBe(43);
  });
});

// ── publicKeyFromPrivate ──────────────────────────────────────────────────────

describe('publicKeyFromPrivate()', () => {
  it('derives the same public key that generateKeyPair produced', () => {
    const kp = generateKeyPair();
    const derived = publicKeyFromPrivate(kp.privateKey);
    expect(codec.bytesToHex(derived)).toBe(codec.bytesToHex(kp.publicKey));
  });

  it('derivation is deterministic (same private key → same public key)', () => {
    const kp = generateKeyPair();
    const a = publicKeyFromPrivate(kp.privateKey);
    const b = publicKeyFromPrivate(kp.privateKey);
    expect(codec.bytesToHex(a)).toBe(codec.bytesToHex(b));
  });
});

// ── signPayload + verifySignedPayload (exercises the new hashes wiring) ───────

describe('signPayload() + verifySignedPayload()', () => {
  it('signs and verifies a simple object payload', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ hello: 'world', n: 42 }, kp.privateKey);

    expect(signed.signature.algorithm).toBe('Ed25519');
    expect(signed.signature.canonicalization).toBe('JCS');
    expect(signed.publicKey.algorithm).toBe('Ed25519');
    expect(signed.publicKey.encoding).toBe('base64url');
    expect(verifySignedPayload(signed)).toBe(true);
  });

  it('embedded public key matches the keypair public key', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ data: 'test' }, kp.privateKey);
    expect(signed.publicKey.value).toBe(codec.bytesToBase64Url(kp.publicKey));
  });

  it('payload_hash is a 64-char hex SHA-256 digest', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ x: 1 }, kp.privateKey);
    expect(signed.payload_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('two different payloads produce different signatures', () => {
    const kp = generateKeyPair();
    const s1 = signPayload({ a: 1 }, kp.privateKey);
    const s2 = signPayload({ a: 2 }, kp.privateKey);
    expect(s1.signature.value).not.toBe(s2.signature.value);
    expect(s1.payload_hash).not.toBe(s2.payload_hash);
  });

  it('rejects a tampered payload (hash mismatch)', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ x: 1 }, kp.privateKey);
    const tampered = { ...signed, payload: { x: 999 } };
    expect(verifySignedPayload(tampered as any)).toBe(false);
  });

  it('rejects a tampered signature value', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ x: 1 }, kp.privateKey);
    const tampered = {
      ...signed,
      signature: { ...signed.signature, value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    };
    expect(verifySignedPayload(tampered as any)).toBe(false);
  });

  it('rejects a tampered payload_hash', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ x: 1 }, kp.privateKey);
    const tampered = {
      ...signed,
      payload_hash: '0'.repeat(64),
    };
    expect(verifySignedPayload(tampered as any)).toBe(false);
  });

  it('sign with key A, verify with key B returns false', () => {
    const kpA = generateKeyPair();
    const kpB = generateKeyPair();
    const signed = signPayload({ x: 1 }, kpA.privateKey);
    const withWrongKey = {
      ...signed,
      publicKey: {
        ...signed.publicKey,
        value: codec.bytesToBase64Url(kpB.publicKey),
      },
    };
    expect(verifySignedPayload(withWrongKey as any)).toBe(false);
  });

  it('handles an empty object payload', () => {
    const kp = generateKeyPair();
    const signed = signPayload({}, kp.privateKey);
    expect(verifySignedPayload(signed)).toBe(true);
  });

  it('handles nested objects and arrays', () => {
    const kp = generateKeyPair();
    const payload = {
      version: '1.0',
      items: [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }],
      meta: { created: '2026-01-01' },
    };
    const signed = signPayload(payload, kp.privateKey);
    expect(verifySignedPayload(signed)).toBe(true);
  });
});

// ── signBytes + verifyBytes ───────────────────────────────────────────────────

describe('signBytes() + verifyBytes()', () => {
  it('signs and verifies raw bytes', () => {
    const kp = generateKeyPair();
    const data = new TextEncoder().encode('sovereign AI data');
    const sig = signBytes(data, kp.privateKey);
    expect(verifyBytes(data, sig, kp.publicKey)).toBe(true);
  });

  it('rejects tampered bytes', () => {
    const kp = generateKeyPair();
    const original = new TextEncoder().encode('original');
    const tampered = new TextEncoder().encode('tampered');
    const sig = signBytes(original, kp.privateKey);
    expect(verifyBytes(tampered, sig, kp.publicKey)).toBe(false);
  });

  it('rejects a zeroed signature', () => {
    const kp = generateKeyPair();
    const data = new TextEncoder().encode('data');
    const badSig = new Uint8Array(64); // all zeros
    expect(verifyBytes(data, badSig, kp.publicKey)).toBe(false);
  });

  it('returns 64-byte signature', () => {
    const kp = generateKeyPair();
    const data = new Uint8Array([1, 2, 3]);
    const sig = signBytes(data, kp.privateKey);
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.byteLength).toBe(64);
  });
});

// ── codec helpers ─────────────────────────────────────────────────────────────

describe('codec — base64url round-trip', () => {
  it('bytesToBase64Url → base64UrlToBytes is lossless', () => {
    const original = crypto.getRandomValues(new Uint8Array(32));
    const encoded = codec.bytesToBase64Url(original);
    const decoded = codec.base64UrlToBytes(encoded);
    expect(codec.bytesToHex(decoded)).toBe(codec.bytesToHex(original));
  });

  it('base64url output contains no +, /, or = characters', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);
    const encoded = codec.bytesToBase64Url(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('base64url decodes standard test vectors correctly', () => {
    // "Man" → base64 "TWFu" → base64url "TWFu"
    const bytes = new TextEncoder().encode('Man');
    expect(codec.bytesToBase64Url(bytes)).toBe('TWFu');
  });
});

describe('codec — hex round-trip', () => {
  it('bytesToHex → hexToBytes is lossless', () => {
    const original = new Uint8Array([0x0a, 0xbc, 0xde, 0xf0, 0x12]);
    const hex = codec.bytesToHex(original);
    const decoded = codec.hexToBytes(hex);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('bytesToHex produces lowercase hex', () => {
    const bytes = new Uint8Array([0xab, 0xcd, 0xef]);
    expect(codec.bytesToHex(bytes)).toBe('abcdef');
  });

  it('bytesToHex pads single nibble bytes correctly', () => {
    const bytes = new Uint8Array([0x01, 0x0f]);
    expect(codec.bytesToHex(bytes)).toBe('010f');
  });

  it('hexToBytes throws on odd-length hex string', () => {
    expect(() => codec.hexToBytes('abc')).toThrow();
  });

  it('hexToBytes handles empty string', () => {
    const result = codec.hexToBytes('');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBe(0);
  });
});