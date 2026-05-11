import { NextResponse } from 'next/server';
import { IQRAMemory } from '../../../../lib/iqra/03-memory/memory'; // [TC] reason: relative path to canonical lib/iqra | id: c1-taz2

/**
 * 🧼 Tazkiyah (Purification) Endpoint
 * Triggers the periodic cleansing and summarization of episodic memory.
 * 
 * "قَدْ أَفْلَحَ مَن زَكَّاهَا" — الشمس: 9
 */
export async function GET(request: Request) {
  // Verify Cron Auth (Optional but recommended for production)
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('🧼 Starting automated Tazkiyah cycle...');
    await IQRAMemory.performPurification();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tazkiyah performed successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Tazkiyah Failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
