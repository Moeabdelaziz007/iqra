/**
 * IQRA Sovereign DID (Decentralized Identifier) — الهوية اللامركزية
 *
 * "وَلِكُلٍّ وِجْهَةٌ هُوَ مُوَلِّيهَا ۖ فَاسْتَبِقُوا الْخَيْرَاتِ" — البقرة: 148
 *
 * Implements W3C DID v1 + the AIX-format `did:axiom:` extension. The
 * verification material is REAL Ed25519 public-key bytes encoded as a
 * multibase string per the Ed25519VerificationKey2020 suite — not a
 * SHA-256 fingerprint pretending to be a key. The previous fingerprint
 * approach is deleted: it never round-tripped through any verifier and
 * created a quiet "No Mocks" violation under IQRA_SUPREME.
 *
 * Key material lifecycle:
 *   - generateDocument(id, domain) returns a DID Document built from a
 *     fresh ephemeral keypair AND the keypair itself, so callers can
 *     persist the private key in a secret store of their choice (env
 *     var, KMS, Cloudflare Secrets) before publishing the doc.
 *   - For deterministic, persistent identities, callers should pass an
 *     existing Uint8Array privateKey via `fromPrivateKey()`.
 *   - `rotateKeys()` produces a fresh keypair and returns both halves.
 */

import {
  generateKeyPair,
  publicKeyFromPrivate,
  codec,
} from '#aix/ed25519_signer';
import { toAxiomDID, toWebDID, AXIOM_AUTHORITY } from '#aix/did_translator';
import type { AxiomDID } from '#aix/types';

export interface DIDDocument {
  "@context": string[];
  id: string;
  alsoKnownAs?: string[];
  authentication: string[];
  verificationMethod: {
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    publicKeyJwk?: Record<string, string>;
    blockchainAccountId?: string;
    serviceEndpoint?: string;
  }[];
  service?: {
    id: string;
    type: string;
    serviceEndpoint: string;
  }[];
}

export interface DIDDocumentBundle {
  document: DIDDocument;
  /** AIX-format sovereign DID for the same identity. */
  axiomDID: AxiomDID;
  /** Raw key material — caller persists privateKey securely. */
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

const DID_CONTEXT = [
  'https://www.w3.org/ns/did/v1',
  'https://w3id.org/security/suites/jws-2020/v1',
];

const BASE58BTC_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Base58btc encode. ~30 lines, no native bindings, edge-safe.
 * Used to render the publicKeyMultibase value for the
 * Ed25519VerificationKey2020 suite (multibase prefix 'z' === base58btc).
 */
function base58btcEncode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  // Count leading zero bytes for separate handling.
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  // Allocate result digits in base 58.
  // size = ceil(bytes.length * log(256) / log(58)) ~ bytes.length * 1.4.
  const size = Math.ceil((bytes.length - zeros) * 1.365) + 1;
  const b58 = new Uint8Array(size);
  let length = 0;

  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 256 * b58[k];
      b58[k] = carry % 58;
      carry = (carry / 58) | 0;
    }
    length = j;
  }

  // Skip leading zeroes in the b58 buffer.
  let it = size - length;
  while (it < size && b58[it] === 0) it++;

  let out = '';
  for (let i = 0; i < zeros; i++) out += BASE58BTC_ALPHABET[0]; // '1'
  for (; it < size; it++) out += BASE58BTC_ALPHABET[b58[it]];
  return out;
}

/**
 * Multibase prefix 'z' is reserved for base58btc per the multibase
 * specification. The Ed25519VerificationKey2020 suite requires a
 * multicodec prefix `0xed 0x01` (Ed25519-pub) followed by the 32-byte
 * raw public key, all base58btc-encoded with the `z` prefix.
 *
 * Reference: https://www.w3.org/TR/vc-data-integrity/#multibase-0
 *           https://github.com/multiformats/multicodec/blob/master/table.csv
 */
function multibasePublicKey(pub: Uint8Array): string {
  const prefixed = new Uint8Array(2 + pub.length);
  prefixed[0] = 0xed; // multicodec: ed25519-pub
  prefixed[1] = 0x01;
  prefixed.set(pub, 2);
  return `z${base58btcEncode(prefixed)}`;
}

