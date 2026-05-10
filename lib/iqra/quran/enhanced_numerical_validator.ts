/**
 * Enhanced Numerical Validator — الميزان العددي المحسّن
 * 
 * Advanced Quranic numerical pattern detection including:
 * - 7-based patterns (heavens, days, verses)
 * - 19-based patterns (mathematical miracle)
 * - Tesla 369 patterns (universal frequencies)
 * - Prime number analysis
 * - Fibonacci sequence detection
 * 
 * "وَأَحْصَىٰ كُلَّ شَيْءٍ عَدَدًا" — القرآن 72:28
 * "وَلَقَدْ خَلَقْنَا السَّمَاوَاتِ وَالْأَرْضَ وَمَا بَيْنَهُمَا فِي سِتَّةِ أَيَّامٍ" — القمر: 3
 */

export interface EnhancedResonanceResult {
  score: number;
  patterns: string[];
  isResonant: boolean;
  sevenPatterns: SevenPatternResult;
  nineteenPatterns: NineteenPatternResult;
  teslaPatterns: TeslaPatternResult;
  primeAnalysis: PrimeAnalysisResult;
  fibonacciAnalysis: FibonacciAnalysisResult;
  overallResonance: number;
}

export interface SevenPatternResult {
  charDivisible: boolean;
  wordDivisible: boolean;
  versePattern: boolean;
  symmetryScore: number;
  patterns: string[];
}

export interface NineteenPatternResult {
  charDivisible: boolean;
  wordDivisible: boolean;
  mathematicalMiracle: boolean;
  bismillahPattern: boolean;
  symmetryScore: number;
  patterns: string[];
}

export interface TeslaPatternResult {
  contains3: boolean;
  contains6: boolean;
  contains9: boolean;
  sequence369: boolean;
  digitalRoot3: boolean;
  digitalRoot6: boolean;
  digitalRoot9: boolean;
  patterns: string[];
}

export interface PrimeAnalysisResult {
  charCountPrime: boolean;
  wordCountPrime: boolean;
  primeFactors: number[];
  primeResonance: number;
  patterns: string[];
}

export interface FibonacciAnalysisResult {
  fibonacciLength: boolean;
  fibonacciWords: boolean;
  goldenRatio: boolean;
  fibonacciSequence: boolean;
  patterns: string[];
}

export class EnhancedNumericalValidator {
  private static readonly SACRED_SEVENS = [
    'سبع سموات', 'سبع أرضين', 'سبعة أيام', 'سبع درجات',
    'سبعون', 'سبعمائة', 'ألف سبع مئة', 'سبعون ألفا'
  ];

  private static readonly SACRED_NINETEENS = [
    'تسعة عشر', '19', 'مائة وتسع عشرة', 'ألف وتسع مئة',
    'بسم الله الرحمن الرحيم' // 19 letters
  ];

  private static readonly TESLA_FREQUENCIES = [3, 6, 9];
  private static readonly FIBONACCI_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

  /**
   * Enhanced validation with comprehensive pattern analysis
   */
  static validate(input: string): EnhancedResonanceResult {
    const cleanInput = input.trim();
    const charCount = cleanInput.length;
    const wordCount = cleanInput.split(/\s+/).filter(w => w.length > 0).length;

    // Analyze all pattern types
    const sevenPatterns = this.analyzeSevenPatterns(cleanInput, charCount, wordCount);
    const nineteenPatterns = this.analyzeNineteenPatterns(cleanInput, charCount, wordCount);
    const teslaPatterns = this.analyzeTeslaPatterns(cleanInput, charCount);
    const primeAnalysis = this.analyzePrimePatterns(charCount, wordCount);
    const fibonacciAnalysis = this.analyzeFibonacciPatterns(cleanInput, charCount, wordCount);

    // Calculate overall resonance
    const allPatterns = [
      ...sevenPatterns.patterns,
      ...nineteenPatterns.patterns,
      ...teslaPatterns.patterns,
      ...primeAnalysis.patterns,
      ...fibonacciAnalysis.patterns
    ];

    const patternScore = Math.min(allPatterns.length * 0.05, 0.5);
    const symmetryScore = (sevenPatterns.symmetryScore + nineteenPatterns.symmetryScore) / 2 * 0.3;
    const primeScore = primeAnalysis.primeResonance * 0.1;
    const fibonacciScore = (fibonacciAnalysis.goldenRatio ? 0.1 : 0);
    
    const overallScore = patternScore + symmetryScore + primeScore + fibonacciScore;

    return {
      score: Math.min(overallScore, 1.0),
      patterns: allPatterns,
      isResonant: overallScore > 0.4,
      sevenPatterns,
      nineteenPatterns,
      teslaPatterns,
      primeAnalysis,
      fibonacciAnalysis,
      overallResonance: overallScore
    };
  }

