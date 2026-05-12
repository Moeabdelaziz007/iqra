/**
 * IQRA Vector Engine
 * 
 * Semantic search and pattern recognition using Cloudflare Vectorize.
 */

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: any;
}

export class VectorEngine {
  constructor(private env: any) {}

  /**
   * Search for semantically similar ayahs
   */
  async searchSimilar(text: string, topK: number = 7): Promise<VectorMatch[]> {
    if (!this.env.VECTORIZE || !this.env.AI) {
      console.warn("Vectorize or AI binding missing");
      return [];
    }

    // 1. Generate embedding using Workers AI
    const { data } = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
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
  }

  /**
   * Insert or update embeddings for ayahs
   *
   * النية: تحسين أداء حقن البيانات باستخدام المعالجة المجمعة (Batching)
   * المرجع: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ" — المائدة: 2
   */
  async upsertAyahs(ayahs: { id: string; text: string; metadata: any }[]) {
    if (ayahs.length === 0) return;

    // 1. Generate embeddings in batch
    const texts = ayahs.map(a => a.text);
    const { data: embeddings } = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: texts,
    });

    // 2. Prepare vectors for Vectorize
    const vectors = ayahs.map((ayah, i) => ({
      id: ayah.id,
      values: embeddings[i],
      metadata: ayah.metadata,
    }));

    // 3. Single upsert call
    await this.env.VECTORIZE.upsert(vectors);
  }
}
