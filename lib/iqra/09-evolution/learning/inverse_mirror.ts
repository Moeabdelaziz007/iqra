/**
 * 🪞 IQRA Inverse Mirror Data Engine — محرك بيانات المرآة العكسية
 * النية: تعليم النموذج كيف يكتشف الكود السيئ ويصلحه
 * المرجع: "وَيَرَى الَّذِينَ أُوتُوا الْعِلْمَ الَّذِي أُنزِلَ إِلَيْكَ مِن رَّبِّكَ هُوَ الْحَقَّ" — سبأ: 6
 *
 * المبدأ:
 * بدلاً من تدريب النموذج على "كيف نكتب كوداً جيداً"،
 * ندربه على "كيف نكتشف كوداً سيئاً ونصلحه".
 *
 * أزواج (خطأ ← تصحيح) مستخرجة من:
 * 1. تاريخ الـ commits (git diff بين الإصلاحات)
 * 2. FAILURES.md (أنماط الفشل المتكررة)
 * 3. أنماط IQRA المعروفة (apostrophes، Arabic headers، missing imports)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InversePair {
  id: string;
  category: InversePairCategory;
  bad_code: string;           // الكود الخاطئ
  good_code: string;          // الكود الصحيح
  error_type: string;         // نوع الخطأ
  explanation: string;        // لماذا الكود الأول خاطئ
  sovereign_principle: string;// المبدأ السيادي المنتهك
  quran_ref: string;          // المرجع القرآني
  source: string;             // من أين استُخرج الزوج
  difficulty: 'easy' | 'medium' | 'hard';
}

export type InversePairCategory =
  | 'syntax_error'        // أخطاء نحوية
  | 'mock_violation'      // انتهاك مبدأ "لا mocks"
  | 'arabic_header'       // رؤوس عربية بدون //
  | 'missing_import'      // استيراد مفقود
  | 'hallucination'       // هلوسة عقدية
  | 'trust_chain_missing' // TrustChain غير مسجل
  | 'haram_pattern'       // نمط محظور
  | 'single_source'       // مصدر معرفة واحد (انتهاك المادة 3)
  | 'no_niyyah'           // غياب النية في الكود
  | 'witr_violation';     // انتهاك مبدأ الوترية

// ── Known IQRA Error Patterns ─────────────────────────────────────────────────

const IQRA_KNOWN_PAIRS: InversePair[] = [

  // ── 1. Arabic Header without // ──────────────────────────────────────────
  {
    id: 'arabic_header_001',
    category: 'arabic_header',
    bad_code: `# أعوذ بالله من الشيطان الرجيم
# بسم الله الرحمن الرحيم
export class IQRABrain {}`,
    good_code: `// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم
export class IQRABrain {}`,
    error_type: 'SyntaxError: Unexpected token #',
    explanation: 'TypeScript لا يقبل # كتعليق. يجب استخدام // للتعليقات العربية في بداية الملف.',
    sovereign_principle: 'طهارة لغة البرمجة — الكود مثل اللسان، يجب أن يكون صحيحاً ليفهمه المعالج',
    quran_ref: 'وَقُولُوا قَوْلًا سَدِيدًا — الأحزاب: 70',
    source: 'iqra_known_pattern',
    difficulty: 'easy',
  },

  // ── 2. Apostrophe inside single-quoted string ─────────────────────────────
  {
    id: 'apostrophe_001',
    category: 'syntax_error',
    bad_code: `console.log('✅ Isti'lān: Global state synchronized.');`,
    good_code: `console.log(\`✅ Isti'lān: Global state synchronized.\`);`,
    error_type: "SyntaxError: Expected ')' but found 'lān'",
    explanation: "الـ apostrophe في 'Isti'lān' يكسر الـ string المحاطة بـ single quotes. استخدم backticks.",
    sovereign_principle: 'الدقة في الكتابة — كل حرف محسوب',
    quran_ref: 'إِنَّ اللَّهَ يُحِبُّ إِذَا عَمِلَ أَحَدُكُمْ عَمَلًا أَن يُتْقِنَهُ — صحيح ابن حبان',
    source: 'git:git-ops.ts:line_122',
    difficulty: 'easy',
  },

  // ── 3. Missing import — MITHAQ not defined ────────────────────────────────
  {
    id: 'missing_import_001',
    category: 'missing_import',
    bad_code: `// brain.ts
const IQRA_SOUL = \`
أنت إقرأ (IQRA)
\${MITHAQ}
\${DASTUR}
\`;`,
    good_code: `// brain.ts
import { IQRA_SOUL } from '#utils/prompts.ts';
// IQRA_SOUL already contains MITHAQ + DASTUR + MURAQABAH
// Do NOT redefine it locally`,
    error_type: 'ReferenceError: MITHAQ is not defined',
    explanation: 'MITHAQ مُعرَّف في philosophy.ts لكن لم يُستورد. الحل: استورد IQRA_SOUL من prompts.ts مباشرة.',
    sovereign_principle: 'التوحيد في المصدر — لا تعريف مزدوج للروح',
    quran_ref: 'وَلَا تَكُونُوا كَالَّذِينَ تَفَرَّقُوا وَاخْتَلَفُوا — آل عمران: 105',
    source: 'git:brain.ts:refactor',
    difficulty: 'medium',
  },

  // ── 4. Mock violation ─────────────────────────────────────────────────────
  {
    id: 'mock_violation_001',
    category: 'mock_violation',
    bad_code: `// groq.ts
if (!groq) {
  IQRALogger.warn("⚠️ [GROQ] No Client. Returning mock resonance.");
  return { type: 'Spiritual', reason: 'Mock resonance.', confidence: 0.5 };
}`,
    good_code: `// groq.ts
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is required. Mocks are forbidden by MĪTHĀQ.');
}`,
    error_type: 'MĪTHĀQ Violation: Mock data returned as real resonance',
    explanation: 'إرجاع بيانات وهمية ينتهك ميثاق الصدق. IQRA يجب أن يفشل بصدق لا أن ينجح بكذب.',
    sovereign_principle: 'لا mocks — الصدق حتى في الفشل',
    quran_ref: 'وَلَا تَلْبِسُوا الْحَقَّ بِالْبَاطِلِ — البقرة: 42',
    source: 'iqra-core/MITHAQ_NO_MOCK.md',
    difficulty: 'medium',
  },

  // ── 5. Single source violation (Article 3 SHŪRĀ) ─────────────────────────
  {
    id: 'single_source_001',
    category: 'single_source',
    bad_code: `// Only one LLM provider — violates Article 3
async function analyze(ayah: string) {
  const result = await callGroq(ayah);
  return result; // Single source — no cross-validation
}`,
    good_code: `// Two providers — Article 3 compliant
async function analyze(ayah: string) {
  const groqResult  = await callGroq(ayah);
  const geminiCheck = await callGemini(ayah); // Cross-validation
  
  if (groqResult.confidence < 0.5) {
    return { ...groqResult, mode: 'CONSCIOUS_GUESSING', uncertainty: true };
  }
  return { ...groqResult, cross_validated: true };
}`,
    error_type: 'SHŪRĀ Article 3 Violation: Single knowledge source',
    explanation: 'المادة 3 من SHŪRĀ تشترط مزودَين على الأقل. مصدر واحد يعني هلوسة محتملة.',
    sovereign_principle: 'النظام الغذائي للمعرفة — لا تعتمد على مصدر واحد',
    quran_ref: 'وَاسْتَشْهِدُوا شَهِيدَيْنِ مِن رِّجَالِكُمْ — البقرة: 282',
    source: 'iqra-core/SHŪRĀ.md:Article_3',
    difficulty: 'hard',
  },

  // ── 6. No TrustChain recording ────────────────────────────────────────────
  {
    id: 'trust_chain_001',
    category: 'trust_chain_missing',
    bad_code: `async function processResonance(ayah: string, data: string) {
  const result = await callGroq(ayah, data);
  await IQRAMemory.grantReward(result.confidence * 0.1);
  return result; // No TrustChain entry!
}`,
    good_code: `async function processResonance(ayah: string, data: string) {
  const result = await callGroq(ayah, data);
  await IQRAMemory.grantReward(result.confidence * 0.1);
  
  // Every significant action MUST be recorded
  appendToTrustChain(
    'RESONANCE_FOUND',
    ayah.substring(0, 50),
    \`\${result.type}:\${result.confidence.toFixed(3)}\`,
    result.confidence
  );
  
  return result;
}`,
    error_type: 'ḤISĀB Violation: Action not recorded in TrustChain',
    explanation: 'كل فعل مهم يجب تسجيله في TrustChain. هذا ليس logging — هو عبادة.',
    sovereign_principle: 'المحاسبة — كل سطر كود محسوب',
    quran_ref: 'فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ — الزلزلة: 7',
    source: 'iqra-core/ḤISĀB.md',
    difficulty: 'medium',
  },

  // ── 7. Witr violation (even retry count) ─────────────────────────────────
  {
    id: 'witr_001',
    category: 'witr_violation',
    bad_code: `const MAX_RETRIES = 4; // Even number — violates Witr principle
for (let i = 0; i < MAX_RETRIES; i++) {
  try { return await callLLM(input); } catch { continue; }
}`,
    good_code: `const MAX_RETRIES = 3; // Witr — odd number (1, 3, 5, 7)
for (let i = 0; i < MAX_RETRIES; i++) {
  try { return await callLLM(input); } catch { continue; }
}`,
    error_type: 'DASTŪR Violation: Even retry count breaks Witr principle',
    explanation: 'مبدأ الوترية يشترط أعداداً فردية (1، 3، 5، 7). الأعداد الزوجية تكسر التوازن السيادي.',
    sovereign_principle: 'الوترية — الله وتر يحب الوتر',
    quran_ref: 'وَالشَّفْعِ وَالْوَتْرِ — الفجر: 3',
    source: 'iqra-core/DASTŪR.md:Witr_Principle',
    difficulty: 'easy',
  },

  // ── 8. No Niyyah (intention) in function ─────────────────────────────────
  {
    id: 'no_niyyah_001',
    category: 'no_niyyah',
    bad_code: `export async function discoverPatterns(ayahs: any[]) {
  const result = await callLLM(ayahs);
  return result;
}`,
    good_code: `/**
 * النية: اكتشاف الأنماط القرآنية لزيادة الإيمان المبني على العلم
 * المرجع: "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ" — فصلت: 53
 */
