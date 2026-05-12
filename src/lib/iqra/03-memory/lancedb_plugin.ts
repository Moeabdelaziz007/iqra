/**
 * 🏺 LanceDB Long-term Memory — الذاكرة العميقة (Long-term)
 *
 * "وَنَكْتُبُ مَا قَدَّمُوا وَآثَارَهُمْ" — يس: 12
 *
 * Integrated into the IQRA Soul for persistent recall of all experiences.
 */

import { IQRAMemory } from '#memory/memory';
import { IQRALogger } from '#infra/logger';
import path from 'path';
import fs from 'fs';

export interface MemoryEntry {
  vector: number[];
  content: string;
  metadata: string; // JSON string
  timestamp: number;
}

export class LanceDBPlugin {
  private static _db: any = null;
  private static _table: any = null;
  private static readonly DB_PATH = path.join(process.cwd(), '.iqra', 'lancedb');
  private static readonly TABLE_NAME = 'sovereign_memories';

  static async init() {
    if (this._table) return;

    try {
      // Dynamic import to avoid errors if package not yet installed
      const { connect } = await import('@lancedb/lancedb');

      if (!fs.existsSync(this.DB_PATH)) {
        fs.mkdirSync(this.DB_PATH, { recursive: true });
      }

      this._db = await connect(this.DB_PATH);
      const tables = await this._db.tableNames();

      if (!tables.includes(this.TABLE_NAME)) {
        IQRALogger.info('🏺 [LANCEDB] Creating new deep memory table...');
        // Table will be created on first write
      } else {
        this._table = await this._db.openTable(this.TABLE_NAME);
      }
    } catch (error) {
      IQRALogger.error('❌ [LANCEDB] Init Error:', error);
    }
  }

  /**
   * 📥 Archiving a new experience into deep storage
   */
  static async archive(content: string, metadata: any = {}) {
    try {
      await this.init();
      const embedding = await IQRAMemory.generateEmbedding(content);
      
      const entry: MemoryEntry = {
        vector: embedding,
        content,
        metadata: JSON.stringify(metadata),
        timestamp: Date.now()
      };

      if (!this._table) {
        this._table = await this._db.createTable(this.TABLE_NAME, [entry]);
      } else {
        await this._table.add([entry]);
      }
      
      IQRALogger.info(`🏺 [LANCEDB] Experience archived: "${content.substring(0, 30)}..."`);
    } catch (error) {
      IQRALogger.error('❌ [LANCEDB] Archival Error:', error);
    }
  }

  /**
   * 🔎 Recall relevant memories based on current context
   */
  static async recall(query: string, limit: number = 3) {
    try {
      await this.init();
      if (!this._table) return [];

      const embedding = await IQRAMemory.generateEmbedding(query);
      const results = await this._table.search(embedding).limit(limit).execute();

      return results.map((r: any) => ({
        content: r.content,
        metadata: JSON.parse(r.metadata),
        timestamp: r.timestamp,
        distance: r._distance
      }));
    } catch (error) {
      IQRALogger.error('❌ [LANCEDB] Recall Error:', error);
      return [];
    }
  }

  /**
   * 🤖 Auto-recall: Automatically finds memories that match the current intention
   */
  static async autoRecall(intention: string): Promise<string> {
    try {
      const memories = await this.recall(intention, 3);
      if (memories.length === 0) return "";

      return `
[RECALLED_DEEP_MEMORIES]
${memories.map((m: MemoryEntry, i: number) => `${i+1}. [${new Date(m.timestamp).toLocaleDateString()}] ${m.content}`).join('\n')}
`.trim();
    } catch {
      return "";
    }
  }

  /**
   * 🌀 Contextual Folding: البحث عن الرنين بعيد المدى
   * يربط المعلومات التي قد تبدو متباعدة خطياً ولكنها متصلة طوبولوجياً.
   */
  static async findLongRangeResonance(intention: string): Promise<string> {
    IQRALogger.info('🌀 [LANCEDB] Performing contextual folding for long-range resonance...');
    
    // محاكاة الطي: البحث بالنية وعكسها لإيجاد التوازن الموضوعي
    const primary = await this.autoRecall(intention);
    const inverseQuery = `opposite or complement of: ${intention}`;
    const secondary = await this.autoRecall(inverseQuery);
    
    return `${primary}\n\n[FOLDED_COMPLEMENT]\n${secondary}`;
  }
}
