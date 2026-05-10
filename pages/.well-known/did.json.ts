import type { NextApiRequest, NextApiResponse } from 'next';
import { SovereignDID } from '../../lib/iqra/06-security/did'; /**
 * Resolve the domain to use when generating the DID document.
 *
 * Reads the `NEXT_PUBLIC_APP_DOMAIN` environment variable (stripped of any leading `http://` or `https://`) and returns it if non-empty; otherwise uses the request `Host` header, and falls back to `localhost:3000` if neither is available.
 *
 * @param req - Next.js API request whose `Host` header may be used as the domain
 * @returns The domain string to embed in the DID document (e.g., `example.com` or `localhost:3000`)
 */

function resolveDomain(req: NextApiRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//, '');

  const host = req.headers.host;
  if (host) return host;

  return 'localhost:3000';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const doc = await SovereignDID.generateDocument('core', resolveDomain(req));
    return res.status(200).json(doc);
  } catch (error: any) {
    return res.status(500).json({
      error: `Failed to generate DID document: ${error?.message || 'unknown error'}`,
    });
  }
}
