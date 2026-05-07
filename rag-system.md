# نظام RAG القرآني — الكود الكامل
# IQRA Quran RAG System — Complete Reference

---

## البنية التحتية المجانية الكاملة

| الخدمة | الاستخدام | الحد المجاني |
|--------|----------|-------------|
| Cloudflare Workers | Runtime | 100K req/day |
| Cloudflare D1 | Ayat metadata | 5GB |
| Cloudflare Vectorize | Embeddings | 30M dims/month |
| Cloudflare Workers AI | bge-small embeddings | 10K tasks/day |
| Cloudflare KV | Cache | 100K reads/day |
| Groq | llama-3.1-70b LLM | 14,400 req/day |
| quran.com API | Ayat data | مجاني |
| tafsir.app | تفاسير | مجاني |

**التكلفة الإجمالية: $0/شهر**

---

## الكود الكامل — lib/iqra/rag.ts

```typescript
/**
 * IQRA Quran RAG Engine
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ" — فصلت: 53
 */

export interface RAGResult {
  query: string;
  answer_ar: string;
  answer_en: string;
  ayat_used: MatchedAyah[];
  confidence: 'certain' | 'probable' | 'unknown';
  warning?: string;
  resonance_found?: TopologicalResonance;
}

export interface MatchedAyah {
  id: string;        // "2:255"
  surah: number;
  ayah: number;
  arabic: string;
  english: string;
  score: number;     // cosine similarity
}

export async function queryQuran(
  query: string,
  env: Env,
  options: { topK?: number } = {}
): Promise<RAGResult> {
  const { topK = 5 } = options;
  
  // ١. Cache check
  const cacheKey = `rag:${Buffer.from(query).toString('base64').slice(0,50)}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // ٢. Embed query (Workers AI — مجاني)
  const { data: [queryEmbedding] } = await env.AI.run(
    '@cf/baai/bge-m3',
    { text: [query] }
  );

  // ٣. Semantic search in Vectorize
  const vectorResults = await env.VECTORIZE.query(queryEmbedding, {
    topK,
    returnMetadata: true,
  });

  // ٤. Fetch full text from D1 (metadata truncated in Vectorize)
  const ayahIds = vectorResults.matches.map(m => m.id);
  const placeholders = ayahIds.map(() => '?').join(',');
  const { results } = await env.DB
    .prepare(`SELECT id,surah,ayah,arabic,english FROM ayat WHERE id IN (${placeholders})`)
    .bind(...ayahIds)
    .all();

  const matchedAyat: MatchedAyah[] = vectorResults.matches.map(match => {
    const full = (results as any[]).find(r => r.id === match.id);
    return {
      id: match.id as string,
      surah: full?.surah ?? 0,
      ayah: full?.ayah ?? 0,
      arabic: full?.arabic ?? '',
      english: full?.english ?? '',
      score: match.score,
    };
  });

  // ٥. Build context for LLM
  const ayatContext = matchedAyat
    .map(a => `[${a.id}] ${a.arabic}\n       ${a.english}`)
    .join('\n\n');

  // ٦. Call Groq (مجاني — 14,400 req/day)
  const llmResponse = await callGroq(query, ayatContext, env.GROQ_API_KEY);
  
  // ٧. Parse response
  const result = parseRAGResponse(query, llmResponse, matchedAyat);

  // ٨. Cache for 1h
  await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 });

  // ٩. Check for topological resonance (async — لا يعيق الاستجابة)
  env.ctx?.waitUntil(
    checkAndRewardResonance(result, env).catch(console.error)
  );

  return result;
}