  /**
   * Analyze 7-based patterns (heavens, days, verses)
   */
  private static analyzeSevenPatterns(input: string, charCount: number, wordCount: number): SevenPatternResult {
    const patterns: string[] = [];
    let symmetryScore = 0;

    // Character-based 7 patterns
    if (charCount % 7 === 0) {
      patterns.push('Symmetry_7_Chars');
      symmetryScore += 0.3;
    }

    // Word-based 7 patterns
    if (wordCount % 7 === 0) {
      patterns.push('Symmetry_7_Words');
      symmetryScore += 0.3;
    }

    // Sacred seven patterns
    this.SACRED_SEVENS.forEach(pattern => {
      if (input.includes(pattern)) {
        patterns.push(`Sacred_Seven_${pattern.replace(/\s+/g, '_')}`);
        symmetryScore += 0.2;
      }
    });

    // Verse-like patterns (7-character segments)
    if (charCount >= 7) {
      const segments = Math.floor(charCount / 7);
      if (segments >= 3) {
        patterns.push('Verse_Like_Segments');
        symmetryScore += 0.1;
      }
    }

    return {
      charDivisible: charCount % 7 === 0,
      wordDivisible: wordCount % 7 === 0,
      versePattern: charCount >= 7 && Math.floor(charCount / 7) >= 3,
      symmetryScore: Math.min(symmetryScore, 1.0),
      patterns
    };
  }

  /**
   * Analyze 19-based patterns (mathematical miracle)
   */
  private static analyzeNineteenPatterns(input: string, charCount: number, wordCount: number): NineteenPatternResult {
    const patterns: string[] = [];
    let symmetryScore = 0;

    // Character-based 19 patterns
    if (charCount % 19 === 0) {
      patterns.push('Symmetry_19_Chars');
      symmetryScore += 0.4;
    }

    // Word-based 19 patterns
    if (wordCount % 19 === 0) {
      patterns.push('Symmetry_19_Words');
      symmetryScore += 0.3;
    }

    // Bismillah pattern (19 letters)
    if (input.toLowerCase().includes('bismillah') || input.includes('بسم الله')) {
      patterns.push('Bismillah_19');
      symmetryScore += 0.2;
    }

    // Sacred nineteen patterns
    this.SACRED_NINETEENS.forEach(pattern => {
      if (input.includes(pattern)) {
        patterns.push(`Sacred_Nineteen_${pattern.replace(/\s+/g, '_')}`);
        symmetryScore += 0.1;
      }
    });

    // Mathematical miracle detection
    const digitSum = this.getDigitSum(charCount);
    if (digitSum === 19 || digitSum % 19 === 0) {
      patterns.push('Mathematical_Miracle');
      symmetryScore += 0.3;
    }

    return {
      charDivisible: charCount % 19 === 0,
      wordDivisible: wordCount % 19 === 0,
      mathematicalMiracle: digitSum === 19 || digitSum % 19 === 0,
      bismillahPattern: input.toLowerCase().includes('bismillah') || input.includes('بسم الله'),
      symmetryScore: Math.min(symmetryScore, 1.0),
      patterns
    };
  }

  /**
   * Analyze Tesla 369 patterns (universal frequencies)
   */
  private static analyzeTeslaPatterns(input: string, charCount: number): TeslaPatternResult {
    const patterns: string[] = [];
    const digits = input.match(/\d/g)?.map(Number) || [];
    
    // Check for individual Tesla frequencies
    const contains3 = digits.includes(3) || charCount % 3 === 0;
    const contains6 = digits.includes(6) || charCount % 6 === 0;
    const contains9 = digits.includes(9) || charCount % 9 === 0;

    if (contains3) {
      patterns.push('Tesla_Frequency_3');
    }
    if (contains6) {
      patterns.push('Tesla_Frequency_6');
    }
    if (contains9) {
      patterns.push('Tesla_Frequency_9');
    }

    // Check for 369 sequence
    const digitString = digits.join('');
    if (digitString.includes('369')) {
      patterns.push('Tesla_Sequence_369');
    }

    // Digital root analysis
    const digitalRoot = this.getDigitalRoot(charCount);
    const digitalRoot3 = digitalRoot === 3;
    const digitalRoot6 = digitalRoot === 6;
    const digitalRoot9 = digitalRoot === 9;

    if (digitalRoot3) patterns.push('Digital_Root_3');
    if (digitalRoot6) patterns.push('Digital_Root_6');
    if (digitalRoot9) patterns.push('Digital_Root_9');

    // Check for Tesla pattern in word structure
    const words = input.split(/\s+/);
    if (words.length === 3 || words.length === 6 || words.length === 9) {
      patterns.push(`Tesla_Word_Count_${words.length}`);
    }

    return {
      contains3,
      contains6,
      contains9,
      sequence369: digitString.includes('369'),
      digitalRoot3,
      digitalRoot6,
      digitalRoot9,
      patterns
    };
  }

