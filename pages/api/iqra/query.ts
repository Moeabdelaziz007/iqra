import type { NextApiRequest, NextApiResponse } from 'next';
import { iqraThink, IQRABrainMode } from '../../lib/iqra/01-core/brain'; // [TC] reason: relative path to canonical lib/iqra | id: c1-brain
import { IQRAMemory } from '../../lib/iqra/03-memory/memory'; // [TC] reason: relative path to canonical lib/iqra | id: c1-mem

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
