/**
 * 🧪 14-aix end-to-end tests
 *
 * Per IQRA_SUPREME (No Mocks): every assertion runs against real
 * Ed25519 keys, real SHA-256 digests, and real canonical JSON. No
 * stubs, no spies. If a test fails, the cryptography itself is at
 * fault and the manifest is unsafe.
 */

import { describe, it, expect } from 'vitest';
import { canonicalizeJSON } from '../canonical';
import {
  generateKeyPair,
  signPayload,
  verifySignedPayload,
  publicKeyFromPrivate,
  codec,
} from '../ed25519_signer';
import {
  toAxiomDID,
  toWebDID,
  translateDID,
  AXIOM_AUTHORITY,
} from '../did_translator';
import { mapChain } from '../trustchain_mapper';
import { buildEvolutionSection } from '../evolution_section';
import { buildAbom } from '../abom_builder';
import { createPiClaim, verifyPiClaim, bootstrapPiClaim } from '../pi_network_claim';
import { exportManifest, signManifest, verifyManifest } from '../manifest_exporter';

describe('canonical JSON (RFC 8785 / JCS)', () => {
  it('sorts object keys lexicographically', () => {
    const a = canonicalizeJSON({ b: 1, a: 2, c: 3 });
    const b = canonicalizeJSON({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it('drops undefined fields', () => {
    expect(canonicalizeJSON({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('rejects circular structures', () => {
    const o: any = { x: 1 };
    o.self = o;
    expect(() => canonicalizeJSON(o)).toThrow();
  });

  it('rejects NaN and Infinity', () => {
    expect(() => canonicalizeJSON({ x: NaN })).toThrow();
    expect(() => canonicalizeJSON({ x: Infinity })).toThrow();
  });

  it('produces identical bytes for logically equal inputs', () => {
    const x = canonicalizeJSON({ list: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] });
    const y = canonicalizeJSON({ list: [{ name: 'a', id: 1 }, { name: 'b', id: 2 }] });
    expect(x).toBe(y);
  });
});

describe('Ed25519 signing', () => {
  it('signs and verifies a real payload', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ hello: 'world', n: 42 }, kp.privateKey);
    expect(signed.signature.algorithm).toBe('Ed25519');
    expect(signed.publicKey.value).toBe(codec.bytesToBase64Url(kp.publicKey));
    expect(verifySignedPayload(signed)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const kp = generateKeyPair();
    const signed = signPayload({ x: 1 }, kp.privateKey);
    const tampered = { ...signed, payload: { x: 2 } };
    expect(verifySignedPayload(tampered as any)).toBe(false);
  });

  it('public key derivation is deterministic', () => {
    const kp = generateKeyPair();
    const derived = publicKeyFromPrivate(kp.privateKey);
    expect(codec.bytesToHex(derived)).toBe(codec.bytesToHex(kp.publicKey));
  });
});

describe('DID translator', () => {
  it('produces did:axiom and did:web in lockstep', () => {
    const t = translateDID('did:web:axiomid.app:iqra');
    expect(t.id).toBe('iqra');
    expect(t.axiom).toBe('did:axiom:axiomid.app:iqra');
    expect(t.web).toBe('did:web:axiomid.app:iqra');
  });

  it('rejects illegal id characters', () => {
    expect(() => toAxiomDID('a/b')).toThrow();
    expect(() => toWebDID('hello world')).toThrow();
  });

  it('survives round-trip', () => {
    const original = 'agent-core-001';
    const ax = toAxiomDID(original);
    const back = translateDID(ax);
    expect(back.id).toBe(original);
    expect(back.web).toBe(`did:web:${AXIOM_AUTHORITY}:${original}`);
  });
});

describe('TrustChain mapper', () => {
  it('chains prev_hash deterministically', () => {
    const chain = mapChain(
      [
        { action: 'TEST:1', input: 'a', output: 'b', score: 1, timestamp: 1000 },
        { action: 'TEST:2', input: 'c', output: 'd', score: 1, timestamp: 2000 },
      ],
      'did:axiom:axiomid.app:test',
    );
    expect(chain.entries).toHaveLength(2);
    expect(chain.entries[0].prev_hash).toBe('0'.repeat(64));
    expect(chain.entries[1].prev_hash).toBe(chain.entries[0].payload_hash);
    expect(chain.entries[0].payload_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('marks SHURA actions as human_approved', () => {
    const chain = mapChain(
      [{ action: 'SHURA:CONSENSUS_OK', timestamp: 1 }],
      'did:axiom:axiomid.app:t',
    );
    expect(chain.entries[0].human_approved).toBe(true);
  });
});

describe('Evolution section builder', () => {
  it('compresses experiences deterministically', () => {
    const snap = {
      loops_completed: 7,
      experiences: [
        { timestamp: 100, lesson: 'first', trust_delta: 0.1, verified: true, version: '0.1.0' },
        { timestamp: 200, lesson: 'second', trust_delta: 0.2, verified: true, version: '0.2.0' },
        { timestamp: 150, lesson: 'unverified', trust_delta: -0.05, verified: false },
      ],
    };
    const a = buildEvolutionSection(snap);
    const b = buildEvolutionSection(snap);
    expect(a).toEqual(b);
    expect(a.loops_completed).toBe(7);
    expect(a.last_improved).toBe(new Date(200).toISOString());
    expect(a.lessons).toEqual(['second', 'first']);
    expect(a.version_lineage).toEqual(['0.1.0', '0.2.0']);
    expect(a.trust_delta).toBeCloseTo(0.25, 5);
  });

  it('clamps trust_delta to schema range', () => {
    const snap = {
      experiences: Array.from({ length: 50 }, (_, i) => ({
        lesson: `l${i}`, trust_delta: 5, verified: true, timestamp: i,
      })),
    };
    const ev = buildEvolutionSection(snap);
    expect(ev.trust_delta).toBe(10);
  });
});

describe('ABOM builder', () => {
  it('dedupes and sorts entries', () => {
    const abom = buildAbom({
      base_models: [
        { name: 'gemini-2.0-flash', version: 'v1' },
        { name: 'gemini-2.0-flash', version: 'v1' },
        { name: 'groq-llama-3', version: '70b' },
      ],
    });
    expect(abom.base_models).toEqual([
      { name: 'gemini-2.0-flash', version: 'v1' },
      { name: 'groq-llama-3', version: '70b' },
    ]);
  });

  it('omits empty sections', () => {
    const abom = buildAbom({ base_models: [], plugins: undefined });
    expect(abom).toEqual({});
  });
});

describe('Pi Network claim', () => {
  it('round-trips through signature verification', () => {
    const { artifact } = bootstrapPiClaim({
      domain: 'axiomid.app',
      owner_id: 'iqra-core',
      app_id: 'iqra.dev',
      environment: 'sandbox',
    });
    const v = verifyPiClaim(artifact);
    expect(v.ok).toBe(true);
    expect(artifact.well_known_url).toBe('https://axiomid.app/.well-known/pi-claim.json');
  });

  it('fails when the DID domain does not match', () => {
    const kp = generateKeyPair();
    const claim = createPiClaim({
      domain: 'axiomid.app',
      owner_id: 'x',
      app_id: 'app',
      environment: 'sandbox',
      privateKey: kp.privateKey,
    });
    const tampered = { ...claim, payload: { ...claim.payload, domain: 'evil.com' } };
    const v = verifyPiClaim(tampered as any);
    expect(v.ok).toBe(false);
  });

  it('rejects a non-did:axiom owner method even when domain appears in path', () => {
    // Hostile DID method that just happens to embed `:axiomid.app:` as a
    // path segment. The old substring check accepted this; the strict
    // regex check rejects it.
    const kp = generateKeyPair();
    const claim = createPiClaim({
      domain: 'axiomid.app',
      owner_id: 'x',
      app_id: 'app',
      environment: 'sandbox',
      privateKey: kp.privateKey,
    });
    const hostile: any = { ...claim, payload: { ...claim.payload, owner_did: 'did:evil:axiomid.app:x' } };
    // We have to recompute payload_hash and re-sign so BAD_SIGNATURE does
    // not preempt the format check. The point is that a signature-valid
    // hostile DID would have passed under the old check.
    const { signPayload: sp } = require('../ed25519_signer');
    const resigned = sp(hostile.payload, kp.privateKey);
    const tampered = { ...hostile, ...resigned, well_known_url: claim.well_known_url };
    const v = verifyPiClaim(tampered as any);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('DID_DOMAIN_MISMATCH');
  });
});

describe('Manifest exporter + signer', () => {
  it('exports a manifest and verifies its signature', () => {
    const kp = generateKeyPair();
    const m = exportManifest({
      owner_id: 'iqra-core',
      publicKey: kp.publicKey,
      meta: {
        version: '0.369.0',
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'IQRA Sovereign Core',
        created: '2026-05-13T00:00:00Z',
        author: 'Mohamed Abdelaziz',
      },
      persona: { role: 'sovereign', instructions: 'Read in the name of your Lord.' },
      verification: { status: 'sovereign', trust_level: 3 },
      trustchain: [{ action: 'INIT', timestamp: 1000 }],
      experience: { loops_completed: 1 },
    });
    expect(m.identity_layer.id).toBe('did:axiom:axiomid.app:iqra-core');
    expect(m.identity_layer.publicKey?.algorithm).toBe('Ed25519');
    expect(m.trustchain?.entries).toHaveLength(1);

    const signed = signManifest(m, kp.privateKey);
    expect(signed.security.signature?.algorithm).toBe('Ed25519');
    expect(signed.security.checksum).toMatch(/^[0-9a-f]{64}$/);

    const v = verifyManifest(signed);
    expect(v.ok).toBe(true);
  });

  it('detects tampering on a signed manifest', () => {
    const kp = generateKeyPair();
    const m = exportManifest({
      owner_id: 'iqra-core',
      publicKey: kp.publicKey,
      meta: {
        version: '0.369.0',
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'IQRA',
        created: '2026-05-13T00:00:00Z',
        author: 'M',
      },
      persona: { role: 'r', instructions: 'i' },
    });
    const signed = signManifest(m, kp.privateKey);
    const tampered = { ...signed, persona: { ...signed.persona, role: 'attacker' } };
    const v = verifyManifest(tampered);
    expect(v.ok).toBe(false);
  });
});
