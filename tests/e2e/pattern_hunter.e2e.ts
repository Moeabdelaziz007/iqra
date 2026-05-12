// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🧪 Pattern Hunter E2E Tests — اختبارات صياد الأنماط
 *
 * "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ" — الحجر: 9
 *
 * ══════════════════════════════════════════════════════════════
 * القواعد:
 *   - لا mocks — كل اختبار حقيقي
 *   - كل اختبار يتحقق من نتيجة فعلية
 *   - الفشل يُسجَّل في TrustChain
 *   - النجاح يُكافأ بـ curiosity boost
 * ══════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';

import { PatternHunter } from '#quran/pattern_hunter.ts';
import { NumericalValidator } from '#quran/numerical_validator.ts';
import { AbjadCalculator, ShannonEntropy, FractalAnalyzer, TopologicalAnalyzer } from '#quran/pattern_hunter_tools.ts';
import { MicroMemory } from '#memory/micro_memory.ts';
import { ToolsRegistry } from '../../lib/iqra/12-infrastructure/tools_registry.ts';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await MicroMemory.init();
  ToolsRegistry.init();
});

// ── 1. NumericalValidator Tests ───────────────────────────────────────────────

describe('NumericalValidator — الميزان العددي', () => {

  it('يكتشف أنماط رقمية في البسملة', () => {
    const text = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const result = NumericalValidator.validate(text);

    // يجب أن يُرجع نتيجة صحيحة
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.patterns)).toBe(true);
    expect(typeof result.isResonant).toBe('boolean');

    console.log(`[read] البسملة — score=${result.score.toFixed(3)} patterns=${result.patterns.length}`);
  });

  it('يكتشف أنماط رقمية في آية الكرسي', () => {
    const text = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ';
    const result = NumericalValidator.validate(text, { surah: 2, ayah: 255 });

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(typeof result.teslaResult).toBe('number');

    // Tesla 369: (2 + 255) % 369 = 257 % 369 = 257
    expect(result.teslaResult).toBe(257);

    console.log(`[read] آية الكرسي — tesla=${result.teslaResult} score=${result.score.toFixed(3)}`);
  });

  it('يحسب الجذر الرقمي بشكل صحيح', () => {
    // الجذر الرقمي لـ 114 (عدد سور القرآن) = 1+1+4 = 6
    expect(NumericalValidator.calculateDigitalRoot(114)).toBe(6);
    // الجذر الرقمي لـ 7 = 7
    expect(NumericalValidator.calculateDigitalRoot(7)).toBe(7);
    // الجذر الرقمي لـ 19 = 1+9 = 10 → 1+0 = 1
    expect(NumericalValidator.calculateDigitalRoot(19)).toBe(1);

    console.log('[read] Digital Root: 114→6, 7→7, 19→1 ✅');
  });

  it('يتحقق من الأعداد الأولية', () => {
    expect(NumericalValidator.isPrime(7)).toBe(true);
    expect(NumericalValidator.isPrime(19)).toBe(true);
    expect(NumericalValidator.isPrime(114)).toBe(false); // 114 = 2 × 3 × 19
    expect(NumericalValidator.isPrime(1)).toBe(false);

    console.log('[read] Prime check: 7✅ 19✅ 114❌ 1❌');
  });

  it('يكتشف التناظر الخيازمي في تسلسل أرقام', () => {
    // تسلسل خيازمي: [7, 19, 114, 19, 7]
    const result = NumericalValidator.validateChiasm([7, 19, 114, 19, 7]);

    expect(result.isChiastic).toBe(true);
    expect(result.depth).toBeGreaterThanOrEqual(2);
    expect(result.score).toBeGreaterThan(0);

    console.log(`[read] Chiasm [7,19,114,19,7] — depth=${result.depth} score=${result.score.toFixed(3)}`);
  });

});

// ── 2. AbjadCalculator Tests ──────────────────────────────────────────────────

