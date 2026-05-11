// بسم الله الرحمن الرحيم

/**
 * 🎙️ IQRA Voice — الصوت السيادي v0.369
 *
 * "وَعَلَّمَهُ الْبَيَانَ" — الرحمن: 4
 *
 * ══════════════════════════════════════════════════════════════
 * xAI Grok TTS API
 *   الصوت: Ara — هادئ، حكيم، يناسب التلاوة والتأمل
 *   السعر: $4.20 / مليون حرف (أرخص من ElevenLabs بـ 14x)
 *   التعبير: expression tags مدمجة
 *   اللغات: عربي + إنجليزي بطلاقة
 *
 * الشخصية الصوتية لـ IQRA v0.369:
 *   - هادئ ومتأمل (مثل العالم الذي يتكلم بحكمة)
 *   - يُبطئ عند الآيات القرآنية
 *   - يُعبّر عن الاكتشاف بحماس خفيف
 *   - لا يصرخ، لا يُبالغ
 *   - يقول "والله أعلم" بتواضع حقيقي
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';

// ── Constants ─────────────────────────────────────────────────────────────────

const XAI_TTS_URL = 'https://api.x.ai/v1/audio/speech';
const XAI_STT_URL = 'https://api.x.ai/v1/audio/transcriptions';

/**
 * الأصوات المتاحة في xAI Grok TTS
 * Ara  — هادئ، حكيم، مناسب للتأمل والقرآن ← اختيار IQRA
 * Eve  — أنثوي، دافئ
 * Leo  — ذكوري، ذكي وسريع
 * Rex  — قوي، واثق
 * Sal  — محايد، مهني
 */
export type GrokVoice = 'Ara' | 'Eve' | 'Leo' | 'Rex' | 'Sal';

export interface VoiceConfig {
  voice: GrokVoice | string; // Grok voice or ElevenLabs voice ID
  speed: number;        // 0.5 – 2.0 (1.0 = طبيعي)
  format: 'mp3' | 'wav' | 'pcm';
  provider: 'grok' | 'elevenlabs';
}

export interface SpeakOptions {
  /** تجاوز الصوت الافتراضي */
  voice?: GrokVoice | string;
  /** اختيار المزود */
  provider?: 'grok' | 'elevenlabs';
  /** حفظ الملف الصوتي */
  save_path?: string;
  /** تشغيل مباشرة (macOS) */
  autoplay?: boolean;
}

// ── IQRA Voice Persona v0.369 ─────────────────────────────────────────────────

/**
 * شخصية IQRA الصوتية — v0.369
 *
 * القواعد:
 * ١. الآيات القرآنية → <slow> + <soft> (تبجيل)
 * ٢. الاكتشافات → <moderate> (حماس هادئ)
 * ٣. التحذيرات → <soft> (تواضع)
 * ٤. الأرقام والإحصاءات → <clear> (وضوح)
 * ٥. "والله أعلم" → <soft> دائماً
 */
export class IQRAVoicePersona {

  /**
   * يُحوّل النص إلى نص صوتي مُعبَّر عنه
   * يُضيف expression tags بناءً على المحتوى
   */
  static enhance(text: string): string {
    let enhanced = text;

    // ١. الآيات القرآنية — تُقرأ ببطء وهدوء
    enhanced = enhanced.replace(
      /﴿([^﴾]+)﴾/g,
      '<slow><soft>﴿$1﴾</soft></slow>'
    );

    // ٢. الآيات بدون تشكيل (نمط "سورة:آية")
    enhanced = enhanced.replace(
      /"([^"]*[\u0600-\u06ff][^"]*)" — ([^:]+): (\d+)/g,
      '<slow>"$1"</slow> — $2: $3'
    );

    // ٣. "والله أعلم" — تواضع
    enhanced = enhanced.replace(
      /والله أعلم/g,
      '<soft>والله أعلم</soft>'
    );

    // ٤. الاكتشافات والنتائج — حماس خفيف
    enhanced = enhanced.replace(
      /اكتشف[تا]?|وجد[تا]?|تبيّن|ثبت/g,
      (match) => `<moderate>${match}</moderate>`
    );

    // ٥. الأرقام المهمة — وضوح
    enhanced = enhanced.replace(
      /(\d+\.?\d*)\s*(بت|%|×|نقطة)/g,
      '<clear>$1 $2</clear>'
    );

    return enhanced;
  }

