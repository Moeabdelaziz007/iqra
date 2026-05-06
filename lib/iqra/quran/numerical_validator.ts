/**
 * IQRA Numerical Validator — المحقق الرقمي
 *
 * "وَأَحْصَىٰ كُلَّ شَيْءٍ عَدَدًا"
 * "And He takes account of every single thing by number" — Al-Jinn 72:28
 */

export interface NumericalPatternResult {
  value: number;
  is_match: boolean;
  patterns: string[];
  resonance_score: number;
  arabic_note: string;
}

/**
 * Checks a number against sacred Quranic numerical constants.
 * Constants: 7 (Sab'een), 9 (Humility/Perfection), 19 (Over it are Nineteen), 40 (Maturity).
 */
export function validateSacredNumber(value: number): NumericalPatternResult {
  const matches: string[] = [];
  let score = 0;

  if (value === 0) return { value, is_match: false, patterns: [], resonance_score: 0, arabic_note: 'الصفر ليس عدداً في هذا الميزان.' };

  // 1. The Rule of Seven (7)
  if (value % 7 === 0) {
    matches.push('SABEEN_7');
    score += 0.4;
  }

  // 2. The Rule of Nineteen (19)
  if (value % 19 === 0) {
    matches.push('NINETEEN_19');
    score += 0.5;
  }

  // 3. The Rule of Forty (40)
  if (value % 40 === 0) {
    matches.push('ARBAUN_40');
    score += 0.3;
  }

  // 4. The Rule of Nine (9) - Perfection/Humility
  if (value % 9 === 0) {
    matches.push('NINE_9');
    score += 0.2;
  }

  // 5. Special Combined Resonance (e.g., 7 * 19 = 133)
  if (value % 7 === 0 && value % 19 === 0) {
    score += 0.5; // High resonance
  }

  const isMatch = matches.length > 0;
  const finalScore = Math.min(score, 1.0);

  let arabicNote = '';
  if (isMatch) {
    arabicNote = `تم العثور على رنين عددي (${matches.join('، ')}). القيمة ${value} تتوافق مع السنن العددية القرآنية.`;
  } else {
    arabicNote = `القيمة ${value} لا تظهر رنيناً مباشراً مع الثوابت المقدسة.`;
  }

  return {
    value,
    is_match: isMatch,
    patterns: matches,
    resonance_score: finalScore,
    arabic_note: arabicNote
  };
}

/**
 * Validates a text block for numerical significance (e.g., letter counts)
 */
export function validateTextNumerics(text: string): NumericalPatternResult[] {
  // Remove diacritics for raw letter counting
  const clean = text.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
  const length = clean.replace(/\s/g, '').length;
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  return [
    validateSacredNumber(length),
    validateSacredNumber(wordCount)
  ];
}
