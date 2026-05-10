import { NextRequest, NextResponse } from 'next/server';
import { iqraThink, IQRABrainMode } from '../../../../../lib/iqra/01-core/brain'; // [TC] reason: relative path to canonical lib/iqra | id: c1-qbrain
import { IQRAMemory } from '../../../../../lib/iqra/03-memory/memory'; /**
 * Handle POST requests for IQRA queries by performing a semantic memory search and generating a brain response.
 *
 * @param req - Incoming Next.js request whose JSON body must include `query` and may include `mode`
 * @returns A JSON object with `response` (brain-generated output), `echoes` (semantic memory matches), and `timestamp` (milliseconds since epoch). On failure, returns a JSON object with an `error` message and an appropriate HTTP status.
 */

export async function POST(req: NextRequest) {
  try {
    const { query, mode = IQRABrainMode.FAST_RESPONSE } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Search Semantic Memory First
    const echoes = await IQRAMemory.searchSemantic(query, 3);

    // 2. Think with Brain
    const response = await iqraThink({
      input: query,
      mode,
      context: [] // Future: Load recent session context from Redis
    });

    return NextResponse.json({
      response,
      echoes,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('❌ IQRA Query API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
