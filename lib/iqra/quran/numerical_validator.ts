/**
 * Numerical Validator — الميزان العددي
 *
 * "وَأَحْصَىٰ كُلَّ شَيْءٍ عَدَدًا" — القرآن 72:28
 *
 * المبدأ: كل رقم في القرآن له بصمة — نفحصها بثلاثة مقاييس:
 *   1. Sab'iyyah (السبعية) — مضاعفات 7
 *   2. Symmetry-19 — مضاعفات 19
 *   3. Tesla 369 Seal — (surah + ayah) % 369
 *   4. Chiasm (التناظر) — بنية A-B-B'-A' في الأرقام
 */

export interface ResonanceResult {
  score: number;
  patterns: string[];
  isResonant: boolean;
  teslaResult?: number;
}

export interface ChiasmResult {
  isChiastic: boolean;
  depth: number;          // عمق التناظر (كم طبقة متطابقة)
  centerIndex: number;    // موضع المركز
  pairs: Array<[number, number]>; // الأزواج المتناظرة [i, j]
  score: number;          // درجة التناظر [0,1]
}

export class NumericalValidator {
  /**
   * يتحقق من الأنماط العددية القرآنية ويحسب درجة الرنين.
   * يشمل: تحليل تردد الحروف (Sab'iyyah/19) وختم Tesla 369.
   */
  static validate(input: string, context?: { surah: number; ayah: number }): ResonanceResult {
    const patterns: string[] = [];
    let score = 0;

    const cleanInput = input.replace(/\s+/g, ' ').trim();
    const charCount = cleanInput.replace(/\s/g, '').length;
    const wordCount = cleanInput.split(' ').filter(Boolean).length;

    // ── 1. Sab'iyyah (السبعية) ────────────────────────────────────────────────
    if (charCount > 0 && charCount % 7 === 0) {
      patterns.push(`Sab'iyyah_Char_Multiple_7 (${charCount})`);
      score += 0.2;
    }
    if (charCount > 0 && charCount % 19 === 0) {
      patterns.push(`Symmetry_19_Chars (${charCount})`);
      score += 0.2;
    }
    if (wordCount > 0 && wordCount % 7 === 0) {
      patterns.push(`Sab'iyyah_Word_Multiple_7 (${wordCount})`);
      score += 0.15;
    }

    // ── 2. Sacred Terms (الألفاظ المقدسة) ────────────────────────────────────
    const sacredTerms = ['الله', 'رحمن', 'رحيم', 'رب', 'ملك', 'إله', 'نور'];
    for (const term of sacredTerms) {
      if (input.includes(term)) {
        patterns.push(`Sacred_Term_${term}`);
        score += 0.1;
      }
    }

    // ── 3. Deep Letter Analysis ───────────────────────────────────────────────
    const targetLetters = ['ي', 'س', 'ا', 'ل', 'م', 'ر', 'ق', 'ن'];
    for (const char of targetLetters) {
      const count = (input.match(new RegExp(char, 'g')) || []).length;
      if (count > 0) {
        if (count % 7 === 0) {
          patterns.push(`Letter_Resonance_7_${char} (Count: ${count})`);
          score += 0.25;
        }
        if (count % 19 === 0) {
          patterns.push(`Letter_Resonance_19_${char} (Count: ${count})`);
          score += 0.25;
        }
      }
    }

    // ── 4. Digital Root Geometry ──────────────────────────────────────────────
    const charDR = this.calculateDigitalRoot(charCount);
    const wordDR = this.calculateDigitalRoot(wordCount);
    if (charDR === 7 || wordDR === 7) {
      patterns.push(`Geometric_DigitalRoot_7 (CharDR: ${charDR}, WordDR: ${wordDR})`);
      score += 0.1;
    }

    // ── 5. Tesla 369 Seal ─────────────────────────────────────────────────────
    let teslaResult: number | undefined;
    if (context) {
      teslaResult = (context.surah + context.ayah) % 369;
      if (this.isPrime(teslaResult)) {
        const isHeartSeal = context.surah === 36 && teslaResult === 37;
        patterns.push(
          `${isHeartSeal ? 'HEART_SEAL_37' : 'Tesla_369_Seal_Prime'} (${teslaResult})`
        );
        score += isHeartSeal ? 0.4 : 0.3;
      } else if (teslaResult % 7 === 0 || teslaResult % 19 === 0) {
        patterns.push(`Tesla_369_Seal_Resonance (${teslaResult})`);
        score += 0.2;
      }
    }

    return {
      score: Math.min(score, 1.0),
      patterns,
      isResonant: score >= 0.6,
      teslaResult,
    };
  }

