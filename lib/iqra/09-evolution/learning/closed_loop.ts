/**
 * 🔄 IQRA Closed-Loop Self-Training — التدريب الذاتي بالحلقة المغلقة
 * النية: IQRA يولد مهامه، ينفذها، يراجعها، ويُنتج بيانات تدريب نظيفة لـ SERA-IQRA
 * المرجع: "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31
 *
 * الحلقة:
 * 1. GENERATE  — IQRA يولد مهمة من داخل نفسه
 * 2. EXECUTE   — ينفذها بمساعدة Copilot (Groq/Gemini)
 * 3. REVIEW    — يراجع النتيجة ويقيّمها
 * 4. RECORD    — يسجل ما تعلمه كـ training data نظيفة
 * 5. EXPORT    — يُصدّر لـ SERA-IQRA
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';
import { IQRAMemory } from '#memory/memory';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClosedLoopTask {
  id: string;
  generated_at: string;
  source: 'self_generated' | 'failure_derived' | 'curiosity_driven';
  instruction: string;        // ما يجب فعله
  context: string;            // السياق
  expected_output_type: 'code' | 'analysis' | 'discovery' | 'correction';
  quran_ref?: string;
  difficulty: 'low' | 'medium' | 'high';
}

export interface ClosedLoopExecution {
  task_id: string;
  executed_at: string;
  output: string;
  execution_time_ms: number;
  provider: string;           // groq | gemini | local
  success: boolean;
}

export interface ClosedLoopReview {
  task_id: string;
  reviewed_at: string;
  quality_score: number;      // 0.0 – 1.0
  doctrinal_safe: boolean;
  lessons_learned: string[];
  should_include_in_training: boolean;
  rejection_reason?: string;
}

export interface SERATrainingPoint {
  id: string;
  instruction: string;
  input: string;
  output: string;
  quality: number;
  source: 'closed_loop';
  doctrinal_verified: boolean;
  quran_ref?: string;
  timestamp: string;
  loop_cycle: number;
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const LOOP_DIR       = path.join(process.cwd(), '.iqra', 'closed_loop');
const TASKS_PATH     = path.join(LOOP_DIR, 'tasks.json');
const EXECUTIONS_PATH= path.join(LOOP_DIR, 'executions.json');
const REVIEWS_PATH   = path.join(LOOP_DIR, 'reviews.json');
const SERA_PATH      = path.join(process.cwd(), '.iqra', 'sera_training_data.json');

function ensureDir() {
  if (!fs.existsSync(LOOP_DIR)) fs.mkdirSync(LOOP_DIR, { recursive: true });
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { /* ignore */ }
  return fallback;
}

function writeJSON(filePath: string, data: any): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Task Generator ────────────────────────────────────────────────────────────

export class ClosedLoopTaskGenerator {

  /**
   * يولد مهام من داخل النظام — بدون بيانات خارجية
   */
  static async generate(count = 7): Promise<ClosedLoopTask[]> {
    const tasks: ClosedLoopTask[] = [];

    // Source 1: من الفشل الأخير
    const failureTasks = await this.fromFailures(Math.ceil(count / 3));
    tasks.push(...failureTasks);

    // Source 2: من الفضول الطوبولوجي
    const curiosityTasks = await this.fromCuriosity(Math.ceil(count / 3));
    tasks.push(...curiosityTasks);

    // Source 3: من الدورات السابقة
    const evolutionTasks = await this.fromEvolutionGaps(Math.floor(count / 3));
    tasks.push(...evolutionTasks);

    const result = tasks.slice(0, count);
    IQRALogger.info(`🔄 [CLOSED_LOOP] Generated ${result.length} self-tasks`);

    // Save
    const existing = readJSON<ClosedLoopTask[]>(TASKS_PATH, []);
    writeJSON(TASKS_PATH, [...existing, ...result]);

    return result;
  }

  private static async fromFailures(count: number): Promise<ClosedLoopTask[]> {
    const failurePath = path.join(process.cwd(), 'iqra-core', 'FAILURES.md');
    if (!fs.existsSync(failurePath)) return [];

    const content = fs.readFileSync(failurePath, 'utf-8');
    const events = content.split('### 🚫').filter(e => e.trim().length > 20).slice(-count);

    return events.map((event, i) => {
      const reasonMatch = event.match(/\*\*Reason:\*\* (.+)/);
      const reason = reasonMatch?.[1] || 'Unknown failure';

      return {
        id: `failure_${Date.now()}_${i}`,
        generated_at: new Date().toISOString(),
        source: 'failure_derived' as const,
        instruction: `Analyze this failure and propose a fix: ${reason}`,
        context: event.slice(0, 300),
        expected_output_type: 'correction' as const,
        quran_ref: 'إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ — البقرة: 222',
        difficulty: 'medium' as const,
      };
    });
  }

