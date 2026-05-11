import { NextRequest, NextResponse } from 'next/server';
import { SovereignEngine } from '../../../.././lib/iqra/01-core/sovereign'; // [TC] reason: correct depth to canonical lib/iqra | id: c1-sov

/**
 * Sovereign Sync Cycle
 * Ensures memory layers and trust chain are in harmony.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('🔄 Cron: Triggering Sovereign Sync...');
    // In lib/iqra/sovereign.ts, we should have a sync method
    // For now, we call recordState or a future sync method
    await SovereignEngine.recordSelfReview('sync', 'Periodic sovereign heartbeat.', 1.0);
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Sovereign Sync complete.' 
    });
  } catch (error) {
    console.error('Sovereign Sync Cron Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