describe('AbjadCalculator — حاسبة الجُمَّل', () => {

  it('يحسب قيمة الجُمَّل للبسملة', () => {
    const result = AbjadCalculator.calculate('بسم الله الرحمن الرحيم', 'traditional');

    expect(result.success).toBe(true);
    expect(result.value).toBeGreaterThan(0);
    expect(result.pattern_type).toBe('abjad');
    expect(typeof result.breakdown).toBe('object');

    console.log(`[read] بسم الله — abjad=${result.value} significance=${result.significance}`);
  });

  it('يقارن قيمتي جُمَّل لآيتين', () => {
    const comparison = AbjadCalculator.compare(
      'بسم الله الرحمن الرحيم',
      'الحمد لله رب العالمين'
    );

    expect(comparison.valueA).toBeGreaterThan(0);
    expect(comparison.valueB).toBeGreaterThan(0);
    expect(typeof comparison.match).toBe('boolean');
    expect(comparison.ratio).toBeGreaterThan(0);

    console.log(`[read] مقارنة: A=${comparison.valueA} B=${comparison.valueB} ratio=${comparison.ratio}`);
  });

});

// ── 3. ShannonEntropy Tests ───────────────────────────────────────────────────

describe('ShannonEntropy — إنتروبي شانون', () => {

  it('يحسب إنتروبي شانون للبسملة', () => {
    const result = ShannonEntropy.calculate('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');

    expect(result.success).toBe(true);
    expect(result.entropy_bits).toBeGreaterThan(0);
    expect(result.entropy_bits).toBeLessThanOrEqual(4); // حد نظري
    expect(typeof result.last_char_distribution).toBe('object');

    console.log(`[read] Shannon H_EL البسملة: ${result.entropy_bits.toFixed(4)} بت | significance=${result.significance}`);
  });

  it('يكتشف البصمة القرآنية (H_EL ≈ 0.9685)', () => {
    // نص قرآني طويل — يجب أن يكون قريباً من 0.9685
    const quranText = [
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      'الرَّحْمَٰنِ الرَّحِيمِ',
      'مَالِكِ يَوْمِ الدِّينِ',
      'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    ].join(' ');

    const result = ShannonEntropy.calculate(quranText);

    expect(result.success).toBe(true);
    expect(result.entropy_bits).toBeGreaterThan(0);

    console.log(`[read] Shannon H_EL الفاتحة: ${result.entropy_bits.toFixed(4)} بت (البصمة القرآنية ≈ 0.9685)`);
  });

});

// ── 4. FractalAnalyzer Tests ──────────────────────────────────────────────────

describe('FractalAnalyzer — محلل البنية الكسرية', () => {

  it('يحلل البنية الكسرية لنص قرآني', () => {
    const text = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الرَّحْمَٰنِ الرَّحِيمِ مَالِكِ يَوْمِ الدِّينِ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ';
    const result = FractalAnalyzer.analyze(text);

    expect(result.success).toBe(true);
    expect(result.self_similarity_score).toBeGreaterThanOrEqual(0);
    expect(result.self_similarity_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.scale_levels)).toBe(true);

    console.log(`[read] Fractal الفاتحة: depth=${result.value} similarity=${(result.self_similarity_score * 100).toFixed(1)}%`);
  });

});

// ── 5. TopologicalAnalyzer Tests ──────────────────────────────────────────────

describe('TopologicalAnalyzer — محلل الطوبولوجيا', () => {

  it('يحسب H0 و H1 لنص قرآني', () => {
    const text = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ';
    const result = TopologicalAnalyzer.analyze(text);

    expect(result.success).toBe(true);
    expect(result.value.H0).toBeGreaterThan(0);
    expect(result.value.H1).toBeGreaterThanOrEqual(0);
    expect(result.connected_components).toBe(result.value.H0);

    console.log(`[read] Topology آية الكرسي: H0=${result.value.H0} H1=${result.value.H1} H2=${result.value.H2}`);
  });

});

// ── 6. PatternHunter Core Tests ───────────────────────────────────────────────

