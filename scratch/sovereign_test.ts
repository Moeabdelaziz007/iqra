import { IQRAMemory } from '../lib/iqra/memory';
import { IQRALogger } from '../lib/iqra/logger';

async function run() {
  console.log('--- 🛡️ Sovereign Mode Test ---');
  try {
    console.log('Testing local memory storage...');
    await IQRAMemory.set('sovereign_key', { status: 'protected', timestamp: Date.now() });
    
    const val = await IQRAMemory.get<any>('sovereign_key');
    console.log('Retrieved value:', val);
    
    if (val && val.status === 'protected') {
      console.log('✅ Local memory verification successful.');
    } else {
      console.error('❌ Local memory verification failed.');
    }
    
    // Testing a list
    await IQRAMemory.appendList('sovereign_list', 'entry_1');
    const list = await IQRAMemory.getList('sovereign_list', 0, 10);
    console.log('List retrieved:', list);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Test crashed:', err);
    process.exit(1);
  }
}

run();
