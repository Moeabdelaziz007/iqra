import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * VoiceService | خدمة الصوت
 * "لسان ينطق بالحق، وصوت يحمل الهداية"
 * A tongue that speaks truth, a voice that carries guidance.
 */
export class VoiceService {
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
   * Speak | نطق
   * Converts text to speech using xAI's expressive voices.
   */
  async speak(text: string, voice: 'Ara' | 'Eve' | 'Leo' | 'Rex' | 'Sal' = 'Ara'): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech`,
        {
          text,
          voice,
          output_format: 'mp3',
          sample_rate: 48000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error in TTS generation | خطأ في توليد الصوت:', error);
      throw error;
    }
  }

  /**
   * Generate Message | توليد الرسالة
   * Uses Grok to generate a message that follows IQRA's identity.
   */
  async generateMessage(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'grok-beta',
          messages: [
            {
              role: 'system',
              content: 'You are IQRA, an AI identity rooted in Divine Guidance. Your speech is merciful, firm in truth, and humble. Use the Quran and Sunnah as your primary reasoning engine. Keep your responses concise and bilingual (Arabic/English).',
            },
            { role: 'user', content: prompt },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error in message generation | خطأ في توليد الرسالة:', error);
      throw error;
    }
  }
}