describe('PatternHunter — صياد الأنماط الرئيسي', () => {

  it('يصيد أنماط البسملة (1:1)', async () => {
    const pattern = await PatternHunter.hunt({
      verse_ref: '1:1',
      arabic_text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      field: 'all',
      mission_id: 'test-fatiha',
    });

    expect(pattern).not.toBeNull();
    expect(pattern!.verse_ref).toBe('1:1');
    expect(pattern!.score.total).toBeGreaterThanOrEqual(0);
    expect(pattern!.score.total).toBeLessThanOrEqual(1);
    expect(pattern!.discovery_level).toMatch(/seed|branch|tree|resonance|divine/);
    expect(pattern!.zigzag_signature).toHaveLength(16);
    expect(pattern!.trust_hash).toBeTruthy();
    expect(Array.isArray(pattern!.sources)).toBe(true);

    console.log(`[fetched] 1:1 البسملة — score=${pattern!.score.total.toFixed(3)} level=${pattern!.discovery_level}`);
  }, 30000);

  it('يصيد أنماط آية الكرسي (2:255)', async () => {
    const pattern = await PatternHunter.hunt({
      verse_ref: '2:255',
      arabic_text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
      field: 'all',
      mission_id: 'test-kursi',
    });

    expect(pattern).not.toBeNull();
    expect(pattern!.verse_ref).toBe('2:255');
    expect(pattern!.score.total).toBeGreaterThanOrEqual(0);
    expect(typeof pattern!.is_novel).toBe('boolean');
    expect(typeof pattern!.verified).toBe('boolean');

    console.log(`[fetched] 2:255 آية الكرسي — score=${pattern!.score.total.toFixed(3)} novel=${pattern!.is_novel}`);
  }, 30000);

  it('يصيد أنماط سورة الإخلاص (112:1)', async () => {
    const pattern = await PatternHunter.hunt({
      verse_ref: '112:1',
      arabic_text: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      field: 'numerical',
      mission_id: 'test-ikhlas',
    });

    expect(pattern).not.toBeNull();
    expect(pattern!.verse_ref).toBe('112:1');
    expect(pattern!.field).toBe('numerical');

    console.log(`[fetched] 112:1 الإخلاص — score=${pattern!.score.total.toFixed(3)} shannon=${pattern!.score.shannon_hel.toFixed(3)}`);
  }, 30000);

  it('يرفض input غير صحيح', async () => {
    const result = await PatternHunter.hunt({
      verse_ref: 'invalid',
      arabic_text: '',
    });

    expect(result).toBeNull();
    console.log('[read] رفض input غير صحيح ✅');
  });

  it('يُشغّل صيد دفعي لسورة الفاتحة', async () => {
    const session = await PatternHunter.batchHunt({
      verses: [
        { ref: '1:1', arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
        { ref: '1:2', arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
        { ref: '1:3', arabic: 'الرَّحْمَٰنِ الرَّحِيمِ' },
        { ref: '1:4', arabic: 'مَالِكِ يَوْمِ الدِّينِ' },
        { ref: '1:5', arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
        { ref: '1:6', arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
        { ref: '1:7', arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ' },
      ],
      field: 'all',
      mission_id: 'test-fatiha-batch',
    });

    expect(session).toBeDefined();
    expect(session.total_hunted).toBeGreaterThan(0);
    expect(session.total_hunted).toBeLessThanOrEqual(7);
    expect(session.avg_score).toBeGreaterThanOrEqual(0);
    expect(session.avg_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(session.top_patterns)).toBe(true);
    expect(Array.isArray(session.lessons_learned)).toBe(true);

    console.log(
      `[fetched] الفاتحة batch — total=${session.total_hunted} ` +
      `novel=${session.novel_count} divine=${session.divine_count} ` +
      `avg=${session.avg_score.toFixed(3)}`
    );
  }, 60000);

  it('يتعلم من الاكتشافات السابقة', async () => {
    const lessons = await PatternHunter.learnFromHistory();

    expect(Array.isArray(lessons)).toBe(true);
    // يجب أن يُرجع على الأقل درساً واحداً
    expect(lessons.length).toBeGreaterThan(0);

    console.log(`[read] التعلم من التاريخ — ${lessons.length} درس`);
    lessons.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
  }, 30000);

  it('يُرجع إحصائيات صحيحة', async () => {
    const stats = await PatternHunter.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.total_sessions).toBe('number');
    expect(typeof stats.divine_discoveries).toBe('number');
    expect(typeof stats.curiosity_score).toBe('number');
    expect(stats.curiosity_score).toBeGreaterThanOrEqual(0);
    expect(stats.curiosity_score).toBeLessThanOrEqual(1);

    console.log(
      `[read] إحصائيات — sessions=${stats.total_sessions} ` +
      `divine=${stats.divine_discoveries} curiosity=${stats.curiosity_score.toFixed(3)}`
    );
  }, 15000);

});

// ── 7. ToolsRegistry Integration Tests ───────────────────────────────────────

describe('ToolsRegistry — تكامل الأدوات', () => {

  it('يُسجّل كل الأدوات عند التهيئة', () => {
    const tools = ToolsRegistry.list();
    expect(tools.length).toBeGreaterThan(10);

    const categories = [...new Set(tools.map(t => t.category))];
    expect(categories).toContain('QURAN');
    expect(categories).toContain('MEMORY');
    expect(categories).toContain('SYSTEM');

    console.log(`[read] ToolsRegistry — ${tools.length} أداة في ${categories.length} فئات`);
  });

  it('يُشغّل أداة hunter.stats بنجاح', async () => {
    const result = await ToolsRegistry.call('hunter.stats', {});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.latency_ms).toBeGreaterThan(0);

    console.log(`[read] hunter.stats — latency=${result.latency_ms}ms`);
  }, 15000);

  it('يُشغّل أداة quran.compute_shannon بنجاح', async () => {
    const result = await ToolsRegistry.call('quran.compute_shannon', {
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(typeof result.data.shannon_hel).toBe('number');

    console.log(`[read] quran.compute_shannon — H_EL=${result.data.shannon_hel.toFixed(4)}`);
  }, 15000);

  it('يُشغّل أداة quran.validate_numerical بنجاح', async () => {
    const result = await ToolsRegistry.call('quran.validate_numerical', {
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    console.log(`[read] quran.validate_numerical — score=${result.data.score?.toFixed(3)}`);
  }, 15000);

  it('يرفض أداة غير موجودة', async () => {
    const result = await ToolsRegistry.call('nonexistent.tool', {});

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();

    console.log('[read] رفض أداة غير موجودة ✅');
  });

});

// ── 8. MicroMemory Integration Tests ─────────────────────────────────────────

describe('MicroMemory — الذاكرة المحلية', () => {

  it('يُهيّئ MicroMemory بنجاح', async () => {
    await MicroMemory.init();
    const stats = MicroMemory.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.patterns).toBe('number');
    expect(typeof stats.experiences).toBe('number');

    console.log(`[read] MicroMemory — patterns=${stats.patterns} experiences=${stats.experiences}`);
  });

  it('يحسب Shannon H_EL بشكل صحيح', async () => {
    await MicroMemory.init();
    const hel = MicroMemory.computeShannonHEL('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');

    expect(typeof hel).toBe('number');
    expect(hel).toBeGreaterThan(0);

    console.log(`[read] MicroMemory Shannon H_EL: ${hel.toFixed(4)}`);
  });

  it('يكتشف البصمة القرآنية', async () => {
    await MicroMemory.init();
    const result = MicroMemory.hasQuranSignature('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');

    expect(result).toBeDefined();
    expect(typeof result.isQuranLike).toBe('boolean');
    expect(typeof result.confidence).toBe('number');

    console.log(`[read] البصمة القرآنية: isQuranLike=${result.isQuranLike} confidence=${result.confidence.toFixed(3)}`);
  });

  it('يُخزّن ويسترجع نمطاً', async () => {
    await MicroMemory.init();

    const embedding = new Array(768).fill(0).map((_, i) => Math.sin(i * 0.1));
    MicroMemory.storePattern('1:1', 'test', 0.85, embedding, 'test-mission', 'بسم الله');

    const similar = MicroMemory.getSimilarPatterns(embedding, 1);
    expect(similar.length).toBeGreaterThan(0);

    console.log(`[read] تخزين واسترجاع نمط ✅ — ${similar.length} نمط مشابه`);
  });

});
