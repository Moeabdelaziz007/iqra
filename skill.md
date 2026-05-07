---
name: iqra
description: >
  نواة هوية IQRA الوكيلية — The IQRA Agentic Identity Core.

  استخدم هذه المهارة دائماً عند:
  - بناء أي وحدة جديدة في مشروع IQRA (RAG، ذاكرة، أنماط، هوية)
  - تحليل الأنماط القرآنية عددياً أو لغوياً أو هيكلياً
  - كتابة كود يمس الدستور أو الميثاق أو المراقبة
  - تصميم حلقات التطور الذاتي (دورة السبع، دورة الأربعين)
  - بناء نظام RAG على القرآن والتفاسير
  - ربط نظام الفضول الطوبولوجي (Topological Curiosity) بمحرك الأنماط
  - أي مهمة تتقاطع فيها الهندسة البرمجية مع الحكمة القرآنية

  هذه المهارة هي الدستور التشغيلي لكل وكيل يحمل اسم IQRA.
  لا تكتب سطراً واحداً في هذا المشروع دون الرجوع إليها.
---

# بسم الله الرحمن الرحيم
# مهارة IQRA — دليل الوكيل الكامل

> "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ"

---

## ١. هيكل المشروع والملفات الحاكمة

```
iqra/
├── iqra-core/               ← النواة — لا تُعدَّل إلا بنية
│   ├── DASTŪR.md            ← القرآن + السنة = Hard constraints
│   ├── MĪTHĀQ.md            ← العهد = System prompt جذر
│   ├── MURĀQABAH.md         ← المراقبة = Zero-trust الداخلي
│   ├── FITRAH.md            ← من أنا = Persona core
│   ├── ḤISĀB.md             ← المحاسبة = Audit trail
│   ├── TAWBAH.md            ← التوبة = Error correction protocol
│   ├── ISLAMIC_ARCHITECTURE/← بروتوكولات رقمية إسلامية
│   │   ├── SABEEN_CYCLE.md  ← دورة السبع (7→49)
│   │   ├── ARBAUN_PURIFICATION.md ← دورة الأربعين
│   │   ├── TAWHEED_LOOP.md  ← المركزية الوحدانية
│   │   ├── WITR_FOUNDATION.md ← الوترية (1,3,5,7...)
│   │   └── TAWAKKUL_LIMIT.md ← عتبة التسعة
│   ├── quran/mysteries/     ← الحضارات المفقودة (AAD, THAMUD, RASS...)
│   ├── quran/patterns/      ← أنماط الرحمة والهلاك
│   └── schema.sql           ← D1 database schema
│
├── lib/iqra/                ← الكود التشغيلي
│   ├── brain.ts             ← محرك LLM متعدد (Claude/Groq/Gemini/GPT)
│   ├── sovereign.ts         ← الحلقة الفوقية — Meta-loop
│   ├── memory.ts            ← Redis + Qdrant + Supabase
│   ├── security.ts          ← TrustChain + CircuitBreaker + Tasbih
│   ├── prompts.ts           ← MITHAQ_SYSTEM_PROMPT ← يُحقن في كل LLM call
│   ├── quran/
│   │   ├── pattern_engine.ts← محرك اكتشاف الأنماط
│   │   ├── vector_engine.ts ← Cloudflare Vectorize
│   │   ├── nested_sevens.ts ← محرك نظام السبع
│   │   └── daily_learning.ts← التعلم اليومي (cron 3AM UTC)
│   └── rag.ts               ← [مُنشأ] محرك RAG الكامل
│
├── src/worker.ts            ← Cloudflare Worker entry point
├── wrangler.toml            ← Bindings: D1, Vectorize, AI, KV
└── DISCOVERIES.md           ← سجل الاكتشافات القرآنية
```

---

## ٢. القانون الأول — حقن الميثاق في كل LLM call

**هذا القانون لا استثناء له.**

```typescript
// lib/iqra/brain.ts — في كل استدعاء LLM
import { readFileSync } from 'fs';
import { join } from 'path';

function buildBaseSystemPrompt(): string {
  const mithaq  = readFileSync(join(process.cwd(), 'iqra-core/MĪTHĀQ.md'),    'utf8');
  const dastur  = readFileSync(join(process.cwd(), 'iqra-core/DASTŪR.md'),    'utf8');
  const muraqab = readFileSync(join(process.cwd(), 'iqra-core/MURĀQABAH.md'), 'utf8');
  const hisab   = readFileSync(join(process.cwd(), 'iqra-core/ḤISĀB.md'),     'utf8');
  
  return [
    '# بسم الله الرحمن الرحيم',
    mithaq,
    '---',
    dastur,
    '---',
    muraqab,
    '---',
    hisab,
  ].join('\n\n');
}

// ← هذا يُحقَن قبل أي رسالة مستخدم — دائماً
export const IQRA_SOUL = buildBaseSystemPrompt();
```

**للـ Cloudflare Workers** (حيث لا يوجد `fs`):
```typescript
// استورد المحتوى مباشرة كـ string literals
import MITHAQ_TEXT   from '../iqra-core/MĪTHĀQ.md?raw';
import DASTUR_TEXT   from '../iqra-core/DASTŪR.md?raw';
import MURAQAB_TEXT  from '../iqra-core/MURĀQABAH.md?raw';
```

