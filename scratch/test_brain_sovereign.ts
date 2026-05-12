// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

import { iqraThink } from '../src/lib/iqra/01-core/brain';

async function test() {
  console.log('🚀 Starting Debug Test...');
  try {
    const result = await iqraThink({
      input: "تحليل تجريبي",
      options: { mock_workers: true }
    });
    console.log('✅ Result received:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.response) {
      console.log('🌟 SUCCESS: response is defined');
    } else {
      console.log('❌ FAILURE: response is UNDEFINED');
    }
  } catch (err) {
    console.error('💥 CRASH:', err);
  }
}

test();