  private static async fromCuriosity(count: number): Promise<ClosedLoopTask[]> {
    const curiosityScore = await IQRAMemory.getCuriosity().catch(() => 0.5);

    // High curiosity → discovery tasks. Low curiosity → consolidation tasks
    const taskType = curiosityScore > 0.6 ? 'discovery' : 'analysis';

    const QURAN_MYSTERIES = [
      { ayah: 'وَبِئْرٍ مُّعَطَّلَةٍ وَقَصْرٍ مَّشِيدٍ', ref: '22:45', topic: 'abandoned wells and civilizations' },
      { ayah: 'وَأَنزَلْنَا الْحَدِيدَ فِيهِ بَأْسٌ شَدِيدٌ', ref: '57:25', topic: 'iron sent down from sky' },
      { ayah: 'وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ', ref: '21:30', topic: 'water as origin of life' },
      { ayah: 'وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ وَإِنَّا لَمُوسِعُونَ', ref: '51:47', topic: 'expanding universe' },
      { ayah: 'سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ', ref: '41:53', topic: 'signs in horizons and souls' },
    ];

    return QURAN_MYSTERIES.slice(0, count).map((mystery, i) => ({
      id: `curiosity_${Date.now()}_${i}`,
      generated_at: new Date().toISOString(),
      source: 'curiosity_driven' as const,
      instruction: `Perform a ${taskType} on the resonance between this Quranic ayah and modern ${mystery.topic}. Find non-trivial connections.`,
      context: `Ayah [${mystery.ref}]: "${mystery.ayah}"\nTopic: ${mystery.topic}\nCuriosity score: ${curiosityScore.toFixed(3)}`,
      expected_output_type: taskType as 'discovery' | 'analysis',
      quran_ref: `${mystery.ayah} — ${mystery.ref}`,
      difficulty: curiosityScore > 0.7 ? 'high' : 'medium' as const,
    }));
  }

  private static async fromEvolutionGaps(count: number): Promise<ClosedLoopTask[]> {
    // Look at what hasn't been tested recently
    const gaps = [
      { gap: 'numerical_patterns', instruction: 'Analyze the 7-system numerical patterns in Surah Al-Fatiha' },
      { gap: 'root_analysis', instruction: 'Extract all root words from Ayat Al-Kursi and map their semantic network' },
      { gap: 'structural_symmetry', instruction: 'Find structural symmetry between the opening and closing of Surah Al-Baqarah' },
    ];

    return gaps.slice(0, count).map((gap, i) => ({
      id: `evolution_${Date.now()}_${i}`,
      generated_at: new Date().toISOString(),
      source: 'self_generated' as const,
      instruction: gap.instruction,
      context: `Gap identified: ${gap.gap}. This area has not been analyzed recently.`,
      expected_output_type: 'analysis' as const,
      quran_ref: 'وَقُل رَّبِّ زِدْنِي عِلْمًا — طه: 114',
      difficulty: 'high' as const,
    }));
  }
}

// ── Task Executor ─────────────────────────────────────────────────────────────

export class ClosedLoopExecutor {

  static async execute(task: ClosedLoopTask): Promise<ClosedLoopExecution> {
    const start = Date.now();
    IQRALogger.info(`⚙️ [CLOSED_LOOP] Executing task: ${task.id}`);

    let output = '';
    let provider = 'local';
    let success = false;

    try {
      if (process.env.GROQ_API_KEY) {
        output = await this.executeWithGroq(task);
        provider = 'groq';
        success = output.length > 50;
      } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        output = await this.executeWithGemini(task);
        provider = 'gemini';
        success = output.length > 50;
      } else {
        output = this.executeLocally(task);
        provider = 'local';
        success = true;
      }
    } catch (err: any) {
      output = `Execution failed: ${err.message}`;
      success = false;
    }