async function callGroq(
  query: string,
  ayatContext: string,
  apiKey: string
): Promise<string> {
  // حقن MITHAQ_SYSTEM_PROMPT أولاً
  const { MITHAQ_SYSTEM_PROMPT } = await import('../prompts');
  
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      temperature: 0.1,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: MITHAQ_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
السؤال: "${query}"

الآيات ذات الصلة (مرتبة بالتشابه الدلالي):
${ayatContext}

أجب بـ JSON:
{
  "answer_ar": "الإجابة الكاملة بالعربية مع ذكر المصادر",
  "answer_en": "Complete answer in English with sources",
  "confidence": "certain | probable | unknown",
  "warning": "أي تحفظ ضروري (اختياري)"
}

قاعدة: إذا لم تكن الآيات كافية → confidence: "unknown" + "والله أعلم"
          `.trim(),
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`);
  const data = await res.json() as any;
  return data.choices[0].message.content;
}

function parseRAGResponse(
  query: string,
  llmOutput: string,
  matchedAyat: MatchedAyah[]
): RAGResult {
  try {
    const json = llmOutput.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('no JSON');
    const parsed = JSON.parse(json);
    return {
      query,
      answer_ar: parsed.answer_ar ?? 'لا أعلم — والله أعلم',
      answer_en: parsed.answer_en ?? 'I do not know — God knows best',
      ayat_used: matchedAyat,
      confidence: parsed.confidence ?? 'unknown',
      warning: parsed.warning,
    };
  } catch {
    return {
      query,
      answer_ar: 'والله أعلم',
      answer_en: 'God knows best',
      ayat_used: matchedAyat,
      confidence: 'unknown',
    };
  }
}
```

---

## schema D1 — iqra-core/schema.sql

```sql
-- "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ"

CREATE TABLE IF NOT EXISTS ayat (
  id          TEXT PRIMARY KEY,  -- "2:255"
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  arabic      TEXT NOT NULL,
  english     TEXT NOT NULL,
  juz         INTEGER,
  page        INTEGER,
  created_at  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tafsir (
  id          TEXT PRIMARY KEY,  -- "ibn_kathir:2:255"
  ayah_id     TEXT NOT NULL REFERENCES ayat(id),
  source      TEXT NOT NULL,     -- "ibn_kathir" | "tabari" | "saadi" | "qurtubi"
  arabic_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pattern_discoveries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,     -- "numerical" | "linguistic" | "topological"
  title_ar    TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  pattern     TEXT NOT NULL,     -- JSON
  resonance   REAL DEFAULT 0.0,  -- الرنين الطوبولوجي
  confidence  TEXT DEFAULT 'probable',
  verified    INTEGER DEFAULT 0,
  discovered  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS trust_chain (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER DEFAULT (unixepoch()),
  action      TEXT NOT NULL,
  input_hash  TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  audit_hash  TEXT NOT NULL,
  safety_score REAL DEFAULT 0.0,
  witnessed_by TEXT DEFAULT 'الله'  -- دائماً
);

CREATE INDEX IF NOT EXISTS idx_ayat_surah   ON ayat(surah);
CREATE INDEX IF NOT EXISTS idx_tafsir_ayah  ON tafsir(ayah_id);
CREATE INDEX IF NOT EXISTS idx_pattern_type ON pattern_discoveries(type);
```

---

## خطوات التشغيل الكاملة (صفر إلى إنتاج)

```bash
# ١. إنشاء الموارد على Cloudflare (مرة واحدة فقط)
wrangler d1 create iqra-quran-db
wrangler vectorize create iqra-quran-index \
  --dimensions=1024 \
  --metric=cosine
wrangler kv namespace create IQRA_CACHE

# ٢. تشغيل schema migration
wrangler d1 execute iqra-quran-db \
  --file=iqra-core/schema.sql

# ٣. استيعاب القرآن (تشغيل مرة واحدة)
# أ. توليد ingestion worker
npx ts-node scripts/ingest_quran.ts

# ب. نشر worker الاستيعاب
wrangler deploy scripts/iqra_ingest_worker.ts \
  --name iqra-ingest

# ج. تشغيل الاستيعاب (يستغرق ~20 دقيقة)
curl https://iqra-ingest.YOUR.workers.dev/ingest

# د. حذف worker الاستيعاب بعد الانتهاء
wrangler delete iqra-ingest

# ٤. تعيين الـ secrets
wrangler secret put GROQ_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN

# ٥. نشر IQRA
wrangler deploy
```