  /**
   * يتحقق من التناظر الخيازمي (Chiasm) في تسلسل أرقام.
   *
   * الخيازم (Chiasm) هو بنية A-B-C-B'-A' حيث تتطابق العناصر
   * من الطرفين نحو المركز. شائع في الشعر العربي والقرآن الكريم.
   *
   * مثال: [7, 19, 114, 19, 7] → chiasm عمقه 2
   *
   * @param sequence - تسلسل الأرقام المُراد فحصه
   * @param tolerance - هامش التسامح في المقارنة (افتراضي: 0)
   * @returns ChiasmResult مع درجة التناظر والأزواج المتطابقة
   */
  static validateChiasm(sequence: number[], tolerance: number = 0): ChiasmResult {
    const n = sequence.length;

    if (n < 3) {
      return {
        isChiastic: false,
        depth: 0,
        centerIndex: 0,
        pairs: [],
        score: 0,
      };
    }

    // ── البحث عن أفضل مركز ────────────────────────────────────────────────
    let bestDepth = 0;
    let bestCenter = Math.floor(n / 2);
    let bestPairs: Array<[number, number]> = [];

    // نجرب كل مركز محتمل
    for (let center = 1; center < n - 1; center++) {
      const pairs: Array<[number, number]> = [];
      let depth = 0;

      let left = center - 1;
      let right = center + 1;

      while (left >= 0 && right < n) {
        const diff = Math.abs(sequence[left] - sequence[right]);
        if (diff <= tolerance) {
          pairs.push([left, right]);
          depth++;
          left--;
          right++;
        } else {
          break;
        }
      }

      if (depth > bestDepth) {
        bestDepth = depth;
        bestCenter = center;
        bestPairs = pairs;
      }
    }

    // ── حساب درجة التناظر ─────────────────────────────────────────────────
    // الدرجة = (عدد الأزواج المتطابقة) / (أقصى أزواج ممكنة)
    const maxPossiblePairs = Math.floor(n / 2);
    const score = maxPossiblePairs > 0 ? bestDepth / maxPossiblePairs : 0;

    // الخيازم يُعتبر حقيقياً إذا كان العمق >= 2
    const isChiastic = bestDepth >= 2;

    return {
      isChiastic,
      depth: bestDepth,
      centerIndex: bestCenter,
      pairs: bestPairs,
      score: Math.min(score, 1.0),
    };
  }

  /**
   * يتحقق من رقم واحد ضد نظام السبعة.
   */
  static validateNumber(n: number): ResonanceResult {
    const patterns: string[] = [];
    let score = 0;

    if (n % 7 === 0) {
      patterns.push('Multiple_of_7');
      score += 0.5;
    }

    if (this.calculateDigitalRoot(n) === 7) {
      patterns.push('Digital_Root_7');
      score += 0.4;
    }

    return {
      score: Math.min(score, 1.0),
      patterns,
      isResonant: score >= 0.5,
    };
  }

  /**
   * يحسب الجذر الرقمي (مجموع الأرقام حتى رقم واحد).
   */
  static calculateDigitalRoot(n: number): number {
    if (n === 0) return 0;
    return 1 + ((n - 1) % 9);
  }

  /**
   * يتحقق إذا كان الرقم أولياً (قانون عدم القسمة).
   */
  static isPrime(n: number): boolean {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  }
}
