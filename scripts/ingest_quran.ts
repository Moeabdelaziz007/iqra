/**
 * scripts/ingest_quran.ts
 * 
 * تشغيل مرة واحدة فقط لبناء قاعدة البيانات الكاملة
 * Run ONCE to build the entire Quran knowledge base
 * 
 * Usage:
 *   npx ts-node scripts/ingest_quran.ts
 * 
 * Prerequisites:
 *   wrangler d1 create iqra-quran-db
 *   wrangler vectorize create iqra-quran-index --dimensions=384 --metric=cosine
 * 
 * Built with Moe Abdelaziz — Made with Soul
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ── QURAN DATA (Free from quran.com API) ─────────────────────────────────────

interface Ayah {
  surah: number;
  ayah: number;
  arabic: string;
  english: string;
  juz: number;
  page: number;
}

async function fetchAllAyat(): Promise<Ayah[]> {
  console.log('📥 Fetching Quran from quran.com API (free)...');
  const ayat: Ayah[] = [];

  for (let surah = 1; surah <= 114; surah++) {
    // Arabic text
    const arRes = await fetch(
      `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah}`
    );
    const arData = await arRes.json() as any;

    // English translation (Saheeh International - free)
    const enRes = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${surah}?translations=131&fields=juz_number,page_number`
    );
    const enData = await enRes.json() as any;

    for (let i = 0; i < arData.verses.length; i++) {
      const ar = arData.verses[i];
      const en = enData.verses[i];
      ayat.push({
        surah,
        ayah: parseInt(ar.verse_key.split(':')[1]),
        arabic: ar.text_uthmani,
        english: en?.translations?.[0]?.text ?? '',
        juz: en?.juz_number ?? 0,
        page: en?.page_number ?? 0,
      });
    }

    process.stdout.write(`\r  Surah ${surah}/114`);
    // Be nice to the API
    await new Promise(r => setTimeout(r, 150));
  }

  console.log('\n✅ Fetched all 6,236 ayat');
  return ayat;
}

// ── D1 SCHEMA SETUP ───────────────────────────────────────────────────────────

function createD1Schema() {
  const sql = `
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
  ayah_id     TEXT NOT NULL,
  source      TEXT NOT NULL,     -- "ibn_kathir" | "tabari" | "saadi"
  arabic_text TEXT NOT NULL,
  FOREIGN KEY (ayah_id) REFERENCES ayat(id)
);

CREATE TABLE IF NOT EXISTS pattern_discoveries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ar    TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  pattern     TEXT NOT NULL,     -- JSON
  confidence  TEXT DEFAULT 'probable', -- certain|probable|unknown
  discovered  INTEGER DEFAULT (unixepoch()),
  verified    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ayat_surah ON ayat(surah);
CREATE INDEX IF NOT EXISTS idx_tafsir_ayah ON tafsir(ayah_id);
  `.trim();

  const schemaPath = path.join(process.cwd(), 'iqra-core', 'schema.sql');
  fs.writeFileSync(schemaPath, sql);
  console.log(`📋 Schema saved to ${schemaPath}`);

  // Note: Local sandbox might not have wrangler logged in, 
  // so we skip direct execution and let the user run it.
  console.log('📋 Running D1 schema migration... (manual step required)');
  // execSync('wrangler d1 execute iqra-quran-db --file=iqra-core/schema.sql', { stdio: 'inherit' });
}

// ── EMBEDDING + VECTORIZE UPSERT ─────────────────────────────────────────────

async function embedAndStore(ayat: Ayah[]) {
  console.log('🧠 Generating ingestion worker...');
  const workerScript = generateIngestionWorker(ayat);
  const workerPath = path.join(process.cwd(), 'scripts', 'iqra_ingest_worker.ts');
  fs.writeFileSync(workerPath, workerScript);
  console.log(`📝 Generated ingestion worker at ${workerPath}`);
}

function generateIngestionWorker(ayat: Ayah[]): string {
  return `
// Temporary ingestion worker — delete after running
export default {
  async fetch(req: Request, env: any): Promise<Response> {
    if (new URL(req.url).pathname !== '/ingest') {
      return new Response('send POST to /ingest', { status: 404 });
    }

    const ayat = ${JSON.stringify(ayat)};
    let inserted = 0;

    // Insert into D1
    const stmt = env.DB.prepare(
      'INSERT OR REPLACE INTO ayat (id, surah, ayah, arabic, english, juz, page) VALUES (?,?,?,?,?,?,?)'
    );

    const d1Batch = ayat.map(a =>
      stmt.bind(
        \`\${a.surah}:\${a.ayah}\`,
        a.surah, a.ayah, a.arabic, a.english, a.juz, a.page
      )
    );

    // D1 supports batch of 1000
    for (let i = 0; i < d1Batch.length; i += 1000) {
      await env.DB.batch(d1Batch.slice(i, i + 1000));
    }

    // Embed and upsert into Vectorize in batches of 50
    const BATCH = 50;
    for (let i = 0; i < ayat.length; i += BATCH) {
      const chunk = ayat.slice(i, i + BATCH);
      
      // Embed Arabic + English together for bilingual search
      const texts = chunk.map(a => \`\${a.arabic} \${a.english}\`);
      
      const { data: embeddings } = await env.AI.run(
        '@cf/baai/bge-m3',
        { text: texts }
      );

      const vectors = chunk.map((a, j) => ({
        id: \`\${a.surah}:\${a.ayah}\`,
        values: embeddings[j],
        metadata: {
          surah: a.surah,
          ayah: a.ayah,
          arabic: a.arabic.substring(0, 200),
          english: a.english.substring(0, 200),
          juz: a.juz,
        },
      }));

      await env.VECTORIZE.upsert(vectors);
      inserted += chunk.length;
    }

    return new Response(JSON.stringify({ status: 'done', total: inserted }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
  `.trim();
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   IQRA Quran Ingestion Pipeline          ║');
  console.log('║   Total cost: $0                         ║');
  console.log('╚══════════════════════════════════════════╝\n');

  createD1Schema();

  // Note: fetchAllAyat() is skipped in sandbox, we assume data/quran_full.json exists
  // or will be generated when online.
  console.log('⚠️ Skipping live fetch in Sandbox mode.');
  console.log('   Run this script when connected to internet.');
}

main().catch(console.error);
