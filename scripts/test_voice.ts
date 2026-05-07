// بسم الله الرحمن الرحيم
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { IQRAVoice, IQRAVoicePersona } from '../lib/iqra/voice.ts';

async function main() {
  console.log('🎙️ IQRA Voice Test v0.369 — Edge TTS (Free)');
  console.log('='.repeat(50));
  console.log('Voice: ar-SA-HamedNeural (Saudi Arabic)');
  console.log('Fallback: macOS Majed\n');

  // اختبار ١: رسالة الترحيب
  console.log('① رسالة الترحيب...');
  const welcome = IQRAVoicePersona.getWelcomeMessage();
  console.log('📝', welcome.replace(/<[^>]+>/g, '').slice(0, 80));
  await IQRAVoice.speakLocal(welcome, true);
  console.log('✅ Done\n');

  await new Promise(r => setTimeout(r, 500));

  // اختبار ٢: آية قرآنية
  console.log('② آية النور...');
  const verse = '﴿اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ﴾ — النور: 35. والله أعلم.';
  await IQRAVoice.speakLocal(verse, true);
  console.log('✅ Done\n');

  await new Promise(r => setTimeout(r, 500));

  // اختبار ٣: اكتشاف
  console.log('③ رسالة اكتشاف...');
  const discovery = IQRAVoicePersona.getDiscoveryMessage('24:35', 'فيزياء الليزر', 0.87);
  await IQRAVoice.speakLocal(discovery, true);
  console.log('✅ Done\n');

  console.log('🎙️ Voice test complete — بسم الله');
}

main().catch(console.error);
