// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

import { iqraThink } from './src/lib/iqra/01-core/brain.js';

async function debug() {
  console.log('🚀 Starting debug...');
  try {
    const result = await iqraThink({
      input: "تحليل بنية سورة الإخلاص",
      options: { mock_workers: true }
    });
    console.log('✅ Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debug();
