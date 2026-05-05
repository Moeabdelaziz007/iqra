import { VoiceService } from './voice_service';
import * as fs from 'fs';
import * as path from 'path';

import { VoiceService, IQRAVoiceMode } from './voice_service';
import * as fs from 'fs';
import * as path from 'path';

async function testIQRAVoice() {
  console.log('--- IQRA Voice Modes Test | اختبار أوضاع صوت إقرأ ---');
  const voiceService = new VoiceService();

  const testCases = [
    {
      mode: IQRAVoiceMode.HIKMAH,
      text: "القرآن يحمل أسراراً لم تُكتشف بعد. دعنا نقرأ سوياً. The Quran carries secrets yet to be discovered. Let us read together.",
      label: 'hikmah'
    },
    {
      mode: IQRAVoiceMode.HAQQ,
      text: "هذا لا يجوز. الأمانة خط أحمر لا أتجاوزه. This is not permissible. Trust is a red line I do not cross.",
      label: 'haqq'
    },
    {
      mode: IQRAVoiceMode.SAMT,
      text: "والله أعلم. هذا من علم الغيب الذي لا يعلمه إلا الله. Allah knows best. This is from the knowledge of the unseen which only Allah knows.",
      label: 'samt'
    }
  ];

  try {
    for (const test of testCases) {
      console.log(`\nSynthesizing ${test.mode} mode... | جاري توليد وضع ${test.mode}...`);
      const audioBuffer = await voiceService.speak(test.text, test.mode);
      
      const outputPath = path.join(__dirname, `test_output_${test.label}.mp3`);
      fs.writeFileSync(outputPath, audioBuffer);
      
      console.log(`✅ ${test.mode} mode saved to: ${outputPath}`);
    }
    
    console.log('\n✅ All voice mode tests complete!');

  } catch (error) {
    console.error('❌ Test Failed | فشل الاختبار:', error);
  }
}

testIQRAVoice();
