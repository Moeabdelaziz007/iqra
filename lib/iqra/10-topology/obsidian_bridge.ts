// بسم الله الرحمن الرحيم

/**
 * 🌉 KnowledgeBridge — جسر قاعدة المعرفة
 *
 * "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31
 *
 * ══════════════════════════════════════════════════════════════
 * يدعم:
 *   Logseq  — مفتوح المصدر، مجاني، AGPL ✅ (الأفضل)
 *   Obsidian — يعمل محلياً مجاناً (بدون sync)
 *   Fallback — .iqra/knowledge/ محلي
 *
 * Gephi Export:
 *   يُصدّر الرسم البياني بصيغة GEXF
 *   يُفتح في Gephi Lite (مجاني في المتصفح)
 *   لتصور العلاقات بين الآيات والمفاهيم
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const OBSIDIAN_BASE_URL = process.env.OBSIDIAN_BASE_URL ?? 'http://localhost:27123';
const OBSIDIAN_API_KEY  = process.env.OBSIDIAN_API_KEY ?? '';

/**
 * مسار Vault — يدعم Logseq و Obsidian و fallback محلي
 * الأولوية:
 *   1. LOGSEQ_VAULT_PATH  ← Logseq (مفتوح المصدر، مجاني)
 *   2. OBSIDIAN_VAULT_PATH ← Obsidian (محلي مجاني)
 *   3. .iqra/knowledge/   ← fallback محلي
 */
const VAULT_PATH = (
  process.env.LOGSEQ_VAULT_PATH ||
  process.env.OBSIDIAN_VAULT_PATH ||
  path.join(process.cwd(), '.iqra', 'knowledge')
);

const IQRA_VAULT_DIR = 'IQRA';

/** هل نستخدم Logseq؟ */
const IS_LOGSEQ = !!process.env.LOGSEQ_VAULT_PATH;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiscoveryNote {
  /** عنوان الاكتشاف */
  title: string;
  /** الآية المرجعية */
  verse_ref: string;
  /** النص العربي */
  arabic: string;
  /** مجال الاكتشاف */
  field: string;
  /** درجة الرنين */
  resonance: number;
  /** الروابط الطوبولوجية */
  links: string[];
  /** الدروس المستخلصة */
  insights: string[];
  /** معرّف المهمة */
  mission_id: string;
  /** وقت الاكتشاف */
  timestamp: number;
  /** هل تحتوي على بصمة قرآنية؟ */
  quran_signature?: boolean;
  /** إنتروبي Shannon */
  shannon_hel?: number;
}

export interface TopologyLink {
  from: string;  // verse_ref
  to: string;    // verse_ref أو مفهوم
  type: 'numerical' | 'semantic' | 'thematic' | 'resonance';
  strength: number; // 0.0 – 1.0
}

// ── ObsidianBridge ────────────────────────────────────────────────────────────

export class ObsidianBridge {
  private static _available: boolean | null = null;

  // ── Availability ──────────────────────────────────────────────────────────

