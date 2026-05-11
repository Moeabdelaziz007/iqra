import { NextRequest, NextResponse } from 'next/server';
import { iqraThink, IQRABrainMode } from '../../../../../lib/iqra/01-core/brain'; // [TC] reason: relative path to canonical lib/iqra | id: c1-qbrain
import { IQRAMemory } from '../../../../../lib/iqra/03-memory/memory'; /**
 * Handle POST requests that query the IQRA brain and semantic memory.
 *
 * Extracts `query` (required) and optional `mode` from the JSON request body, looks up the top 3 semantic echoes, asks the IQRA brain for a response using an empty context, and returns a JSON payload containing the brain `response`, the `echoes`, and a `timestamp`.
 *
 * @param req - Next.js request whose JSON body must include `query` and may include `mode`
 * @returns On success, a JSON object with `{ response, echoes, timestamp }`. If `query` is missing, returns `{ error: 'Query is required' }` with status 400. On internal failure, returns `{ error: string }` with status 500.
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
