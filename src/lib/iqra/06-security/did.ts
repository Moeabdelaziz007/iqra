/**
 * IQRA Sovereign DID (Decentralized Identifier) — الهوية اللامركزية
 * 
 * "وَلِكُلٍّ وِجْهَةٌ هُوَ مُوَلِّيهَا ۖ فَاسْتَبِقُوا الْخَيْرَاتِ" — البقرة: 148
 * 
 * Implements W3C DID standards for IQRA agents and personas.
 */

import { createHash } from 'crypto';
import { SovereignIdentityGuard } from '#security/security';

export interface DIDDocument {
  "@context": string[];
  id: string;
  authentication: string[];
  verificationMethod: {
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    blockchainAccountId?: string;
    serviceEndpoint?: string;
  }[];
  service?: {
    id: string;
    type: string;
    serviceEndpoint: string;
  }[];
}

export class SovereignDID {
  private static readonly CONTEXT = ["https://www.w3.org/ns/did/v1"];

  /**
   * Generates a DID Document for an agent or the main system.
   * @param id The ID (e.g., 'iqra' or 'iqra:researcher')
   * @param domain The domain where the DID is hosted (e.g., 'iqra.ai')
   */
  static async generateDocument(id: string, domain: string): Promise<DIDDocument> {
    const fingerprint = await SovereignIdentityGuard.verifyIntegrity();
    const did = `did:web:${domain}:${id.replace(/:/g, ':')}`;

    return {
      "@context": this.CONTEXT,
      id: did,
      authentication: [`${did}#keys-1`],
      verificationMethod: [
        {
          id: `${did}#keys-1`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: `z${createHash('sha256').update(fingerprint + id).digest('hex').substring(0, 48)}`
        },
        {
          id: `${did}#pi-network`,
          type: "PiNetworkVerificationKey",
          controller: did,
          serviceEndpoint: `pi://${domain}/user/${id}`
        }
      ],
      service: [
        {
          id: `${did}#iqra-vault`,
          type: "IQRA_Storage",
          serviceEndpoint: `https://${domain}/storage/${id}`
        }
      ]
    };
  }

  /**
   * Generates a GitHub-based DID Document.
   */
  static generateGitHubDID(username: string, repo: string, agentId: string): DIDDocument {
    const did = `did:github:${username}:${repo}:${agentId}`;
    return {
      "@context": this.CONTEXT,
      id: did,
      authentication: [`${did}#owner`],
      verificationMethod: [
        {
          id: `${did}#owner`,
          type: "GitHubVerificationKey",
          controller: did,
          blockchainAccountId: `github:${username}`
        }
      ]
    };
  }

  /**
   * 🔄 Rotates the identity keys (Key Rotation)
   */
  static async rotateKeys(id: string): Promise<string> {
    const newSecret = createHash('sha256').update(`${Date.now()}:${id}`).digest('hex');
    return newSecret;
  }
}
