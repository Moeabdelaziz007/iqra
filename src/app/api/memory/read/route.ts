import { NextRequest, NextResponse } from 'next/server';
import { MemoryBridge } from '#memory/memory_bridge';
import { IQRALogger } from '#infra/logger';

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const result = await MemoryBridge.read(key);

    return NextResponse.json({
      ...result,
      key,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    IQRALogger.error('❌ [MEMORY_API] Read error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
