import { ingestQuran } from '../src/lib/iqra/04-quran/quran_loader';

async function benchmark() {
  console.log("--- Starting Benchmark ---");

  let dbCalls = 0;
  let vectorizeCalls = 0;
  let aiCalls = 0;

  const mockDb = {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        run: async () => {
          dbCalls++;
          await new Promise(r => setTimeout(r, 2));
          return { success: true };
        }
      })
    }),
    batch: async (stmts: any[]) => {
      dbCalls++;
      await new Promise(r => setTimeout(r, 10)); // Batch is slightly slower than single but handles many
      return stmts.map(() => ({ success: true }));
    }
  };

  const mockVectorize = {
    upsert: async (vectors: any[]) => {
      vectorizeCalls++;
      await new Promise(r => setTimeout(r, 50));
      return { count: vectors.length };
    }
  };

  const mockAI = {
    run: async (model: string, input: any) => {
      aiCalls++;
      const text = input?.text;
      const count = Array.isArray(text) ? text.length : 1;
      await new Promise(r => setTimeout(r, 20 * count));
      return { data: Array.from({ length: count }, () => Array(384).fill(0.1)) };
    }
  };

  const env = {
    DB: mockDb,
    VECTORIZE: mockVectorize,
    AI: mockAI
  };

  const startTime = Date.now();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes('api.alquran.cloud')) {
      return new Response(
        JSON.stringify({
          data: {
            surahs: Array.from({ length: 5 }, (_, s) => ({
              number: s + 1,
              name: "Surah " + (s + 1),
              ayahs: Array.from({ length: 20 }, (_, i) => ({
                numberInSurah: i + 1,
                text: "Sample Ayah Text " + (i + 1)
              }))
            }))
          }
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    await ingestQuran(env);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const endTime = Date.now();
  console.log(`Total execution time: ${endTime - startTime}ms`);
  console.log(`D1 Calls: ${dbCalls}`);
  console.log(`Vectorize Calls: ${vectorizeCalls}`);
  console.log(`AI Calls: ${aiCalls}`);
  console.log("--- Benchmark Complete ---");
}

benchmark().catch(console.error);
