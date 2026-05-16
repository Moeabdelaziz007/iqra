import { NextResponse } from 'next/server';
import { Pulse369 } from '#memory/pulse_369';
import { IQRALogger } from '#infra/logger';

export async function GET() {
  try {
    const counter = await Pulse369.getCounter();
    const stats = Pulse369.getStats();

    return NextResponse.json({
      counter,
      ...stats,
      tick_intervals: {
        promote: 9,
        archive: 27,
        purge: 81,
      },
      next_promote_in: 9 - (counter % 9),
      next_archive_in: 27 - (counter % 27),
      next_purge_in: 81 - (counter % 81),
      timestamp: Date.now(),
    });
  } catch (error: any) {
    IQRALogger.error('❌ [MEMORY_API] Pulse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
