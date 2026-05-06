// scripts/test_upstash.ts
import 'dotenv/config';
import { IQRAMemory } from '../lib/iqra/memory';

async function main() {
  console.log('Testing Upstash-backed memory...');
  try {
    await IQRAMemory.setCuriosity('test_probe', 42);
    const value = await IQRAMemory.getCuriosity('test_probe');
    console.log('Got curiosity value:', value);
    
    if (value === 42) {
      console.log('✅ Upstash/Local fallback test PASSED');
    } else {
      console.log('❌ Upstash/Local fallback test FAILED (Value mismatch)');
    }
  } catch (err) {
    console.error('Upstash test failed:', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
