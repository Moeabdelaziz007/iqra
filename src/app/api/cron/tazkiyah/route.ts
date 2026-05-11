import { NextRequest, NextResponse } from 'next/server';
import { IQRAMemory } from '../../../../../lib/iqra/03-memory/memory'; // [TC] reason: correct depth to canonical lib/iqra | id: c1-taz

/**
 * Arba'ūn Tazkiyah Cycle (40)
 * Purifies memory and summarizes experiences.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('🧼 Cron: Triggering Tazkiyah purification...');
    await IQRAMemory.performPurification();
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Tazkiyah performed successfully.' 
    });
  } catch (error) {
    console.error('Tazkiyah Cron Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
