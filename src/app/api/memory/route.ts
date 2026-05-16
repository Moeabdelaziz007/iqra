import { NextResponse } from 'next/server';
import { MemoryBridge } from '#memory/memory_bridge';
import { MemoryTopology } from '#memory/memory_topology';
import { Pulse369 } from '#memory/pulse_369';
import { IQRAMemory } from '#memory/memory';
import { IQRALogger } from '#infra/logger';

export async function GET() {
  try {
    const bridgeStats = MemoryBridge.getStats();
    const topologyStats = await MemoryTopology.getStats();
    const pulseStats = Pulse369.getStats();
    const pulseCounter = await Pulse369.getCounter();

    const redisAvailable = !!(await IQRAMemory.getRedisClient().catch(() => null));

    return NextResponse.json({
      status: 'online',
      memory_system: 'IQRA Memory Bridge v2.0',
      layers: {
        hot: { entries: bridgeStats.hot_size, hit_rate: bridgeStats.hit_rate },
        warm: { engine: 'MicroMemory (SQLite + sqlite-vec)', patterns: topologyStats.semantic, experiences: topologyStats.episodic },
        cold: { engine: 'IQRAMemory (Upstash Redis + JSONL)' },
      },
      pulse369: {
        counter: pulseCounter,
        ...pulseStats,
      },
      redis: redisAvailable ? 'connected' : 'unavailable',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    IQRALogger.error('❌ [MEMORY_API] Status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