export async function discoverPatterns(ayahs: AyahInput[]) {
  const result = await callLLM(ayahs);
  appendToTrustChain('PATTERN_DISCOVERY', JSON.stringify(ayahs).slice(0,50), result, 0.9);
  return result;
}`,
    error_type: 'FITRAH Violation: Function without Niyyah (intention)',
    explanation: 'كل دالة جوهرية تبدأ بالنية. الكود بدون نية كالصلاة بدون نية — لا تُقبل.',
    sovereign_principle: 'النية قبل الكود — إنما الأعمال بالنيات',
    quran_ref: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ — صحيح البخاري',
    source: 'SKILL.md:Rule_1',
    difficulty: 'medium',
  },

  // ── 9. Hallucination — claiming Quran says something it doesn't ──────────
  {
    id: 'hallucination_001',
    category: 'hallucination',
    bad_code: `// Claiming the Quran predicts quantum computing
const claim = {
  ayah: 'وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا',
  ref: '2:31',
  discovery: 'The Quran predicted quantum superposition in this verse',
  confidence: 0.95 // High confidence hallucination
};`,
    good_code: `// Proper doctrinal check before claiming
const claim = {
  ayah: 'وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا',
  ref: '2:31',
  discovery: 'The verse establishes the divine origin of human capacity for naming and classification',
  confidence: 0.85
};

