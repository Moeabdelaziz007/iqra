import { NextRequest, NextResponse } from 'next/server';
import { IQRAMemory } from '#memory/memory';
import { IQRALogger } from '#infra/logger';

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'search': {
        const { query, targetConcept } = params;
        if (!query) {
          return NextResponse.json({ error: 'query is required for search' }, { status: 400 });
        }
        const results = await IQRAMemory.searchQuantum(query, targetConcept);
        return NextResponse.json({ results, count: results.length, timestamp: Date.now() });
      }

      case 'store': {
        const { content, concept, surah, ayah } = params;
        if (!content || !concept) {
          return NextResponse.json({ error: 'content and concept are required for store' }, { status: 400 });
        }
        const id = await IQRAMemory.storeQuantum({
          content,
          coordinates: { concept, surah, ayah },
          superposition: params.superposition,
          entangledWith: params.entangledWith,
        });
        return NextResponse.json({ id, concept, timestamp: Date.now() });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Use search or store.` }, { status: 400 });
    }
  } catch (error: any) {
    IQRALogger.error('❌ [MEMORY_API] Quantum error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