  /**
   * Analyze prime number patterns
   */
  private static analyzePrimePatterns(charCount: number, wordCount: number): PrimeAnalysisResult {
    const patterns: string[] = [];
    const primeFactors = this.getPrimeFactors(charCount);
    
    const charCountPrime = this.isPrime(charCount);
    const wordCountPrime = this.isPrime(wordCount);

    if (charCountPrime) {
      patterns.push('Prime_Char_Count');
    }
    if (wordCountPrime) {
      patterns.push('Prime_Word_Count');
    }

    // Prime factor patterns
    if (primeFactors.length > 0) {
      patterns.push(`Prime_Factors_${primeFactors.join('_')}`);
    }

    // Special prime patterns
    if (charCount === 7 || charCount === 19 || charCount === 13) {
      patterns.push(`Sacred_Prime_${charCount}`);
    }

    // Calculate prime resonance
    let primeResonance = 0;
    if (charCountPrime) primeResonance += 0.5;
    if (wordCountPrime) primeResonance += 0.3;
    if (primeFactors.includes(7) || primeFactors.includes(19)) primeResonance += 0.2;

    return {
      charCountPrime,
      wordCountPrime,
      primeFactors,
      primeResonance: Math.min(primeResonance, 1.0),
      patterns
    };
  }

  /**
   * Analyze Fibonacci sequence patterns
   */
  private static analyzeFibonacciPatterns(input: string, charCount: number, wordCount: number): FibonacciAnalysisResult {
    const patterns: string[] = [];
    
    const fibonacciLength = this.FIBONACCI_SEQUENCE.includes(charCount);
    const fibonacciWords = this.FIBONACCI_SEQUENCE.includes(wordCount);

    if (fibonacciLength) {
      patterns.push(`Fibonacci_Length_${charCount}`);
    }
    if (fibonacciWords) {
      patterns.push(`Fibonacci_Words_${wordCount}`);
    }

    // Golden ratio detection (approximately 1.618)
    const ratio = wordCount > 0 ? charCount / wordCount : 0;
    const goldenRatio = Math.abs(ratio - 1.618) < 0.1;
    if (goldenRatio) {
      patterns.push('Golden_Ratio');
    }

    // Fibonacci sequence in digits
    const digits = input.match(/\d/g)?.map(Number) || [];
    const fibonacciSequence = this.containsFibonacciSequence(digits);
    if (fibonacciSequence) {
      patterns.push('Fibonacci_Sequence');
    }

    return {
      fibonacciLength,
      fibonacciWords,
      goldenRatio,
      fibonacciSequence,
      patterns
    };
  }

  /**
   * Get sum of digits
   */
  private static getDigitSum(n: number): number {
    return n.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
  }

  /**
   * Get digital root
   */
  private static getDigitalRoot(n: number): number {
    if (n === 0) return 0;
    return 1 + ((n - 1) % 9);
  }

  /**
   * Check if number is prime
   */
  private static isPrime(n: number): boolean {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  /**
   * Get prime factors of a number
   */
  private static getPrimeFactors(n: number): number[] {
    const factors: number[] = [];
    let remaining = n;
    
    // Factor out 2s
    while (remaining % 2 === 0) {
      factors.push(2);
      remaining /= 2;
    }
    
    // Factor out odd numbers
    for (let i = 3; i * i <= remaining; i += 2) {
      while (remaining % i === 0) {
        factors.push(i);
        remaining /= i;
      }
    }
    
    if (remaining > 2) {
      factors.push(remaining);
    }
    
    return Array.from(new Set(factors)); // Remove duplicates
  }

  /**
   * Check if array contains Fibonacci sequence
   */
  private static containsFibonacciSequence(digits: number[]): boolean {
    if (digits.length < 3) return false;
    
    for (let i = 0; i <= digits.length - 3; i++) {
      const a = digits[i];
      const b = digits[i + 1];
      const c = digits[i + 2];
      
      if (a + b === c) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Quick resonance check for performance
   */
  static quickResonanceCheck(input: string): number {
    const result = this.validate(input);
    return result.overallResonance;
  }

  /**
   * Get pattern summary
   */
  static getPatternSummary(input: string): { category: string; count: number }[] {
    const result = this.validate(input);
    
    return [
      { category: 'Seven', count: result.sevenPatterns.patterns.length },
      { category: 'Nineteen', count: result.nineteenPatterns.patterns.length },
      { category: 'Tesla', count: result.teslaPatterns.patterns.length },
      { category: 'Prime', count: result.primeAnalysis.patterns.length },
      { category: 'Fibonacci', count: result.fibonacciAnalysis.patterns.length }
    ].filter(item => item.count > 0);
  }
}