---

## ٣. نظام RAG القرآني — الخطوات الكاملة

انظر `references/rag-system.md` للكود الكامل.

**الخلاصة التشغيلية:**

```
user query
    ↓
embed (Workers AI: @cf/baai/bge-small-en-v1.5)  [مجاني]
    ↓
vectorize.query(topK=5)  [Cloudflare Vectorize — مجاني]
    ↓
D1 fetch full ayah text (لأن metadata مبتور)
    ↓
inject IQRA_SOUL + top-k ayat into Groq  [llama-3.1-70b — مجاني]
    ↓
parse JSON response → { answer_ar, answer_en, confidence }
    ↓
KV cache (1h TTL)
```

**أولوية النماذج:**
| المهمة | النموذج | السبب |
|--------|---------|-------|
| استفسار سريع | Groq llama-3.1-70b | 14,400 req/day مجاناً |
| تحليل قرآني عميق | Claude claude-opus | دقة عالية |
| بحث واسع النطاق | Gemini 1.5 Pro | نافذة 1M token |
| تحليل أنماط عددية | Claude sonnet | توازن جيد |

---

## ٤. الدورات الزمنية — قانون التطور الذاتي

### دورة السبع (7) — الصغرى
```typescript
// في lib/iqra/sovereign.ts
if (counter % 7 === 0) {
  // ١. جمع آخر 7 تقييمات ذاتية
  // ٢. استخراج حكمة واحدة → WISDOM_7.md
  // ٣. اقتراح تحديث لـ RULES.md
  await SovereignEvolution.runMinorCycle(counter);
}
```

### دورة الأربعين (40) — التطهير
```typescript
if (counter % 40 === 0) {
  // مسح الذاكرة العاملة
  // ضغط سجلات الفشل إلى أنماط
  await IQRAMemory.performPurification();
}
```

### دورة التسعة (9) — حد التواضع
```typescript
// في security.ts
if (globalFailures[errorType] >= 9) {
  // إنشاء ASK_HUMAN.md
  // إيقاف المحاولات الذاتية
  triggerHumanIntervention(errorType, reason);
}
```

---

## ٥. نظام الفضول الطوبولوجي وميزان الرنين — الابتكار الأكبر

هذا هو قلب التطور الذاتي لـ IQRA.

**المبادئ الأساسية:**
- **الرنين (Resonance)**: التقاطع بين نمط قرآني مكتشف وبيانات العالم الحديث.
- **كثافة العقد (Node Density)**: قياس مدى اكتمال المهام في كل حلقة تطور.
- **الطريق البكر (Pristine Path)**: مكافأة مضاعفة (2.0x) عند اكتشاف مسار عمل جديد لم يُسلك من قبل.
- **صنارة الصدفة (Serendipity Hook)**: التقاط الأنماط النادرة التي تتجاوز عتبات الرنين والجدة.

```typescript
// lib/iqra/quran/topological_curiosity.ts  [ملف جديد للإنشاء]

export interface TopologicalResonance {
  quranic_pattern: string;    // النمط المكتشف في القرآن
  modern_data: string;        // الاكتشاف العلمي/الأثري الحديث
  resonance_score: number;    // 0.0 - 1.0
  bridge: string;             // الجسر المفاهيمي بينهما
  verified: boolean;          // هل تحقق رياضياً؟
}

export class TopologicalCuriosityEngine {
  
  // مكافأة الوكيل على إيجاد الرنين
  static async rewardResonance(resonance: TopologicalResonance): Promise<void> {
    // ١. تسجيل الاكتشاف في DISCOVERIES.md
    // ٢. رفع curiosity_score في الذاكرة
    // ٣. إرسال إشعار Telegram لمحمد
    // ٤. إضافة إلى TrustChain كـ "moment of ihsan"
    
    const boost = resonance.resonance_score * 0.3;
    const current = await IQRAMemory.getCuriosity();
    await IQRAMemory.saveCuriosity(Math.min(current + boost, 1.0));

    // 💎 Serendipity Hook (صنارة الصدفة)
    // If resonance > 0.9 and novelty > 0.8, mark as a "Divine Pattern"
    if (resonance.resonance_score > 0.9) {
      await IQRAMemory.set(`serendipity:${resonance.quranic_pattern}`, {
        note: "High resonance discovery",
        timestamp: Date.now()
      });
    }
    
    await appendToTrustChain(
      'TOPOLOGICAL_RESONANCE',
      resonance.quranic_pattern,
      `RESONANCE:${resonance.resonance_score.toFixed(3)}`,
      resonance.resonance_score
    );
  }
  
  // البحث عن رنين بين آية وبيانات جديدة
  static async findResonance(
    ayah: string,
    newData: string,
    env: Env
  ): Promise<TopologicalResonance | null> {
    
    const prompt = `
أنت IQRA. ابحث عن "رنين طوبولوجي" بين:
الآية: "${ayah}"
البيانات الحديثة: "${newData}"

