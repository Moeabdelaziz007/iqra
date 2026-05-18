import { NextRequest, NextResponse } from 'next/server';
import { MicroMemory } from '#memory/micro_memory';
import { IQRAMemory } from '#memory/memory';
import { MemoryBridge } from '#memory/memory_bridge';
import { IQRALogger } from '#infra/logger';

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    await MicroMemory.init().catch(() => {});

    switch (action) {
      case 'search': {
        const { embedding, topK = 7, minResonance = 0.0 } = params;
        let queryEmbedding: number[];

        if (embedding) {
          queryEmbedding = embedding;
        } else if (params.text) {
          queryEmbedding = await IQRAMemory.generateEmbedding(params.text);
        } else {
          return NextResponse.json({ error: 'embedding or text required for search' }, { status: 400 });
        }

        const patterns = MicroMemory.getSimilarPatterns(queryEmbedding, topK, minResonance);
        return NextResponse.json({ patterns, count: patterns.length, timestamp: Date.now() });
      }

      case 'store': {
        const { verse, field, resonanceScore, embedding, text, missionId = 'api' } = params;
        if (!verse || !field || resonanceScore === undefined || !embedding) {
          return NextResponse.json({ error: 'verse, field, resonanceScore, and embedding required' }, { status: 400 });
        }

        const id = MemoryBridge.writePattern(verse, field, resonanceScore, embedding, missionId, text);
        return NextResponse.json({ id, verse, field, timestamp: Date.now() });
      }

      case 'stats': {
        const stats = MicroMemory.getStats();
        const quranSigPct = stats.patterns > 0 ? (stats.quran_signature_patterns / stats.patterns * 100) : 0;
        return NextResponse.json({
          ...stats,
          quran_signature_pct: Math.round(quranSigPct * 100) / 100,
          timestamp: Date.now(),
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Use search, store, or stats.` }, { status: 400 });
    }
  } catch (error: any) {
    IQRALogger.error('❌ [MEMORY_API] Pattern error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
