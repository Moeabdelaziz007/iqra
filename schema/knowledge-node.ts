/**
 * 📐 Knowledge Node Schema — مخطط عقدة المعرفة
 * النية: تعريف هيكل موحد لعقد المعرفة القرآنية
 * المرجع: "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES
 * ══════════════════════════════════════════════════════════════
 * 1. كل حقل مطلوب يجب أن يكون له قيمة حقيقية — لا undefined ولا null.
 * 2. validateNode تُجهض إذا كانت البيانات ناقصة أو مشبوهة.
 * 3. serializeToMarkdown تُنتج YAML frontmatter + Markdown body.
 * ══════════════════════════════════════════════════════════════
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KnowledgeNode {
  // ── Identity ────────────────────────────────────────────────────────────────
  mission_id: string;          // لا يقبل فارغاً
  node_id: string;             // kebab-case من mission_id
  created_at: string;          // ISO timestamp

  // ── Quranic Reference ────────────────────────────────────────────────────────
  verse: string;               // "surah:ayah" format e.g. "2:255"
  field_of_inquiry: string;    // المجال العلمي أو التاريخي

  // ── Research Content ─────────────────────────────────────────────────────────
  evidence: string;            // الدليل — min 30 chars
  reasoning: string;           // التفسير — min 10 chars
  source_type: 'scientific' | 'historical' | 'linguistic' | 'numerical' | 'spiritual';

  // ── Scores ───────────────────────────────────────────────────────────────────
  resonance_score: number;     // 0.0 – 1.0 من Researcher
  total_reward: number;        // من RewardEngine — يجب أن يكون >= 0
  discovery_level: string;     // seed | sprout | branch | tree | resonance

  // ── Provenance ───────────────────────────────────────────────────────────────
  provider: string;            // google | groq | simulated
  model: string;
  validation_status: 'pending' | 'verified' | 'rejected';
  is_trivial: boolean;

  // ── Topology (optional — من ResonanceWorker) ─────────────────────────────────
  topological_score?: number;
  pattern_matched?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNode(node: Partial<KnowledgeNode>): ValidationResult {
  const errors: string[] = [];

  // Required string fields
  const requiredStrings: (keyof KnowledgeNode)[] = [
    'mission_id', 'node_id', 'created_at', 'verse',
    'field_of_inquiry', 'evidence', 'reasoning',
    'source_type', 'provider', 'model', 'validation_status', 'discovery_level',
  ];
  for (const field of requiredStrings) {
    const val = node[field];
    if (!val || typeof val !== 'string' || (val as string).trim().length === 0) {
      errors.push(`MISSING_FIELD: ${field} is required and must be a non-empty string`);
    }
  }

  // Verse format
  if (node.verse && !node.verse.match(/^\d+:\d+$/)) {
    errors.push(`INVALID_VERSE: "${node.verse}" must be "surah:ayah" format`);
  }

  // Evidence length
  if (node.evidence && node.evidence.trim().length < 30) {
    errors.push(`SHORT_EVIDENCE: evidence is ${node.evidence.length} chars, minimum 30`);
  }

  // Scores
  if (typeof node.resonance_score !== 'number' || isNaN(node.resonance_score)) {
    errors.push('INVALID_SCORE: resonance_score must be a number');
  } else if (node.resonance_score < 0 || node.resonance_score > 1) {
    errors.push(`OUT_OF_RANGE: resonance_score ${node.resonance_score} not in [0,1]`);
  }

  if (typeof node.total_reward !== 'number' || isNaN(node.total_reward)) {
    errors.push('INVALID_REWARD: total_reward must be a number');
  } else if (node.total_reward < 0) {
    errors.push(`NEGATIVE_REWARD: total_reward ${node.total_reward} is negative`);
  }

  // is_trivial must be boolean
  if (typeof node.is_trivial !== 'boolean') {
    errors.push('INVALID_TYPE: is_trivial must be boolean');
  }

  return { valid: errors.length === 0, errors };
}

// ── Serializer ────────────────────────────────────────────────────────────────

export function serializeToMarkdown(node: KnowledgeNode): string {
  const topologySection = node.topological_score !== undefined
    ? `\n## الرنين الطوبولوجي\n- **درجة الطوبولوجيا**: ${node.topological_score.toFixed(4)}\n- **النمط المكتشف**: ${node.pattern_matched ?? 'GENERIC_RESONANCE'}\n`
    : '';

  return `---
mission_id: "${node.mission_id}"
node_id: "${node.node_id}"
verse: "${node.verse}"
field_of_inquiry: "${node.field_of_inquiry}"
resonance_score: ${node.resonance_score.toFixed(4)}
resonance_candidate: ${node.resonance_score.toFixed(4)}
total_reward: ${node.total_reward.toFixed(4)}
discovery_level: "${node.discovery_level}"
source_type: "${node.source_type}"
is_trivial: ${node.is_trivial}
provider: "${node.provider}"
model: "${node.model}"
created_at: "${node.created_at}"
validation_status: "${node.validation_status}"
---

# اكتشاف: رنين بين الآية والمجال

## الآية الكريمة
**[${node.verse}]**

## المجال
${node.field_of_inquiry}

## الدليل
${node.evidence}

## التفسير
${node.reasoning}

## درجة الرنين
${node.resonance_score.toFixed(4)} / 1.0 — ${node.source_type}

## المكافأة
${node.total_reward.toFixed(4)} (${node.discovery_level})
${topologySection}
---
*بُني هذا الاكتشاف بواسطة IQRA Builder في ${node.created_at}*
*"وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — الزلزلة: 7*
`;
}
