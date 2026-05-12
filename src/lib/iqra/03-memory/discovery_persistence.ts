/**
 * 🌙 Discovery Persistence Engine — محرك استمرارية الاكتشافات
 * 
 * "وَنَكْتُبُ مَا قَدَّمُوا وَآثَارَهُمْ وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 * 
 * ══════════════════════════════════════════════════════════════
 * المبدأ: Pulse 369 Memory Persistence
 * 
 * يضمن هذا المحرك أن الاكتشافات المسجلة اليوم في DISCOVERIES.md
 * يتم التعرف عليها غداً بواسطة Brain دون إعادة مسح.
 * 
 * الطبقات الثلاث:
 *   1. Hot Memory (RAM) — آخر 49 اكتشاف
 *   2. Warm Memory (SQLite) — آخر 1000 اكتشاف  
 *   3. Cold Memory (LanceDB) — الأرشيف الكامل
 * 
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { IQRAMemory } from './memory';
import { LanceDBPlugin } from './lancedb_plugin';
import { PatternMemory } from './pattern_memory';
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';

export interface Discovery {
  id: string;
  title: string;
  verse: string;
  field: string;
  resonance: number;
  mission_id: string;
  date: string;
  content: string;
  embedding?: number[];
  tags: string[];
  quran_signature: boolean;
  shannon_hel: number;
  timestamp: number;
}

export interface DiscoveryIndex {
  discoveries: Discovery[];
  last_scan: number;
  total_count: number;
  version: string;
}

export class DiscoveryPersistence {
  private static readonly DISCOVERIES_PATH = path.join(process.cwd(), '.iqra', 'knowledge', 'IQRA', 'discoveries');
  private static readonly INDEX_PATH = path.join(process.cwd(), '.iqra', 'discovery_index.json');
  private static readonly HOT_CACHE_SIZE = 49; // Tesla 7×7
  private static readonly WARM_CACHE_SIZE = 1000;
  
  private static hotCache: Map<string, Discovery> = new Map();
  private static lastScan = 0;

  /**
   * 🔥 Hot Memory: تحميل آخر 49 اكتشاف في الذاكرة
   */
  static async loadHotCache(): Promise<void> {
    try {
      const discoveries = await this.scanAllDiscoveries();
      
      // أحدث 49 اكتشاف
      const recent = discoveries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.HOT_CACHE_SIZE);
      
      this.hotCache.clear();
      for (const discovery of recent) {
        this.hotCache.set(discovery.id, discovery);
      }
      
      IQRALogger.info(`🔥 [DISCOVERY] Hot cache loaded: ${this.hotCache.size} discoveries`);
    } catch (error) {
      IQRALogger.error('❌ [DISCOVERY] Hot cache load failed:', error);
    }
  }

  /**
   * 📊 مسح جميع ملفات الاكتشافات من المجلد
   */
  static async scanAllDiscoveries(): Promise<Discovery[]> {
    try {
      const discoveries: Discovery[] = [];
      
      // التأكد من وجود المجلد
      try {
        await fs.access(this.DISCOVERIES_PATH);
      } catch {
        await fs.mkdir(this.DISCOVERIES_PATH, { recursive: true });
        return [];
      }
      
      const files = await fs.readdir(this.DISCOVERIES_PATH);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of mdFiles) {
        try {
          const filePath = path.join(this.DISCOVERIES_PATH, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const discovery = this.parseDiscoveryFile(content, file);
          
          if (discovery) {
            discoveries.push(discovery);
          }
        } catch (error) {
          IQRALogger.warn(`⚠️ [DISCOVERY] Failed to parse ${file}:`, error);
        }
      }
      
      this.lastScan = Date.now();
      return discoveries;
    } catch (error) {
      IQRALogger.error('❌ [DISCOVERY] Scan failed:', error);
      return [];
    }
  }

  /**
   * 📝 تحليل ملف اكتشاف واستخراج البيانات
   */
  private static parseDiscoveryFile(content: string, filename: string): Discovery | null {
    try {
      // استخراج Front Matter
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontMatterMatch) return null;
      
      const frontMatter = frontMatterMatch[1];
      const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');
      
      // تحليل YAML بسيط
      const metadata: any = {};
      const lines = frontMatter.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          
          if (key === 'tags') {
            metadata[key] = value.replace(/[\[\]]/g, '').split(',').map(t => t.trim());
          } else if (key === 'resonance' || key === 'shannon_hel') {
            metadata[key] = parseFloat(value);
          } else if (key === 'quran_signature') {
            metadata[key] = value === 'true';
          } else {
            metadata[key] = value.replace(/['"]/g, '');
          }
        }
      }
      
      // إنشاء ID فريد
      const id = crypto.createHash('sha256')
        .update(`${metadata.verse}-${metadata.field}-${filename}`)
        .digest('hex')
        .substring(0, 16);
      
      return {
        id,
        title: metadata.title || `Discovery in ${metadata.verse}`,
        verse: metadata.verse || '',
        field: metadata.field || 'unknown',
        resonance: metadata.resonance || 0,
        mission_id: metadata.mission_id || '',
        date: metadata.date || '',
        content: bodyContent,
        tags: metadata.tags || [],
        quran_signature: metadata.quran_signature || false,
        shannon_hel: metadata.shannon_hel || 0,
        timestamp: new Date(metadata.date || Date.now()).getTime()
      };
    } catch (error) {
      IQRALogger.error(`❌ [DISCOVERY] Parse error for ${filename}:`, error);
      return null;
    }
  }

  /**
   * 🔍 البحث في الاكتشافات (Hot → Warm → Cold)
   */
  static async searchDiscoveries(query: string, limit: number = 7): Promise<Discovery[]> {
    const results: Discovery[] = [];
    
    // 1. البحث في Hot Cache أولاً
    const hotResults = Array.from(this.hotCache.values())
      .filter(d => 
        d.title.toLowerCase().includes(query.toLowerCase()) ||
        d.verse.includes(query) ||
        d.field.toLowerCase().includes(query.toLowerCase()) ||
        d.content.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);
    
    results.push(...hotResults);
    
    // 2. إذا لم نجد كفاية، ابحث في Warm (PatternMemory)
    if (results.length < limit) {
      try {
        const queryEmbedding = await IQRAMemory.generateEmbedding(query);
        const warmResults = await PatternMemory.getSimilarPatterns(queryEmbedding, limit - results.length);
        
        for (const pattern of warmResults) {
          if (pattern.record.metadata?.discovery_id) {
            const discovery = await this.getDiscoveryById(pattern.record.metadata.discovery_id);
            if (discovery && !results.find(r => r.id === discovery.id)) {
              results.push(discovery);
            }
          }
        }
      } catch (error) {
        IQRALogger.warn('⚠️ [DISCOVERY] Warm search failed:', error);
      }
    }
    
    // 3. إذا لم نجد كفاية، ابحث في Cold (LanceDB)
    if (results.length < limit) {
      try {
        const coldResults = await LanceDBPlugin.recall(query, limit - results.length);
        
        for (const memory of coldResults) {
          if (memory.metadata?.type === 'discovery') {
            const discovery = JSON.parse(memory.content) as Discovery;
            if (!results.find(r => r.id === discovery.id)) {
              results.push(discovery);
            }
          }
        }
      } catch (error) {
        IQRALogger.warn('⚠️ [DISCOVERY] Cold search failed:', error);
      }
    }
    
    return results.slice(0, limit);
  }

  /**
   * 📥 حفظ اكتشاف جديد في جميع الطبقات
   */
  static async persistDiscovery(discovery: Discovery): Promise<void> {
    try {
      // 1. Hot Cache
      this.hotCache.set(discovery.id, discovery);
      
      // إذا تجاوز الحد، احذف الأقدم
      if (this.hotCache.size > this.HOT_CACHE_SIZE) {
        const oldest = Array.from(this.hotCache.entries())
          .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
        this.hotCache.delete(oldest[0]);
      }
      
      // 2. Warm Cache (PatternMemory)
      if (discovery.embedding) {
        await PatternMemory.storePattern(
          discovery.verse,
          discovery.field,
          discovery.resonance,
          discovery.embedding,
          discovery.mission_id,
          discovery.id,
          { 
            discovery_id: discovery.id,
            content: discovery.content,
            verse: discovery.verse,
            field: discovery.field,
            type: 'discovery'
          }
        );
      }
      
      // 3. Cold Storage (LanceDB)
      await LanceDBPlugin.archive(
        JSON.stringify(discovery),
        {
          type: 'discovery',
          verse: discovery.verse,
          field: discovery.field,
          resonance: discovery.resonance,
          date: discovery.date
        }
      );
      
      // 4. TrustChain
      await appendToTrustChain(
        'DISCOVERY:PERSIST',
        discovery.id,
        `${discovery.verse} ${discovery.field} resonance=${discovery.resonance}`,
        discovery.resonance
      );
      
      IQRALogger.info(`💎 [DISCOVERY] Persisted: ${discovery.title} (${discovery.resonance.toFixed(3)})`);
    } catch (error) {
      IQRALogger.error('❌ [DISCOVERY] Persistence failed:', error);
    }
  }

  /**
   * 🔎 الحصول على اكتشاف بالـ ID
   */
  static async getDiscoveryById(id: string): Promise<Discovery | null> {
    // 1. Hot Cache أولاً
    if (this.hotCache.has(id)) {
      return this.hotCache.get(id)!;
    }
    
    // 2. مسح جميع الاكتشافات
    const discoveries = await this.scanAllDiscoveries();
    return discoveries.find(d => d.id === id) || null;
  }

  /**
   * 🌀 Pulse 369: دورة التحديث التلقائي
   */
  static async pulse369(): Promise<void> {
    try {
      const now = Date.now();
      
      // كل 369 ثانية، أعد تحميل Hot Cache
      if (now - this.lastScan > 369 * 1000) {
        await this.loadHotCache();
        
        // إنشاء تضمينات للاكتشافات الجديدة
        for (const [id, discovery] of this.hotCache) {
          if (!discovery.embedding) {
            try {
              discovery.embedding = await IQRAMemory.generateEmbedding(
                `${discovery.title} ${discovery.content}`
              );
              await this.persistDiscovery(discovery);
            } catch (error) {
              IQRALogger.warn(`⚠️ [DISCOVERY] Embedding failed for ${id}:`, error);
            }
          }
        }
        
        IQRALogger.info(`🌀 [DISCOVERY] Pulse 369 completed: ${this.hotCache.size} discoveries in memory`);
      }
    } catch (error) {
      IQRALogger.error('❌ [DISCOVERY] Pulse 369 failed:', error);
    }
  }

  /**
   * 📊 إحصائيات الذاكرة
   */
  static async getMemoryStats(): Promise<{
    hot_count: number;
    warm_count: number;
    total_discoveries: number;
    last_scan_ago: number;
  }> {
    const discoveries = await this.scanAllDiscoveries();
    const warmCount = await PatternMemory.count();
    
    return {
      hot_count: this.hotCache.size,
      warm_count: warmCount,
      total_discoveries: discoveries.length,
      last_scan_ago: Date.now() - this.lastScan
    };
  }

  /**
   * 🧠 Brain Integration: الحصول على السياق للمهمة
   */
  static async getContextForMission(missionQuery: string): Promise<string> {
    const discoveries = await this.searchDiscoveries(missionQuery, 7);
    
    if (discoveries.length === 0) {
      return '';
    }
    
    const context = discoveries.map(d => 
      `[DISCOVERY:${d.verse}] ${d.title} (${(d.resonance * 100).toFixed(1)}% resonance)`
    ).join('\n');
    
    return `[PERSISTENT_DISCOVERIES]\n${context}\n`;
  }
}
