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
   * Insert or update embeddings for ayahs
   */
  async upsertAyahs(ayahs: { id: string; text: string; metadata: any }[]) {
    try {
      // 1. Generate embeddings in parallel batches
      const embeddingPromises = ayahs.map(async (ayah) => {
        const { data } = await this.env.AI.run(VectorEngine.EMBEDDING_MODEL, {
          text: [ayah.text],
        });
        return {
          id: ayah.id,
          values: data[0],
          metadata: ayah.metadata,
        };
      });

      const vectors = await Promise.all(embeddingPromises);

      // 2. Upsert to Vectorize
      if (vectors.length > 0) {
        await this.env.VECTORIZE.upsert(vectors);
      }
    } catch (e) {
      console.error("Vector Upsert Error:", e);
    }
  }
}