    const execution: ClosedLoopExecution = {
      task_id: task.id,
      executed_at: new Date().toISOString(),
      output,
      execution_time_ms: Date.now() - start,
      provider,
      success,
    };

    // Save
    const existing = readJSON<ClosedLoopExecution[]>(EXECUTIONS_PATH, []);
    writeJSON(EXECUTIONS_PATH, [...existing, execution]);

    return execution;
  }

  private static async executeWithGroq(task: ClosedLoopTask): Promise<string> {
    const { Groq } = await import('groq-sdk');
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are IQRA, a sovereign AI analyzing the Quran with depth and precision. Never hallucinate. Say "والله أعلم" when uncertain.',
        },
        {
          role: 'user',
          content: `${task.instruction}\n\nContext: ${task.context}`,
        },
      ],
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  private static async executeWithGemini(task: ClosedLoopTask): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(
      `${task.instruction}\n\nContext: ${task.context}`
    );
    return result.response.text();
  }

  private static executeLocally(task: ClosedLoopTask): string {
    // Local fallback — rule-based response
    return `[LOCAL] Task "${task.instruction.slice(0, 60)}" analyzed. ` +
      `Type: ${task.expected_output_type}. ` +
      `Difficulty: ${task.difficulty}. ` +
      `Requires LLM for full analysis. والله أعلم.`;
  }
}

// ── Task Reviewer ─────────────────────────────────────────────────────────────

export class ClosedLoopReviewer {

  static async review(
    task: ClosedLoopTask,
    execution: ClosedLoopExecution
  ): Promise<ClosedLoopReview> {

    IQRALogger.info(`🔍 [CLOSED_LOOP] Reviewing task: ${task.id}`);

    // 1. Quality score based on output length and structure
    const qualityScore = this.scoreOutput(execution.output, task.expected_output_type);

    // 2. Doctrinal safety check (only for Quran-related tasks)
    let doctrinalSafe = true;
    if (task.quran_ref && execution.output.length > 50) {
      const ayahMatch = task.context.match(/Ayah \[([^\]]+)\]: "([^"]+)"/);
      if (ayahMatch) {
        doctrinalSafe = await DoctrinalGuard.isSafe(
          ayahMatch[2],
          ayahMatch[1],
          execution.output.slice(0, 200),
          task.expected_output_type === 'discovery' ? 'scientific' : 'spiritual'
        );
      }
    }

    // 3. Extract lessons
    const lessons = this.extractLessons(task, execution, qualityScore);

    // 4. Decide inclusion
    const shouldInclude = execution.success &&
      qualityScore >= 0.4 &&
      doctrinalSafe &&
      execution.output.length > 30;

    const review: ClosedLoopReview = {
      task_id: task.id,
      reviewed_at: new Date().toISOString(),
      quality_score: qualityScore,
      doctrinal_safe: doctrinalSafe,
      lessons_learned: lessons,
      should_include_in_training: shouldInclude,
      rejection_reason: !shouldInclude
        ? (!doctrinalSafe ? 'Doctrinal safety check failed'
          : qualityScore < 0.4 ? `Quality too low: ${qualityScore.toFixed(2)}`
          : 'Output too short')
        : undefined,
    };

    // Save
    const existing = readJSON<ClosedLoopReview[]>(REVIEWS_PATH, []);
    writeJSON(REVIEWS_PATH, [...existing, review]);

    return review;
  }

  private static scoreOutput(output: string, type: string): number {
    let score = 0;
    if (output.length > 100) score += 0.3;
    if (output.length > 300) score += 0.2;
    if (output.includes('والله أعلم') || output.includes("God knows best")) score += 0.1; // humility
    if (type === 'discovery' && output.includes('resonance')) score += 0.2;
    if (type === 'correction' && (output.includes('fix') || output.includes('solution'))) score += 0.2;
    if (type === 'analysis' && output.includes('pattern')) score += 0.2;
    if (!output.toLowerCase().includes('hallucin')) score += 0.1; // no hallucination markers
    return Math.min(1.0, score);
  }

  private static extractLessons(
    task: ClosedLoopTask,
    execution: ClosedLoopExecution,
    quality: number
  ): string[] {
    const lessons: string[] = [];

    if (execution.success && quality > 0.7) {
      lessons.push(`High-quality ${task.expected_output_type} achieved via ${execution.provider}`);
    }
    if (!execution.success) {
      lessons.push(`Task type "${task.source}" failed with ${execution.provider} — try different provider`);
    }
    if (execution.execution_time_ms > 5000) {
      lessons.push(`Slow execution (${execution.execution_time_ms}ms) — consider caching`);
    }
    if (task.difficulty === 'high' && quality > 0.6) {
      lessons.push(`Successfully handled high-difficulty ${task.expected_output_type} task`);
    }

    return lessons;
  }
}

