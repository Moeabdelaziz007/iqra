import type { NextApiRequest, NextApiResponse } from 'next';
import { iqraThink, IQRABrainMode } from '../../lib/iqra/01-core/brain'; // [TC] reason: relative path to canonical lib/iqra | id: c1-brain
import { IQRAMemory } from '../../lib/iqra/03-memory/memory'; /**
 * Handle POST API requests to generate an IQRA response and fetch semantic echoes.
 *
 * Accepts a JSON body with `query` (required) and optional `mode`. Validates method and input, searches memory for up to 3 semantic echoes, invokes the IQRA thinker to generate a response, and sends a JSON result containing `response`, `echoes`, and `timestamp`.
 *
 * Responses:
 * - 200: `{ response, echoes, timestamp }` when processing succeeds.
 * - 400: `{ error: 'Query is required' }` when `query` is missing or falsy.
 * - 405: `{ error: 'Method not allowed' }` when the HTTP method is not `POST`.
 * - 500: `{ error: string }` when an internal error occurs.
 *
 * @param req - Next.js API request object; expects a JSON body with `query` and optional `mode`
 * @param res - Next.js API response object used to send the JSON result
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, mode = IQRABrainMode.FAST_RESPONSE } = req.body || {};

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const echoes = await IQRAMemory.searchSemantic(query, 3);
    const response = await iqraThink({
      input: query,
      mode,
      context: [],
    });

    return res.status(200).json({
      response,
      echoes,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'IQRA query failed' });
  }
}
