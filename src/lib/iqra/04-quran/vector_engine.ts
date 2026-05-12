/**
 * IQRA Vector Engine — محرك المتجهات
 * 
 * Semantic search and pattern recognition using Cloudflare Vectorize.
 * Optimized for Multilingual (Arabic/English) support.
 */

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: any;
}

export class VectorEngine {
  // Use a multilingual model for Arabic support
  private static EMBEDDING_MODEL = '@cf/baai/bge-m3';

  constructor(private env: any) {}

  /**
   * Search for semantically similar ayahs
   */
  async searchSimilar(text: string, topK: number = 7): Promise<VectorMatch[]> {
    if (!this.env.VECTORIZE || !this.env.AI) {
      console.warn("Vectorize or AI binding missing");
      return [];
    }

    try {
      // 1. Generate embedding using Workers AI Multilingual Model
      const { data } = await this.env.AI.run(VectorEngine.EMBEDDING_MODEL, {
        text: [text],
      });
      const embedding = data[0];

      // 2. Query Vectorize
      const results = await this.env.VECTORIZE.query(embedding, {
        topK,
        returnValues: true,
        returnMetadata: true,
      });

      return results.matches.map((m: any) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata,
      }));
    } catch (e) {
      console.error("Vector Search Error:", e);
      return [];
    }
  }

  /**
   * Insert or update embeddings for ayahs in batch
   * "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ" — المائدة: 2
   */
  async upsertAyahs(ayahs: { id: string; text: string; metadata: any }[]) {
    if (ayahs.length === 0) return;

    try {
      // 1. Generate embeddings for all texts in a single call
      const texts = ayahs.map(a => a.text);
      const { data: embeddings } = await this.env.AI.run(VectorEngine.EMBEDDING_MODEL, {
        text: texts,
      });

      // 2. Prepare vectors for Vectorize
      const vectors = ayahs.map((ayah, i) => ({
        id: ayah.id,
        values: embeddings[i],
        metadata: ayah.metadata,
      }));

      // 3. Single upsert call to Vectorize
      await this.env.VECTORIZE.upsert(vectors);
      console.log(`✅ Batched ${ayahs.length} vectors to Vectorize.`);
    } catch (e) {
      console.error("❌ Vector Batch Upsert Error:", e);
    }
  }
}
