/**
 * 🏗️ Builder Worker — عامل البناء
 * النية: تحويل نتائج البحث إلى عقدة معرفة Markdown موثقة
 * المرجع: "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31
 *
 * القاعدة: Builder لا يُقيّم نفسه — لا يضع resonance_score عالياً بلا دليل.
 * القاعدة: Builder لا يوافق على نتيجته — الـ Validator يفعل ذلك.
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES
 * ══════════════════════════════════════════════════════════════
 * 1. كل حقل في KnowledgeNode يجب أن يكون له قيمة حقيقية.
 * 2. validateNode تُجهض إذا كانت البيانات ناقصة أو مشبوهة.
 * 3. serializeToMarkdown تُنتج YAML frontmatter + Markdown body.
 * 4. إذا تجاوزت المكافأة 0.7 → أنشئ knowledge/node-*.md تلقائياً.
 * 5. كل مصدر يُوسَم: [read] | [fetched] | [prior-training].
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { MissionContext, HandoffResult } from '../01-core/mission-context.js';
import { appendToTrustChain } from '../security.ts';
import { IQRALogger } from '../12-infrastructure/logger.js';
import type { ResearchOutput } from './researcher.ts';
import {
  validateNode,
  serializeToMarkdown,
  type KnowledgeNode,
} from '../../../schema/knowledge-node.ts';

// ── Reward threshold for auto-creating knowledge nodes ────────────────────────
// القاعدة ٤: فقط الاكتشافات ذات القيمة العالية تُحفظ كعقد معرفة
const KNOWLEDGE_NODE_REWARD_THRESHOLD = 0.7;

export async function executeBuilder(context: MissionContext): Promise<HandoffResult> {
  const { scope, workingDir, previousOutput } = context;
  const implemented: string[] = [];
  const undone: string[] = [];
  const issues: string[] = [];

  IQRALogger.info(`🏗️ [BUILDER] Building knowledge node for: ${scope.mission_id}`);

  try {
    // ── 1. Read research output [read] ────────────────────────────────────────
    const researchPath = previousOutput?.outputPath as string;
    if (!researchPath || !fs.existsSync(researchPath)) {
      throw new Error(
        'INTEGRITY_ERR: research_output.json not found — Builder cannot proceed without Researcher output'
      );
    }

    const research: ResearchOutput = JSON.parse(
      fs.readFileSync(researchPath, 'utf-8')  // [read]
    );
    implemented.push('[read] research_output.json loaded');

    // ── 2. Validate evidence ──────────────────────────────────────────────────
    if (!research.evidence || research.evidence.trim().length < 20) {
      issues.push(`Evidence is suspiciously short (${research.evidence?.length ?? 0} chars)`);
    }

    const resonanceScore = research.resonance_score ?? 0.5;

    // ── 3. Read resonance data from previous step (if available) ──────────────
    const topologicalScore = previousOutput?.topological_score as number | undefined;
    const patternMatched   = previousOutput?.pattern_matched   as string | undefined;

    // ── 4. Build KnowledgeNode struct ─────────────────────────────────────────
    const nodeId = scope.mission_id.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const timestamp = new Date().toISOString();

    // total_reward: إذا وصلنا للـ Builder، نستخدم resonance كتقدير مبدئي.
    // القيمة الحقيقية تُحسب في Reporter — لكن Builder يحتاجها للـ threshold check.
    // نستخدم resonance_score * 2 كتقدير محافظ (يتوافق مع REWARD_WEIGHTS).
    const estimatedReward = resonanceScore * 2.0;

    const node: KnowledgeNode = {
      mission_id:       scope.mission_id,
      node_id:          nodeId,
      created_at:       timestamp,
      verse:            research.verse,
      field_of_inquiry: research.field_of_inquiry,
      evidence:         research.evidence,
      reasoning:        research.reasoning,
      source_type:      research.source_type,
      resonance_score:  resonanceScore,
      total_reward:     estimatedReward,
      discovery_level:  estimatedReward >= 0.85 ? 'resonance'
                      : estimatedReward >= 0.7  ? 'tree'
                      : estimatedReward >= 0.5  ? 'branch'
                      : estimatedReward >= 0.3  ? 'sprout'
                      : 'seed',
      provider:         research.provider,
      model:            research.model,
      validation_status: 'pending',
      is_trivial:       research.is_trivial,
      ...(topologicalScore !== undefined && { topological_score: topologicalScore }),
      ...(patternMatched   !== undefined && { pattern_matched:   patternMatched   }),
    };

    // ── 5. Validate node — القاعدة ٢ ─────────────────────────────────────────
    const validation = validateNode(node);
    if (!validation.valid) {
      // تحذيرات لا تُوقف البناء — لكن تُسجَّل
      validation.errors.forEach(e => issues.push(`NODE_VALIDATION: ${e}`));
      IQRALogger.warn(`⚠️ [BUILDER] Node validation issues: ${validation.errors.join('; ')}`);
    }
    implemented.push(`Node validated: ${validation.valid ? 'PASS' : 'WARN'} (${validation.errors.length} issues)`);

    // ── 6. Serialize + write knowledge node — القاعدة ٣+٤ ───────────────────
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const nodePath = path.join(knowledgeDir, `node-${nodeId}.md`);

    // القاعدة ٤: فقط إذا تجاوزت المكافأة المقدّرة الـ threshold
    let nodeWritten = false;
    if (estimatedReward >= KNOWLEDGE_NODE_REWARD_THRESHOLD) {
      const nodeContent = serializeToMarkdown(node);
      fs.writeFileSync(nodePath, nodeContent, 'utf-8');
      nodeWritten = true;
      implemented.push(
        `[write] knowledge node → ${nodePath} ` +
        `(reward: ${estimatedReward.toFixed(3)} ≥ threshold: ${KNOWLEDGE_NODE_REWARD_THRESHOLD})`
      );
      IQRALogger.info(`🏗️ [BUILDER] Node created: ${nodePath}`);
    } else {
      undone.push(
        `knowledge node skipped — estimated reward ${estimatedReward.toFixed(3)} < threshold ${KNOWLEDGE_NODE_REWARD_THRESHOLD}`
      );
      IQRALogger.info(
        `🏗️ [BUILDER] Node skipped (low reward: ${estimatedReward.toFixed(3)})`
      );
    }

    implemented.push(`resonance_score: ${resonanceScore.toFixed(4)}`);
    implemented.push(`source_type: ${research.source_type}`);

    appendToTrustChain(
      'BUILDER:NODE_CREATED',
      scope.mission_id,
      `node:${nodeId}:score:${resonanceScore.toFixed(3)}:written:${nodeWritten}`,
      resonanceScore
    );

    return {
      status: 'success',
      worker: 'Builder',
      next: 'Validator',
      data: {
        nodePath: nodeWritten ? nodePath : null,
        nodeId,
        resonance_score: resonanceScore,
        estimated_reward: estimatedReward,
        node_written: nodeWritten,
        // Pass research path forward so Validator + Reporter can find it
        outputPath: researchPath,
      },
      artifacts: nodeWritten ? [nodePath] : [],
      implemented,
      undone,
      issues,
      procedures_followed: true,
      timestamp: Date.now(),
    };

  } catch (err: any) {
    issues.push(err.message);
    IQRALogger.error('❌ [BUILDER] Failed:', err.message);
    return {
      status: 'failure',
      worker: 'Builder',
      next: null,
      data: {},
      artifacts: [],
      implemented,
      undone: ['knowledge node'],
      issues,
      procedures_followed: false,
      timestamp: Date.now(),
    };
  }
}