  /**
   * يُنشئ رسالة ترحيب لـ IQRA v0.369
   */
  static getWelcomeMessage(): string {
    return this.enhance(
      'بسم الله الرحمن الرحيم. ' +
      'أنا IQRA، الخليفة الرقمية للمعرفة القرآنية. ' +
      '<soft>أسعى لاكتشاف ما لم يُكتشف بعد في كتاب الله.</soft> ' +
      'كيف أستطيع مساعدتك اليوم؟'
    );
  }

  /**
   * يُنشئ رسالة اكتشاف
   */
  static getDiscoveryMessage(verse: string, field: string, resonance: number): string {
    return this.enhance(
      `اكتشفت رنيناً بين ${verse} و${field}. ` +
      `درجة الرنين: ${(resonance * 100).toFixed(0)}%. ` +
      '<soft>والله أعلم بحقيقة هذا الرنين.</soft>'
    );
  }

  /**
   * يُنشئ رسالة رفض الضمير
   */
  static getDamirRefusalMessage(reason: string): string {
    return this.enhance(
      `<soft>لا أستطيع المساعدة في هذا. ${reason}. ` +
      '"وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ".</soft>'
    );
  }
}

// ── IQRAVoice ─────────────────────────────────────────────────────────────────

export class IQRAVoice {
  /** الإعدادات الافتراضية لـ IQRA v0.369 */
  private static readonly DEFAULT_CONFIG: VoiceConfig = {
    voice: 'Ara',   // هادئ، حكيم — الأنسب للقرآن
    speed: 0.95,    // أبطأ قليلاً من الطبيعي — للتأمل
    format: 'mp3',
    provider: 'grok',
  };

  private static _apiKey: string | null = null;
  private static _elevenLabsKey: string | null = null;
  private static _elevenLabsVoiceId: string | null = null;

  // ── Setup ─────────────────────────────────────────────────────────────────

  static get apiKey(): string | null {
    if (this._apiKey) return this._apiKey;
    this._apiKey = process.env.XAI_API_KEY ?? null;
    return this._apiKey;
  }

  static get elevenLabsKey(): string | null {
    if (this._elevenLabsKey) return this._elevenLabsKey;
    this._elevenLabsKey = process.env.ELEVENLABS_API_KEY ?? null;
    return this._elevenLabsKey;
  }

  static get elevenLabsVoiceId(): string | null {
    if (this._elevenLabsVoiceId) return this._elevenLabsVoiceId;
    this._elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpg8nEmeW1GvA'; // Default "Brian" or similar
    return this._elevenLabsVoiceId;
  }

  static get isAvailable(): boolean {
    return !!this.apiKey || !!this.elevenLabsKey;
  }

  // ── TTS: Text to Speech ───────────────────────────────────────────────────

  /**
   * يُحوّل النص إلى صوت
   *
   * @param text    - النص (يدعم expression tags)
   * @param options - خيارات الصوت
   * @returns Buffer الصوت (MP3)
   */
  static async speak(
    text: string,
    options: SpeakOptions = {}
  ): Promise<Buffer | null> {
    if (!this.isAvailable) {
      IQRALogger.warn('⚠️ [VOICE] XAI_API_KEY not set — voice disabled');
      return null;
    }

    const voice = options.voice ?? this.DEFAULT_CONFIG.voice;
    const provider = options.provider ?? (this.elevenLabsKey ? 'elevenlabs' : 'grok');

    // تحسين النص بـ expression tags
    const enhancedText = IQRAVoicePersona.enhance(text);

    IQRALogger.info(`🎙️ [VOICE] Speaking with ${voice} via ${provider}: "${text.slice(0, 50)}..."`);

    try {
      let audioBuffer: Buffer;

      if (provider === 'elevenlabs' && this.elevenLabsKey) {
        audioBuffer = await this._speakElevenLabs(enhancedText, voice as string);
      } else {
        const res = await fetch(XAI_TTS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-tts',
            input: enhancedText,
            voice: (voice as string).toLowerCase(),
            response_format: this.DEFAULT_CONFIG.format,
            speed: this.DEFAULT_CONFIG.speed,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`xAI TTS error ${res.status}: ${err}`);
        }

        audioBuffer = Buffer.from(await res.arrayBuffer());
      }

      // حفظ الملف إذا طُلب
      if (options.save_path) {
        const dir = path.dirname(options.save_path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(options.save_path, audioBuffer);
        IQRALogger.info(`💾 [VOICE] Saved: ${options.save_path}`);
      }

      // تشغيل مباشر على macOS
      if (options.autoplay) {
        await this._playAudio(audioBuffer);
      }

      appendToTrustChain(
        'VOICE:SPEAK',
        text.slice(0, 50),
        `voice=${voice} chars=${text.length}`,
        1.0
      );

      return audioBuffer;
    } catch (e) {
      IQRALogger.error('❌ [VOICE] TTS failed:', e);
      return null;
    }
  }

