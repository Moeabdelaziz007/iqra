import { NextRequest, NextResponse } from 'next/server';
import { MemoryTopology } from '#memory/memory_topology';
import { IQRALogger } from '#infra/logger';

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'search': {
        const { text, type = 'all', topK = 7, min_relevance = 0.3 } = params;
        if (!text) {
          return NextResponse.json({ error: 'text is required for search' }, { status: 400 });
        }
        const results = await MemoryTopology.search({ text, type, topK, min_relevance });
        return NextResponse.json({ results, count: results.length, timestamp: Date.now() });
      }

      case 'stats': {
        const stats = await MemoryTopology.getStats();
        return NextResponse.json({ ...stats, timestamp: Date.now() });
      }

      case 'write': {
        const { type, key, value, metadata } = params;
        if (!type || !key || value === undefined) {
          return NextResponse.json({ error: 'type, key, and value required' }, { status: 400 });
        }
        await MemoryTopology.write(type, key, value, metadata || {});
        return NextResponse.json({ type, key, timestamp: Date.now() });
      }

      case 'read': {
        const { type, key } = params;
        if (!type || !key) {
          return NextResponse.json({ error: 'type and key required' }, { status: 400 });
        }
        const value = await MemoryTopology.read(type, key);
        return NextResponse.json({ type, key, value, timestamp: Date.now() });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    IQRALogger.error('❌ [MEMORY_API] Topology error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
