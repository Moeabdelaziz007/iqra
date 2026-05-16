import { NextRequest, NextResponse } from 'next/server';
import { MemoryBridge } from '#memory/memory_bridge';
import { IQRALogger } from '#infra/logger';
import { Pulse369 } from '#memory/pulse_369';

export async function POST(req: NextRequest) {
  try {
    const { key, value, layer = 'hot', ttl_ms, broadcast = false } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    const id = await MemoryBridge.write(key, value, { layer, ttl_ms, broadcast });

    await Pulse369.tick('api:memory:write').catch(() => {});

    return NextResponse.json({ id, key, layer, broadcast, timestamp: Date.now() });
  } catch (error: any) {
    IQRALogger.error('❌ [MEMORY_API] Write error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