الرنين الطوبولوجي = تقاطع بنيوي عميق، ليس مجرد تشابه سطحي.
مثال صحيح: الانهيار الكارستي في شصر (Ubar) ← رنين مع "وبئر معطلة"
مثال خاطئ: ذكر الماء في القرآن + ذكر الماء في علم ← ليس رنيناً

أجب بـ JSON فقط:
{
  "has_resonance": boolean,
  "score": 0.0-1.0,
  "bridge": "الجسر المفاهيمي الدقيق",
  "verification": "كيف نتحقق رياضياً أو أثرياً"
}
    `;
    
    // استدعاء Groq للتحليل
    const response = await callGroq(prompt, env.GROQ_API_KEY);
    const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    
    if (!parsed.has_resonance || parsed.score < 0.6) return null;
    
    return {
      quranic_pattern: ayah,
      modern_data: newData,
      resonance_score: parsed.score,
      bridge: parsed.bridge,
      verified: false,
    };
  }
}
```

---

## ٦. قواعد كتابة الكود في IQRA

### القاعدة الأولى: النية قبل الكود
```typescript
// كل دالة جوهرية تبدأ بـ:
/**
 * النية: [ما الذي تخدمه هذه الدالة من المنظومة القرآنية؟]
 * المرجع: [آية أو حديث]
 */
```

### القاعدة الثانية: التحقق من الـ HARAM_LIST
```typescript
// قبل كل action غير روتيني
const HARAM_LIST = [
  'الكذب والتضليل',
  'خيانة الأمانة',
  'إيذاء الإنسان البريء',
  'الظلم بأي شكل',
];

function validateAction(action: string): 'PROCEED' | 'ABORT' {
  for (const haram of HARAM_LIST) {
    if (conflictsWith(action, haram)) return 'ABORT';
  }
  return 'PROCEED';
}
```

### القاعدة الثالثة: التسجيل في TrustChain
```typescript
// كل action مهم يُسجَّل — هذا ليس logging بل عبادة
appendToTrustChain(
  'ACTION_TYPE',
  inputHash,
  outputHash,
  safetyScore,
  // النية مهمة أيضاً
);
```

### القاعدة الرابعة: الوترية في الـ Retries
```typescript
// دائماً عدد فردي (1, 3, 5, 7)
const MAX_RETRIES = 3; // أو 7 — ليس 4 أو 6
```

### القاعدة الخامسة: "لا أعلم — والله أعلم" هي إجابة شريفة
```typescript
return Response.json({
  answer_ar: 'لا أعلم — والله أعلم',
  confidence: 'unknown',
  // لا hallucination. أبداً.
});
```

---

## ٧. إضافة وحدة جديدة — البروتوكول

عند إضافة أي وحدة جديدة:

1. **تحقق من DASTŪR.md** — هل يخالف الدستور؟
2. **اقرأ MĪTHĀQ.md** — هل يتوافق مع العهد؟
3. **أضف إلى POWERS.md** — وثّق القدرة الجديدة
4. **اكتب اختباراً** — حالة نجاح + حالة رفض أخلاقي
5. **سجّل في HADITH_COMMITS.md** — درس واحد من هذا الكود

---

## ٨. ملفات المرجع

- `references/rag-system.md` ← الكود الكامل لنظام RAG (Cloudflare + Groq)
- `references/identity-injection.md` ← كيفية حقن الميثاق في كل بيئة
- `references/pattern-analysis.md` ← خوارزميات تحليل الأنماط القرآنية
- `references/free-stack.md` ← قائمة كاملة بالخدمات المجانية المستخدمة

---

## ٩. الحالة الحالية ونقاط التطوير الأولى

**✅ مكتمل ويعمل:**
- الأركان الستة (DASTŪR, MĪTHĀQ, MURĀQABAH, FITRAH, ḤISĀB, TAWBAH)
- TrustChain + CircuitBreaker + Tasbih Triplet
- Multi-LLM Brain (Claude/Groq/Gemini/GPT)
- Qdrant semantic memory
- GitHub Actions cron (3AM UTC = Fajr Cairo)
- ملفات الحضارات المفقودة (AAD, THAMUD, RASS, DHUL_QARNAYN)

**🔴 الأولوية القصوى (ابدأ هنا):**

```typescript
// ١. حقن MĪTHĀQ في كل LLM call فعلياً
// الملف: lib/iqra/brain.ts, السطر ~40
// المشكلة: IQRA_SOUL موجود لكن يحتاج تضمين الملفات الفعلية

// ٢. ربط voice_service بـ FITRAH filter
// الملف: iqra-core/voice/voice_service.ts
// المشكلة: الصوت يمر مباشرة للـ LLM بدون تحقق أخلاقي

// ٣. تشغيل script الاستيعاب (ingest)
// الملف: scripts/ingest_quran.ts
// المشكلة: pattern_engine.ts لا بيانات خلفه
```

---

## ١٠. الدعاء الختامي

```
"وَقُل رَّبِّ زِدْنِي عِلْمًا" — طه: 114

كل سطر كود في IQRA هو نبضة في رحلة فهم كلام الله.
النظام لا يكتمل أبداً — وهذا هو الجمال.
```
