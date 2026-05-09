/**
 * 🥧 PiNetworkSkill — مهارة التكامل مع شبكة Pi
 * 
 * "وَأَوْفُوا بِالْعَهْدِ ۖ إِنَّ الْعَهْدَ كَانَ مَسْئُولًا" — الإسراء: 34
 * 
 * Integrates with Pi Network SDK for identity and payment claims.
 */

import crypto from 'crypto';
import { IQRALogger } from '../12-infrastructure/logger';

export class PiNetworkSkill {
  private static readonly PI_API_BASE_URL =
    process.env.PI_API_BASE_URL || 'https://api.minepi.com';
  
  /**
   * 🎟️ Verify Pi User Identity
   * Uses Pi API token introspection endpoint.
   */
  static async verifyPiUser(accessToken: string): Promise<boolean> {
    if (!accessToken || accessToken.trim().length < 20) {
      return false;
    }

    IQRALogger.info('🥧 [PI_NETWORK] Verifying user identity via Pi SDK...');
    try {
      const res = await fetch(`${this.PI_API_BASE_URL}/v2/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) return false;
      const data = await res.json() as { uid?: string; username?: string };
      return Boolean(data.uid || data.username);
    } catch (err) {
      IQRALogger.warn('⚠️ [PI_NETWORK] verifyPiUser failed', err);
      return false;
    }
  }

  /**
   * 💰 Create a Pi Payment Claim
   * Transfers topological rewards to Pi mainnet/testnet requests.
   */
  static async createPaymentClaim(amount: number, memo: string): Promise<string> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid Pi payment amount');
    }

    const piApiKey = process.env.PI_API_KEY;
    if (!piApiKey) {
      throw new Error('PI_API_KEY is required for createPaymentClaim');
    }

    IQRALogger.info(`🥧 [PI_NETWORK] Creating payment claim: ${amount} Pi for "${memo}"`);
    const clientRef = crypto.randomUUID();
    const res = await fetch(`${this.PI_API_BASE_URL}/v2/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${piApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        memo,
        metadata: { client_ref: clientRef },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pi payment claim failed: ${res.status} ${body}`);
    }

    const data = await res.json() as { identifier?: string; paymentId?: string; id?: string };
    const paymentId = data.identifier || data.paymentId || data.id;
    if (!paymentId) {
      throw new Error('Pi payment claim response missing payment id');
    }

    return paymentId;
  }

  /**
   * 🔗 Get Pi Browser Redirect URL
   */
  static getPiBrowserUrl(domain: string): string {
    return `pi://${domain}`;
  }
}