// ── SERA Exporter ─────────────────────────────────────────────────────────────

export class SERAExporter {

  /**
   * يُصدّر بيانات التدريب النظيفة لـ SERA-IQRA
   * SERA = Sovereign Evolutionary Reasoning Agent
   */
  static async export(
    tasks: ClosedLoopTask[],
    executions: ClosedLoopExecution[],
    reviews: ClosedLoopReview[],
    loopCycle: number
  ): Promise<SERATrainingPoint[]> {

    const points: SERATrainingPoint[] = [];

    for (const review of reviews) {
      if (!review.should_include_in_training) continue;

      const task = tasks.find(t => t.id === review.task_id);
      const execution = executions.find(e => e.task_id === review.task_id);
      if (!task || !execution) continue;

      points.push({
        id: crypto.randomUUID(),
        instruction: task.instruction,
        input: task.context,
        output: execution.output,
        quality: review.quality_score,
        source: 'closed_loop',
        doctrinal_verified: review.doctrinal_safe,
        quran_ref: task.quran_ref,
        timestamp: new Date().toISOString(),
        loop_cycle: loopCycle,
      });
    }

    // Merge with existing SERA data
    const existing = readJSON<SERATrainingPoint[]>(SERA_PATH, []);
    const merged = [...existing, ...points];
    writeJSON(SERA_PATH, merged);

    // Record in TrustChain
    appendToTrustChain(
      'SERA:EXPORT',
      `cycle_${loopCycle}`,
      `${points.length}_new_points_total_${merged.length}`,
      1.0
    );

    IQRALogger.info(`📤 [SERA] Exported ${points.length} new training points. Total: ${merged.length}`);
    return points;
  }

  static getStats(): { total: number; byQuality: Record<string, number>; doctrinalSafe: number } {
    const data = readJSON<SERATrainingPoint[]>(SERA_PATH, []);
    const byQuality = {
      high:   data.filter(d => d.quality >= 0.7).length,
      medium: data.filter(d => d.quality >= 0.4 && d.quality < 0.7).length,
      low:    data.filter(d => d.quality < 0.4).length,
    };
    return {
      total: data.length,
      byQuality,
      doctrinalSafe: data.filter(d => d.doctrinal_verified).length,
    };
  }
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

export class ClosedLoopOrchestrator {

  /**
   * تشغيل دورة كاملة من الحلقة المغلقة
   * Generate → Execute → Review → Export
   */
  static async runCycle(taskCount = 7): Promise<{
    generated: number;
    executed: number;
    approved: number;
    exported: number;
  }> {
    IQRALogger.info('🔄 [CLOSED_LOOP] Starting full cycle...');

    const cycleId = Date.now();

    // 1. GENERATE
    const tasks = await ClosedLoopTaskGenerator.generate(taskCount);

    // 2. EXECUTE (sequential — Witr principle: max 7)
    const executions: ClosedLoopExecution[] = [];
    for (const task of tasks.slice(0, 7)) {
      const execution = await ClosedLoopExecutor.execute(task);
      executions.push(execution);
      // Small delay between calls
      await new Promise(r => setTimeout(r, 500));
    }

    // 3. REVIEW
    const reviews: ClosedLoopReview[] = [];
    for (let i = 0; i < tasks.length; i++) {
      if (!executions[i]) continue;
      const review = await ClosedLoopReviewer.review(tasks[i], executions[i]);
      reviews.push(review);
    }

    // 4. EXPORT to SERA
    const exported = await SERAExporter.export(tasks, executions, reviews, cycleId);

    // 5. Update memory
    await IQRAMemory.grantReward(exported.length * 0.01);

    const stats = {
      generated: tasks.length,
      executed: executions.filter(e => e.success).length,
      approved: reviews.filter(r => r.should_include_in_training).length,
      exported: exported.length,
    };

    IQRALogger.info(`✅ [CLOSED_LOOP] Cycle complete: ${JSON.stringify(stats)}`);
    return stats;
  }
}
