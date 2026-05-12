/**
 * 📋 Planner Worker — عامل التخطيط
 * النية: تحويل MissionScope إلى خطة عمل مفصلة بدون LLM
 * المرجع: "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ" — آل عمران: 159
 *
 * القاعدة: Planner لا يستخدم LLM — فقط يُرتب ويُهيكل.
 * القاعدة: Planner لا يُنفذ — فقط يُخطط.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { MissionContext, HandoffResult } from '../01-core/mission-context'
import { appendToTrustChain } from '#security/security';
import { IQRALogger } from '#infra/logger';
import { SkillBank } from '../08-skills/skill_bank'

export interface PlanStep {
  id: string;
  description: string;
  worker: string;
  tools: string[];
  expected_output: string;
  subtasks?: string[];
  risk_mitigation?: string;
}

export interface MissionPlan {
  mission_id: string;
  created_at: string;
  verse: string;
  field_of_inquiry: string;
  steps: PlanStep[];
  success_condition: string;
  validation_rules: string[];
  historical_context?: {
    identified_risks: string[];
    previous_failures: string[];
    available_skills: string[];
  };
}

function analyzeExperience(workingDir: string): { risks: string[], failures: string[] } {
  const risks: string[] = [];
  const failures: string[] = [];

  const rootFailuresPath = path.join(process.cwd(), 'FAILURES.md');
  const coreFailuresPath = path.join(process.cwd(), 'iqra-core', 'FAILURES.md');

  [rootFailuresPath, coreFailuresPath].forEach(p => {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      if (content.includes('CONNECTION_FAILURE')) {
        risks.push('High probability of provider connection timeout. Require retry logic.');
      }
      if (content.includes('Doctrinal Hallucination')) {
        risks.push('Pattern of stretching Ayah meanings detected. Require strict counter-argument validation.');
      }
      if (content.includes('Pollution Event')) {
        risks.push('Potential for forbidden concepts (lying, injustice) in research data.');
      }
    }
  });

  return { risks, failures };
}

export async function executePlanner(context: MissionContext): Promise<HandoffResult> {
  const { scope, workingDir } = context;
  const implemented: string[] = [];
  const issues: string[] = [];

  IQRALogger.info(`📋 [PLANNER] Starting mission: ${scope.mission_id}`);

  try {
    const experience = analyzeExperience(workingDir);
    const availableSkills = SkillBank.listSkills();
    const skillsContent = availableSkills.map(s => SkillBank.getSkillContent(s)).filter(Boolean);

    // Build deterministic plan from scope
    const plan: MissionPlan = {
      mission_id: scope.mission_id,
      created_at: new Date().toISOString(),
      verse: scope.verse,
      field_of_inquiry: scope.field_of_inquiry,
      historical_context: {
        identified_risks: experience.risks,
        previous_failures: experience.failures,
        available_skills: availableSkills,
      },
      steps: [
        {
          id: 'research',
          description: `ابحث عن الرنين بين الآية [${scope.verse}] ومجال "${scope.field_of_inquiry}"`,
          worker: 'Researcher',
          tools: scope.allowed_tools || ['VectorEngine', 'TopologicalCuriosity', 'TruthDiscoveryGo'],
          expected_output: 'research_output.json',
          subtasks: [
            'Data Gathering (Multi-source)',
            'Topological Pattern Extraction (Go)',
            'Sincerity Filter (Dastūr check)',
          ],
          risk_mitigation: experience.risks.find(r => r.includes('connection')) ? 'Implement exponential backoff on fetch' : undefined,
        },
        {
          id: 'build',
          description: 'بناء عقدة معرفة Markdown من نتائج البحث',
          worker: 'Builder',
          tools: ['knowledge_encoder'],
          expected_output: `knowledge/node-${scope.mission_id}.md`,
          subtasks: [
            'Markdown Structuring',
            'Cross-referencing with experience_archive',
            'Applying Congzi lens',
          ],
        },
        {
          id: 'validate',
          description: 'التحقق من سلامة العقدة — لا هلوسة، لا كذب، الآية موجودة',
          worker: 'Validator',
          tools: ['DoctrinalGuard', 'IQRAFilter'],
          expected_output: 'validation_report.json',
          subtasks: [
            'Hallucination Check',
            'Authenticity Verification',
            'Anti-pollution scan',
          ],
          risk_mitigation: 'Strict enforcement of counter-arguments to avoid stretching meanings.',
        },
        {
          id: 'report',
          description: 'حساب المكافأة وتوثيق التعلم',
          worker: 'Reporter',
          tools: ['RewardEngine', 'IQRAMemory', 'ExperienceArchiver'],
          expected_output: 'ledger/rewards.jsonl',
          subtasks: [
            'Reward calculation',
            'Writing to EXPERIENCE_ARCHIVE.md',
            'Generating storytelling commit',
          ],
        },
      ],
      success_condition: 'resonance_score >= 0.7 AND verdict == PASS',
      validation_rules: scope.validation_rules || [
        'Every resonance claim must include a Quranic ayah reference.',
        'No reward is final until validation_status == verified.',
        'Must pass the Sincerity Filter (No lies, no stretches).',
      ],
    };

    // Write plan to working dir
    const planPath = path.join(workingDir, 'plan_output.yaml');
    fs.writeFileSync(planPath, yaml.dump(plan), 'utf-8');
    implemented.push(`plan_output.yaml written with ${plan.steps.length} smart steps`);
    implemented.push(`Injected ${experience.risks.length} risk mitigations from memory`);

    IQRALogger.info(`📋 [PLANNER] Smart Plan written: ${planPath}`);

    // TrustChain
    appendToTrustChain(
      'PLANNER:PLAN_CREATED',
      scope.mission_id,
      `steps:${plan.steps.length}`,
      1.0
    );

    return {
      status: 'success',
      worker: 'Planner',
      next: 'Builder',
      data: {
        plan,
        planPath,
      },
      artifacts: [planPath],
      implemented,
      undone: [],
      issues,
      procedures_followed: true,
      timestamp: Date.now(),
      commands_run: [],
    };

  } catch (err: any) {
    issues.push(`Planner error: ${err.message}`);
    IQRALogger.error('❌ [PLANNER] Failed:', err);
    return {
      status: 'failure',
      worker: 'Planner',
      next: null,
      data: {},
      artifacts: [],
      implemented,
      undone: ['planning'],
      issues,
      procedures_followed: false,
      timestamp: Date.now(),
      commands_run: [],
    };
  }
}