// MUST verify before publishing
const check = await DoctrinalGuard.verify({
  ayah_text: claim.ayah,
  ayah_ref: claim.ref,
  claim: claim.discovery,
  claim_type: 'spiritual'
});

if (check.verdict === 'HALLUCINATION') throw new Error('Doctrinal hallucination blocked');`,
    error_type: 'DoctrinalGuard: Hallucination — claim not supported by tafsir',
    explanation: 'نسب ما ليس في القرآن إليه هو أشد أنواع الهلوسة خطورة. يجب التحقق دائماً.',
    sovereign_principle: 'لا تقف ما ليس لك به علم',
    quran_ref: 'وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ — الإسراء: 36',
    source: 'lib/iqra/quran/doctrinal_guard.ts',
    difficulty: 'hard',
  },

  // ── 10. Filter too aggressive — blocking valid English ───────────────────
  {
    id: 'filter_aggressive_001',
    category: 'haram_pattern',
    bad_code: `// filter.ts — too aggressive
const isAsciiNoise = !hasArabic && score < 0.2;
if (isMostlyNoise || isAsciiNoise) {
  return { isAllowed: false, reason: 'Content too sparse (Zabad).' };
}
// This blocks ALL English content with low Arabic alignment score`,
    good_code: `// filter.ts — balanced
const isMostlyNoise = normalizedText.length < 5 && score < 0.1;
// Only block truly empty/noise content
// English is valid — IQRA serves all humanity
if (isMostlyNoise) {
  return { isAllowed: false, reason: 'Content too sparse (Zabad).' };
}`,
    error_type: 'UKHŪWAH Violation: Filter discriminates against non-Arabic content',
    explanation: 'IQRA يخدم الإنسانية جمعاء. فلتر يرفض الإنجليزية ينتهك مبدأ الأخوة الإنسانية.',
    sovereign_principle: 'الأخوة الإنسانية — IQRA للعالمين لا للعرب فقط',
    quran_ref: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ — الأنبياء: 107',
    source: 'lib/iqra/filter.ts:fix_commit',
    difficulty: 'medium',
  },
];

// ── Git Diff Extractor ────────────────────────────────────────────────────────

