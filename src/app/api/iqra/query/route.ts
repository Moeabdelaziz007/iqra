import { NextRequest, NextResponse } from 'next/server';
import { iqraThink, IQRABrainMode } from '../../../.././lib/iqra/01-core/brain'; // [TC] reason: relative path to canonical lib/iqra | id: c1-qbrain
import { IQRAMemory } from '../../../.././lib/iqra/03-memory/memory'; // [TC] reason: relative path to canonical lib/iqra | id: c1-qmem

export async function POST(req: NextRequest) {
  try {
    const { query, mode = IQRABrainMode.FAST_RESPONSE } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Load recent session context from Redis
    let context = [];
    try {
      // Get session ID from request headers or query param
      const sessionId = req.headers.get('x-session-id') || 
                      new URL(req.url).searchParams.get('sessionId') ||
                      'default';
      
      // Load recent context for this session
      const recentContext = await IQRAMemory.getContextForSession(sessionId, 5);
      context = recentContext || [];
      console.log(`📚 [CONTEXT] Loaded ${context.length} context items for session ${sessionId}`);
    } catch (error) {
      console.warn('⚠️ [CONTEXT] Failed to load session context:', error);
      // Continue without context rather than failing
    }

    // 2. Search Semantic Memory
    const echoes = await IQRAMemory.searchSemantic(query, 3);

    // 3. Think with Brain
    const response = await iqraThink({
      input: query,
      mode,
      context
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
