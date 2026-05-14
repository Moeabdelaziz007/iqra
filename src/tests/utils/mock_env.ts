/**
 * 🔧 Test Utilities — Mock Environment for IQRA Tests
 *
 * "وَلَا تَقْفْ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 *
 * لا نستخدم بيانات حقيقية في الاختبارات.
 * نستخدم mocks للمفاتيح والاتصالات الخارجية.
 */

/**
 * إعداد بيئة mock للاختبارات
 */
export function setupMockEnv() {
  // API Keys (mock values for tests only)
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key-12345';
  process.env.GROQ_API_KEY = 'test-groq-key-12345';
  process.env.OPENAI_API_KEY = 'test-openai-key-12345';
  process.env.OLLAMA_MODEL = 'gemma3:4b';

  // Database (mock paths)
  process.env.QDRANT_URL = 'http://localhost:6333';
  process.env.QDRANT_API_KEY = 'test-qdrant-key';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-supabase-key';

  // Redis (mock)
  process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:6379';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';

  // Email/SMTP (mock)
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.IMAP_USER = 'test@example.com';
  process.env.IMAP_PASS = 'test-imap-pass';

  // Paths
  process.env.IQRA_CORE_PATH = './iqra-core';
  process.env.IQRA_DATA_PATH = './iqra-core/data';

  return process.env;
}

/**
 * إعادة ضبط البيئة بعد الاختبارات
 */
export function resetMockEnv() {
  const mockKeys = [
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GROQ_API_KEY',
    'OPENAI_API_KEY',
    'QDRANT_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'UPSTASH_REDIS_REST_TOKEN',
    'RESEND_API_KEY',
    'IMAP_PASS',
  ];

  for (const key of mockKeys) {
    delete process.env[key];
  }
}

/**
 * Mock للـ ConnectorFactory
 */
export const mockConnector = {
  generate: async (prompt: string) => ({
    content: 'Mock response for: ' + prompt.slice(0, 50),
    usage: { prompt_tokens: 10, completion_tokens: 10 },
    model: 'mock-model',
  }),
  name: 'mock-connector',
};

/**
 * Mock للـ Redis
 */
export const mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  incr: async () => 1,
  append: async () => 1,
};
