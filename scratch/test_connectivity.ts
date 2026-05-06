import { IQRAMemory } from '../lib/iqra/memory';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function test() {
  console.log('--- IQRA Heartbeat Test ---');
  console.log('Time:', new Date().toISOString());
  
  try {
    console.log('Testing Redis...');
    await IQRAMemory.set('heartbeat', Date.now().toString());
    const val = await IQRAMemory.get('heartbeat');
    console.log('✅ Redis OK:', val);
  } catch (e) {
    console.log('❌ Redis Error:', e.message);
  }

  try {
    console.log('Testing Qdrant/Google Embeddings...');
    // This will check if variables are set at least
    const results = await IQRAMemory.searchSemantic('test');
    console.log('✅ Semantic Check Done. Results found:', results.length);
  } catch (e) {
    console.log('❌ Semantic Error:', e.message);
  }
  
  process.exit(0);
}

test();