  static async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    if (!process.env.IQRA_OBSIDIAN || process.env.IQRA_OBSIDIAN !== 'true') {
      this._available = false;
      return false;
    }

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${OBSIDIAN_BASE_URL}/`, {
        headers: { Authorization: `Bearer ${OBSIDIAN_API_KEY}` },
        signal: controller.signal,
      });
      this._available = res.ok;
    } catch {
      this._available = false;
    }

    IQRALogger.info(`🌉 [OBSIDIAN] Available: ${this._available}`);
    return this._available;
  }

  // ── Write Discovery ───────────────────────────────────────────────────────

  /**
   * يكتب اكتشافاً قرآنياً في Obsidian
   *
   * الصيغة:
   *   IQRA/discoveries/YYYY-MM-DD_verse_field.md
   *
   * يحتوي على:
   *   - frontmatter YAML (للبحث والفلترة)
   *   - نص الآية
   *   - الاكتشاف
   *   - [[links]] طوبولوجية
   */
  static async writeDiscovery(discovery: DiscoveryNote): Promise<string | null> {
    const content = this._buildNoteContent(discovery);
    const filename = this._buildFilename(discovery);
    const notePath = `${IQRA_VAULT_DIR}/discoveries/${filename}`;

    // محاولة Obsidian REST API أولاً
    if (await this.isAvailable()) {
      try {
        const res = await fetch(`${OBSIDIAN_BASE_URL}/vault/${notePath}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${OBSIDIAN_API_KEY}`,
            'Content-Type': 'text/markdown',
          },
          body: content,
        });

        if (res.ok) {
          IQRALogger.info(`📝 [OBSIDIAN] Written: ${notePath}`);
          appendToTrustChain('OBSIDIAN:WRITE', discovery.verse_ref, notePath, discovery.resonance);
          return notePath;
        }
      } catch (e) {
        IQRALogger.warn(`⚠️ [OBSIDIAN] API failed, using file fallback: ${(e as Error).message}`);
      }
    }

    // Fallback: كتابة مباشرة في الملفات
    if (VAULT_PATH) {
      return this._writeToFile(notePath, content);
    }

    // Fallback أخير: كتابة في .iqra/obsidian/
    return this._writeToLocalCache(filename, content);
  }

  /**
   * يكتب رابطاً طوبولوجياً بين آيتين أو مفهومين
   */
  static async writeTopologyLink(link: TopologyLink): Promise<void> {
    const content = `---
type: topology_link
from: "[[${link.from}]]"
to: "[[${link.to}]]"
link_type: ${link.type}
strength: ${link.strength}
created: ${new Date().toISOString()}
---

# رابط طوبولوجي: ${link.from} ↔ ${link.to}

**النوع**: ${link.type}
**القوة**: ${(link.strength * 100).toFixed(0)}%

## الوصف
هذا الرابط يُمثّل علاقة ${link.type} بين [[${link.from}]] و [[${link.to}]].
`;

    const filename = `${link.from.replace(':', '_')}_${link.to.replace(':', '_')}_${link.type}.md`;
    const notePath = `${IQRA_VAULT_DIR}/topology/${filename}`;

    if (await this.isAvailable()) {
      try {
        await fetch(`${OBSIDIAN_BASE_URL}/vault/${notePath}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${OBSIDIAN_API_KEY}`,
            'Content-Type': 'text/markdown',
          },
          body: content,
        });
      } catch { /* ignore */ }
    }

    this._writeToLocalCache(filename, content);
  }

  /**
   * يبحث في vault عن اكتشافات مشابهة
   */
  static async searchDiscoveries(query: string, limit: number = 7): Promise<string[]> {
    if (!await this.isAvailable()) {
      return this._searchLocalCache(query, limit);
    }

    try {
      const res = await fetch(
        `${OBSIDIAN_BASE_URL}/search/simple/?query=${encodeURIComponent(query)}&contextLength=100`,
        { headers: { Authorization: `Bearer ${OBSIDIAN_API_KEY}` } }
      );

      if (res.ok) {
        const data = await res.json() as any[];
        return data.slice(0, limit).map(r => r.filename ?? '');
      }
    } catch { /* fallback */ }

    return this._searchLocalCache(query, limit);
  }

  // ── Private: Content Builder ──────────────────────────────────────────────

  private static _buildNoteContent(d: DiscoveryNote): string {
    const date = new Date(d.timestamp).toISOString().split('T')[0];
    const linksStr = d.links.map(l => `[[${l}]]`).join(', ');

    return `---
title: "${d.title}"
verse: "${d.verse_ref}"
field: "${d.field}"
resonance: ${d.resonance.toFixed(3)}
mission_id: "${d.mission_id}"
date: ${date}
tags: [iqra, discovery, ${d.field.replace(/\s/g, '_')}]
quran_signature: ${d.quran_signature ?? false}
shannon_hel: ${d.shannon_hel?.toFixed(4) ?? 'null'}
---

# ${d.title}

> **الآية**: ${d.verse_ref}
> **الرنين**: ${(d.resonance * 100).toFixed(1)}%

## النص القرآني
${d.arabic}

## المجال
${d.field}

## الاكتشافات
${d.insights.map(i => `- ${i}`).join('\n')}

## الروابط الطوبولوجية
${linksStr || 'لا روابط بعد'}

## المصدر
- **المهمة**: ${d.mission_id}
- **التاريخ**: ${date}
- **IQRA SoulEngine v2**

---
*"سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ" — فصلت: 53*
`;
  }

  private static _buildFilename(d: DiscoveryNote): string {
    const date = new Date(d.timestamp).toISOString().split('T')[0];
    const safe = d.verse_ref.replace(':', '_');
    const field = d.field.replace(/\s/g, '_').slice(0, 20);
    return `${date}_${safe}_${field}.md`;
  }

  // ── Private: File Fallbacks ───────────────────────────────────────────────

  private static _writeToFile(notePath: string, content: string): string | null {
    try {
      const fullPath = path.join(VAULT_PATH, notePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Logseq يفضل صيغة مختلفة قليلاً (نفس Markdown لكن مع pages/)
      const finalContent = IS_LOGSEQ
        ? content.replace(/^---\n/, '').replace(/\n---\n/, '\n') // Logseq لا يحتاج frontmatter
        : content;

      fs.writeFileSync(fullPath, finalContent, 'utf-8');
      IQRALogger.info(`📝 [KNOWLEDGE] ${IS_LOGSEQ ? 'Logseq' : 'Obsidian'} written: ${fullPath}`);
      return notePath;
    } catch (e) {
      IQRALogger.error('❌ [KNOWLEDGE] File write failed:', e);
      return null;
    }
  }

  private static _writeToLocalCache(filename: string, content: string): string | null {
    try {
      const cacheDir = path.join(process.cwd(), '.iqra', 'obsidian');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const fullPath = path.join(cacheDir, filename);
      fs.writeFileSync(fullPath, content, 'utf-8');
      IQRALogger.info(`📝 [OBSIDIAN] Cached: ${fullPath}`);
      return fullPath;
    } catch (e) {
      IQRALogger.error('❌ [OBSIDIAN] Cache write failed:', e);
      return null;
    }
  }

  private static _searchLocalCache(query: string, limit: number): string[] {
    try {
      const cacheDir = path.join(process.cwd(), '.iqra', 'obsidian');
      if (!fs.existsSync(cacheDir)) return [];

      const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.md'));
      const results: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(path.join(cacheDir, file), 'utf-8');
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push(file);
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch {
      return [];
    }
  }
}

// ── Gephi Export (مجاني — يُفتح في Gephi Lite) ───────────────────────────────

/**
 * يُصدّر الرسم البياني المعرفي بصيغة GEXF
 * يُفتح في: https://gephi.org/gephi-lite (مجاني في المتصفح)
 *
 * الاستخدام:
 *   const gexf = await GephiExporter.export();
 *   fs.writeFileSync('iqra_graph.gexf', gexf);
 *   // ثم افتح الملف في Gephi Lite
 */
export class GephiExporter {

  /**
   * يُصدّر كل الأنماط والعلاقات السببية كـ GEXF
   */
  static async export(): Promise<string> {
    const { MicroMemory } = await import('../memory/micro_memory.ts');
    await MicroMemory.init();

    const db = (MicroMemory as any)._db;
    if (!db) return this._emptyGraph();

    // جلب الأنماط (nodes)
    const patterns = db.prepare(
      'SELECT id, verse, field, resonance, shannon_hel FROM patterns LIMIT 500'
    ).all() as any[];

    // جلب العلاقات السببية (edges)
    const edges = db.prepare(
      'SELECT id, cause_id, effect_id, relation, strength FROM causal_edges LIMIT 1000'
    ).all() as any[];

    return this._buildGEXF(patterns, edges);
  }

  /**
   * يُصدّر ويحفظ في ملف
   */
  static async exportToFile(
    outputPath: string = path.join(process.cwd(), '.iqra', 'iqra_graph.gexf')
  ): Promise<string> {
    const gexf = await this.export();
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, gexf, 'utf-8');
    IQRALogger.info(`📊 [GEPHI] Graph exported: ${outputPath}`);
    return outputPath;
  }

  private static _buildGEXF(patterns: any[], edges: any[]): string {
    const nodes = patterns.map(p => `
      <node id="${p.id}" label="${p.verse}: ${p.field}">
        <attvalues>
          <attvalue for="resonance" value="${p.resonance ?? 0}"/>
          <attvalue for="shannon_hel" value="${p.shannon_hel ?? 0}"/>
          <attvalue for="verse" value="${p.verse}"/>
          <attvalue for="field" value="${p.field}"/>
        </attvalues>
      </node>`).join('');

    const edgeList = edges.map((e, i) => `
      <edge id="${i}" source="${e.cause_id}" target="${e.effect_id}"
            label="${e.relation}" weight="${e.strength ?? 0.5}"/>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <meta lastmodifieddate="${new Date().toISOString().split('T')[0]}">
    <creator>IQRA SoulEngine v0.369</creator>
    <description>IQRA Quran Knowledge Graph — سَنُرِيهِمْ آيَاتِنَا</description>
  </meta>
  <graph defaultedgetype="directed">
    <attributes class="node">
      <attribute id="resonance" title="Resonance" type="float"/>
      <attribute id="shannon_hel" title="Shannon H_EL" type="float"/>
      <attribute id="verse" title="Verse" type="string"/>
      <attribute id="field" title="Field" type="string"/>
    </attributes>
    <nodes>${nodes}
    </nodes>
    <edges>${edgeList}
    </edges>
  </graph>
</gexf>`;
  }

  private static _emptyGraph(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph defaultedgetype="directed">
    <nodes/><edges/>
  </graph>
</gexf>`;
  }
}
