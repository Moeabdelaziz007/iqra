/**
 * IQRA Test Setup — إعداد الاختبارات
 * "بسم الله الرحمن الرحيم"
 *
 * Loads .env before any test runs.
 * Validates required keys exist — no silent failures.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(process.cwd(), '.env') });

// ── Sovereign Key Validation ──────────────────────────────────────────────────
const REQUIRED_FOR_E2E = ['GROQ_API_KEY'];

const missing = REQUIRED_FOR_E2E.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.warn(`⚠️ [SETUP] Missing env vars for real LLM workers: ${missing.join(', ')}.`);
}

console.log('✅ [SETUP] بسم الله — IQRA E2E test suite initialized.');
console.log(`   GROQ:    ${process.env.GROQ_API_KEY       ? '✅' : '❌'}`);
console.log(`   GOOGLE:  ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅' : '❌'}`);
console.log(`   QDRANT:  ${process.env.QDRANT_URL         ? '✅' : '❌'}`);
console.log(`   REDIS:   ${process.env.UPSTASH_REDIS_REST_URL ? '✅' : '❌'}`);
