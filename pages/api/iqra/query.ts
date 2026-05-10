import type { NextApiRequest, NextApiResponse } from 'next';
import { iqraThink, IQRABrainMode } from '../../lib/iqra/01-core/brain'; // [TC] reason: relative path to canonical lib/iqra | id: c1-brain
import { IQRAMemory } from '../../lib/iqra/03-memory/memory'; /**
 * Handle POST requests to run an IQRA brain operation and return its result with semantic echoes.
 *
 * Expects a JSON body with a `query` string and an optional `mode`. If `query` is missing, responds with 400. If the HTTP method is not POST, responds with 405. On success, returns 200 with a JSON object containing `response` (IQRA result), `echoes` (up to three semantic memory matches), and `timestamp`. On error, responds with 500 and an error message.
 *
 * @param req - Incoming Next.js API request; body should contain `query` and optional `mode`
 * @param res - Next.js API response used to send status codes and JSON payloads
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