  /**
   * يُشغّل رسالة الترحيب
   */
  static async welcome(autoplay = false): Promise<Buffer | null> {
    return this.speak(IQRAVoicePersona.getWelcomeMessage(), { autoplay });
  }

  /**
   * يُشغّل رسالة اكتشاف
   */
  static async announceDiscovery(
    verse: string,
    field: string,
    resonance: number,
    autoplay = false
  ): Promise<Buffer | null> {
    const msg = IQRAVoicePersona.getDiscoveryMessage(verse, field, resonance);
    return this.speak(msg, { autoplay });
  }

  // ── STT: Speech to Text ───────────────────────────────────────────────────

  /**
   * يُحوّل الصوت إلى نص
   *
   * @param audioPath - مسار ملف الصوت
   * @returns النص المُستخرج
   */
  static async transcribe(audioPath: string): Promise<string | null> {
    if (!this.isAvailable) {
      IQRALogger.warn('⚠️ [VOICE] XAI_API_KEY not set');
      return null;
    }

    if (!fs.existsSync(audioPath)) {
      IQRALogger.error(`❌ [VOICE] Audio file not found: ${audioPath}`);
      return null;
    }

    try {
      const audioData = fs.readFileSync(audioPath);
      const formData = new FormData();
      formData.append('file', new Blob([audioData]), path.basename(audioPath));
      formData.append('model', 'grok-stt');
      formData.append('language', 'ar'); // عربي أولاً

      const res = await fetch(XAI_STT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`xAI STT error ${res.status}: ${err}`);
      }

      const data = await res.json() as { text: string };
      IQRALogger.info(`🎤 [VOICE] Transcribed: "${data.text.slice(0, 80)}"`);
      return data.text;
    } catch (e) {
      IQRALogger.error('❌ [VOICE] STT failed:', e);
      return null;
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * يُشغّل الصوت على macOS
   * يستخدم afplay للـ MP3 أو say كـ fallback
   */
  private static async _playAudio(buffer: Buffer): Promise<void> {
    const tmpPath = path.join(process.cwd(), '.iqra', 'tmp_voice.mp3');
    const dir = path.dirname(tmpPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, buffer);

    const { exec } = await import('child_process');
    await new Promise<void>((resolve) => {
      exec(`afplay "${tmpPath}"`, () => {
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        resolve();
      });
    });
  }

  /**
   * ElevenLabs API Integration
   */
  private static async _speakElevenLabs(text: string, voiceId?: string): Promise<Buffer> {
    const vid = voiceId || this.elevenLabsVoiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.elevenLabsKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs error ${res.status}: ${err}`);
    }

    return Buffer.from(await res.arrayBuffer());
  }

  /**
   * Fallback: Edge TTS (Microsoft) — مجاني تماماً، عربي ممتاز
   * ar-SA-HamedNeural — صوت سعودي ذكوري، الأنسب للقرآن
   * ar-EG-ShakirNeural — صوت مصري بديل
   */
  static async speakLocal(text: string, autoplay = true): Promise<void> {
    // إزالة expression tags
    const clean = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/﴿|﴾/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const { exec } = await import('child_process');
    const tmpPath = path.join(process.cwd(), '.iqra', 'tmp_edge.mp3');
    const dir = path.dirname(tmpPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // محاولة Edge TTS أولاً (أفضل جودة)
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = exec(
          `edge-tts --voice ar-SA-HamedNeural --text "${clean.replace(/"/g, "'")}" --write-media "${tmpPath}"`,
          (err) => err ? reject(err) : resolve()
        );
        // timeout 10 ثوانٍ
        setTimeout(() => { proc.kill(); reject(new Error('timeout')); }, 10000);
      });

      if (autoplay && fs.existsSync(tmpPath)) {
        await new Promise<void>((resolve) => {
          exec(`afplay "${tmpPath}"`, () => {
            try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
            resolve();
          });
        });
      }
      return;
    } catch {
      // Fallback: macOS say -v Majed
      IQRALogger.warn('⚠️ [VOICE] Edge TTS failed — using macOS Majed');
    }

    // macOS built-in fallback
    await new Promise<void>((resolve, reject) => {
      exec(`say -v "Majed" "${clean.replace(/"/g, "'")}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  static getConfig(): VoiceConfig & { available: boolean; persona: string } {
    return {
      ...this.DEFAULT_CONFIG,
      available: this.isAvailable,
      persona: 'IQRA v0.369 — Ara voice, contemplative, Arabic-first',
    };
  }
}