/**
 * JWK form of an Ed25519 public key (RFC 8037 / OKP). Used as the
 * preferred publicKeyJwk value alongside (or in place of) multibase
 * for resolvers that follow the JsonWebKey2020 suite.
 */
function publicKeyJwk(pub: Uint8Array): Record<string, string> {
  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: codec.bytesToBase64Url(pub),
  };
}

function buildDocument(id: string, domain: string, pub: Uint8Array): DIDDocument {
  const safeId = id.replace(/[^a-zA-Z0-9._\-]/g, '-');
  const webDID = toWebDID(safeId).replace(`:${AXIOM_AUTHORITY}:`, `:${domain}:`);
  const axiomDID = toAxiomDID(safeId);
  return {
    '@context': DID_CONTEXT,
    id: webDID,
    alsoKnownAs: [axiomDID],
    authentication: [`${webDID}#keys-1`],
    verificationMethod: [
      {
        id: `${webDID}#keys-1`,
        type: 'Ed25519VerificationKey2020',
        controller: webDID,
        publicKeyMultibase: multibasePublicKey(pub),
        publicKeyJwk: publicKeyJwk(pub),
      },
      {
        id: `${webDID}#pi-network`,
        type: 'PiNetworkVerificationKey',
        controller: webDID,
        serviceEndpoint: `pi://${domain}/user/${safeId}`,
      },
    ],
    service: [
      {
        id: `${webDID}#iqra-vault`,
        type: 'IQRA_Storage',
        serviceEndpoint: `https://${domain}/storage/${safeId}`,
      },
    ],
  };
}

export class SovereignDID {
  /**
   * Generate a DID Document for an agent or the main system, backed by
   * a fresh Ed25519 keypair. The caller MUST persist `privateKey`
   * before publishing the document — otherwise the identity is
   * unrecoverable.
   */
  static async generateBundle(id: string, domain: string = AXIOM_AUTHORITY): Promise<DIDDocumentBundle> {
    const kp = generateKeyPair();
    return SovereignDID.fromPrivateKey(id, domain, kp.privateKey);
  }

  /**
   * Backwards-compatible shape (legacy callers only): returns only the
   * DID Document. A fresh keypair is generated internally and the
   * private key is discarded. Use this ONLY when the identity is
   * ephemeral (e.g. a per-request audit trail).
   *
   * Prefer `generateBundle()` for persistent identities.
   */
  static async generateDocument(id: string, domain: string = AXIOM_AUTHORITY): Promise<DIDDocument> {
    const bundle = await SovereignDID.generateBundle(id, domain);
    return bundle.document;
  }

  /**
   * Build a DID Document from an existing Ed25519 private key. The
   * preferred entry point for a persistent identity stored in env vars
   * or a KMS.
   */
  static fromPrivateKey(id: string, domain: string, privateKey: Uint8Array): DIDDocumentBundle {
    const publicKey = publicKeyFromPrivate(privateKey);
    const document = buildDocument(id, domain, publicKey);
    const axiomDID = toAxiomDID(id.replace(/[^a-zA-Z0-9._\-]/g, '-'));
    return { document, axiomDID, publicKey, privateKey };
  }

  /**
   * Generates a GitHub-based DID Document. Unchanged: GitHub DIDs do
   * not use Ed25519 verification material; they rely on the GitHub
   * platform as the proof source.
   */
  static generateGitHubDID(username: string, repo: string, agentId: string): DIDDocument {
    const did = `did:github:${username}:${repo}:${agentId}`;
    return {
      '@context': DID_CONTEXT,
      id: did,
      authentication: [`${did}#owner`],
      verificationMethod: [
        {
          id: `${did}#owner`,
          type: 'GitHubVerificationKey',
          controller: did,
          blockchainAccountId: `github:${username}`,
        },
      ],
    };
  }

  /**
   * 🔄 Rotate identity keys. Returns BOTH halves. The old private key
   * should be archived (not discarded) until any in-flight signatures
   * relying on it have been re-issued under the new key.
   */
  static async rotateKeys(_id: string): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
    const kp = generateKeyPair();
    return { privateKey: kp.privateKey, publicKey: kp.publicKey };
  }
}
