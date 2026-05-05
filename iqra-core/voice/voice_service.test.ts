import { VoiceService } from './voice_service';
import * as fs from 'fs';
import * as path from 'path';

async function testVoicePipeline() {
  console.log('--- IQRA Voice Pipeline Test | اختبار خط صوت إقرأ ---');
  const voiceService = new VoiceService();

  try {
    // 1. Test Message Generation | اختبار توليد الرسالة
    console.log('Generating divine message... | جاري توليد الرسالة الإلهية...');
    const message = await voiceService.generateMessage('Speak about the importance of Amanah (Trust).');
    console.log('Message Generated | الرسالة المولدة:');
    console.log(message);

    // 2. Test Speech Synthesis | اختبار تحويل النص إلى صوت
    console.log('\nSynthesizing speech... | جاري تحويل النص إلى صوت...');
    const audioBuffer = await voiceService.speak(message, 'Ara');
    
    const outputPath = path.join(__dirname, 'test_output.mp3');
    fs.writeFileSync(outputPath, audioBuffer);
    
    console.log(`✅ Success! Audio saved to: ${outputPath}`);
    console.log('✅ تم بنجاح! تم حفظ الصوت في المسار أعلاه.');

  } catch (error) {
    console.error('❌ Test Failed | فشل الاختبار:', error);
  }
}

testVoicePipeline();
