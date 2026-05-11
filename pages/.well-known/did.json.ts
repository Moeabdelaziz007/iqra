import type { NextApiRequest, NextApiResponse } from 'next';
import { SovereignDID } from '../../lib/iqra/06-security/did'; // [TC] reason: relative path to canonical lib/iqra | id: c1-did

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
