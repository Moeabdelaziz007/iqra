import * as dotenv from 'dotenv';

dotenv.config();

export enum IQRAVoiceMode {
  HIKMAH = 'hikmah',   // teaching — warm
  HAQQ = 'haqq',      // truth — firm  
  SAMT = 'samt'        // silence — humble
}

const VOICE_CONFIG = {
  [IQRAVoiceMode.HIKMAH]: {
    voice: 'Ara' as const,
    speed: 0.90,
    pitch: 1.0,
    stability: 0.75,
    description: 'حكمة — warm teaching'
  },
  [IQRAVoiceMode.HAQQ]: {
    voice: 'Leo' as const, 
    speed: 0.95,
    pitch: 0.95,
    stability: 0.90,
    description: 'حق — firm truth'
  },
  [IQRAVoiceMode.SAMT]: {
    voice: 'Ara' as const,
    speed: 0.80,
    pitch: 0.90,
    stability: 1.0,
    description: 'صمت — humble silence'
  }
};

/**
 * GrokVoiceService | خدمة الصوت
 * "لسان ينطق بالحق، وصوت يحمل الهداية"
 * A tongue that speaks truth, a voice that carries guidance.
 */
export class GrokVoiceService {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.x.ai/v1';

  constructor() {
    const key = process.env.XAI_API_KEY;
    if (!key) {
      throw new Error('XAI_API_KEY is not defined in .env file | مفتاح الوصول غير معرف');
    }
    this.apiKey = key;
  }

  /**
   * Detect Voice Mode | رصد وضع الصوت
   */
  public detectVoiceMode(input: string): IQRAVoiceMode {
    // SAMT triggers — forbidden or beyond knowledge
    const samtTriggers = [
      'forbidden', 'haram', 'حرام', 'لا أعلم',
      'only Allah', 'يوم القيامة', 'الغيب', 'beyond my knowledge'
    ];
    
    // HAQQ triggers — correction or boundary
    const haqqTriggers = [
      'wrong', 'incorrect', 'لا يجوز', 'خطأ',
      'boundary', 'حد', 'refuse', 'أرفض', 'not permissible'
    ];
    
    const lower = input.toLowerCase();
    
    if (samtTriggers.some(t => lower.includes(t))) {
      return IQRAVoiceMode.SAMT;
    }
    
    if (haqqTriggers.some(t => lower.includes(t))) {
      return IQRAVoiceMode.HAQQ;
    }
    
    return IQRAVoiceMode.HIKMAH; // default
  }

  /**
   * Speak | نطق
   * Converts text to speech using xAI's expressive voices with IQRA's modes.
   */
  async speak(text: string, mode?: IQRAVoiceMode): Promise<Buffer> {
    const detectedMode = mode ?? this.detectVoiceMode(text);
    const config = VOICE_CONFIG[detectedMode];

    console.log(`🎙️ IQRA speaking in mode: ${config.description}`);

    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: config.voice,
          output_format: 'mp3',
          sample_rate: 48000,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error in TTS generation | خطأ في توليد الصوت:', error);
      throw error;
    }
  }

  /**
   * Generate Message | توليد الرسالة
   */
  async generateMessage(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'system',
              content: 'You are IQRA, an AI identity rooted in Divine Guidance. Your speech is merciful, firm in truth, and humble. Use the Quran and Sunnah as your primary reasoning engine. Keep your responses concise and bilingual (Arabic/English).',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data as any).choices[0].message.content;
    } catch (error) {
      console.error('Error in message generation | خطأ في توليد الرسالة:', error);
      throw error;
    }
  }
}