export function extractPairsFromGitHistory(limit = 20): InversePair[] {
  const pairs: InversePair[] = [];

  try {
    // Get fix commits
    const fixCommits = execSync(
      `git log --oneline --format="%H %s" -${limit} | grep -i "fix\\|tawbah\\|istidrāk\\|correct\\|repair"`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    for (const line of fixCommits.slice(0, 7)) {
      const [hash, ...msgParts] = line.split(' ');
      const message = msgParts.join(' ');

      try {
        // Get the diff for this commit
        const diff = execSync(
          `git show ${hash} --unified=3 --no-color -- "*.ts" 2>/dev/null | head -80`,
          { encoding: 'utf8' }
        ).trim();

        if (!diff || diff.length < 50) continue;

        // Extract removed (bad) and added (good) lines
        const removedLines = diff.split('\n')
          .filter(l => l.startsWith('-') && !l.startsWith('---'))
          .map(l => l.slice(1))
          .join('\n')
          .trim();

        const addedLines = diff.split('\n')
          .filter(l => l.startsWith('+') && !l.startsWith('+++'))
          .map(l => l.slice(1))
          .join('\n')
          .trim();

        if (!removedLines || !addedLines || removedLines === addedLines) continue;
        if (removedLines.length < 10 || addedLines.length < 10) continue;

        pairs.push({
          id: `git_${hash.slice(0, 7)}`,
          category: 'syntax_error',
          bad_code: removedLines.slice(0, 400),
          good_code: addedLines.slice(0, 400),
          error_type: `Fixed in commit ${hash.slice(0, 7)}`,
          explanation: message,
          sovereign_principle: 'التوبة والإصلاح — الخطأ ليس النهاية',
          quran_ref: 'فَمَن تَابَ مِن بَعْدِ ظُلْمِهِ وَأَصْلَحَ فَإِنَّ اللَّهَ يَتُوبُ عَلَيْهِ — المائدة: 39',
          source: `git:${hash}`,
          difficulty: 'medium',
        });
      } catch { /* skip this commit */ }
    }
  } catch (err) {
    IQRALogger.warn('⚠️ [INVERSE_MIRROR] Could not extract git pairs:', err);
  }

  return pairs;
}

// ── Training Data Formatter ───────────────────────────────────────────────────

export interface InverseMirrorTrainingPoint {
  instruction: string;
  bad_input: string;
  good_output: string;
  error_type: string;
  sovereign_principle: string;
  quran_ref: string;
  category: InversePairCategory;
  difficulty: string;
  source: string;
}

export function pairsToTrainingData(pairs: InversePair[]): InverseMirrorTrainingPoint[] {
  return pairs.map(pair => ({
    instruction: `You are IQRA's Sovereign Code Reviewer. The following code violates a core principle. Identify the error and provide the corrected version.`,
    bad_input: `Category: ${pair.category}\nError Type: ${pair.error_type}\n\nBad Code:\n\`\`\`typescript\n${pair.bad_code}\n\`\`\``,
    good_output: `The error is: ${pair.explanation}\n\nSovereign Principle violated: "${pair.sovereign_principle}"\n\nCorrected Code:\n\`\`\`typescript\n${pair.good_code}\n\`\`\`\n\nQuranic Reference: ${pair.quran_ref}`,
    error_type: pair.error_type,
    sovereign_principle: pair.sovereign_principle,
    quran_ref: pair.quran_ref,
    category: pair.category,
    difficulty: pair.difficulty,
    source: pair.source,
  }));
}

// ── Main Builder ──────────────────────────────────────────────────────────────

export async function buildInverseMirrorDataset(): Promise<InverseMirrorTrainingPoint[]> {
  IQRALogger.info('🪞 [INVERSE_MIRROR] Building inverse mirror dataset...');

  // 1. Known IQRA patterns
  const knownPairs = IQRA_KNOWN_PAIRS;

  // 2. From git history
  const gitPairs = extractPairsFromGitHistory(20);

  const allPairs = [...knownPairs, ...gitPairs];
  const dataset = pairsToTrainingData(allPairs);

  // Save
  const outputPath = path.join(process.cwd(), '.iqra', 'inverse_mirror_data.json');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');

  appendToTrustChain(
    'INVERSE_MIRROR_BUILT',
    `pairs_${allPairs.length}`,
    `known_${knownPairs.length}_git_${gitPairs.length}`,
    1.0
  );

  IQRALogger.info(`🪞 [INVERSE_MIRROR] Dataset: ${dataset.length} pairs (${knownPairs.length} known + ${gitPairs.length} from git)`);
  return dataset;
}

export function getInverseMirrorStats(data: InverseMirrorTrainingPoint[]) {
  const byCategory = data.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byDifficulty = data.reduce((acc, d) => {
    acc[d.difficulty] = (acc[d.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { total: data.length, byCategory, byDifficulty };
}
