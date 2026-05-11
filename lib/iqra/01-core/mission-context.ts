/**
 * 🌙 IQRA Mission Context — سياق المهمة
 * النية: تعريف العقود المشتركة بين جميع العمال
 * المرجع: "وَأَمْرُهُمْ شُورَىٰ بَيْنَهُمْ" — الشورى: 38
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES (الدستور المضمّن)
 * ══════════════════════════════════════════════════════════════
 * 1. كل حقل يجب أن يكون له قيمة حقيقية — لا undefined ولا null.
 * 2. لا mock ولا simulated provider إلا إذا كان dev_mode: true صريحاً.
 * 3. parseMissionScope تُجهض المهمة فوراً إذا وجدت simulated بدون إذن.
 * 4. لا تقل "تم" بدون diff أو اختبار أو مسار ملف.
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ── MissionScope — ما يُقرأ من mission-scope.yml ──────────────────────────────

export interface MissionScope {
  mission_id: string;
  version?: string;
  objective: string;
  verse: string;                          // e.g. "2:255" — مطلوب، لا يقبل فارغاً
  field_of_inquiry: string;
  provider?: 'google' | 'groq' | 'simulated';
  model?: string;
  allowed_tools?: string[];
  validation_rules?: string[];
  success_criteria?: string[];
  status: 'planned' | 'running' | 'completed' | 'failed';
  workers?: Array<{ id: string; role: string; skills: string[] }>;

  // ── No-Mock Gate (القاعدة ٢) ─────────────────────────────────────────────
  // يجب أن يكون true صريحاً في ملف المهمة لتشغيل provider: simulated.
  // في الإنتاج يُترك غائباً أو false.
  dev_mode?: boolean;
}

// ── MissionContext — يُمرَّر بين العمال ──────────────────────────────────────

export interface CycleMetadata {
  count: number;           // عدد الدورات الحالية
  maxCycles: number;       // الحد الأقصى للدورات (default: 3)
  history: string[];       // سجل الانتقالات بين العمال
}

export interface MissionContext {
  missionId: string;
  scope: MissionScope;
  workingDir: string;                     // temp dir for artifacts
  previousOutput: Record<string, any> | null;
  startTime: number;
  
  // 🔄 P0 Fix: Cycle counter to prevent infinite loops
  cycles?: CycleMetadata;
}

// ── HandoffResult — ما يُعيده كل عامل ────────────────────────────────────────

export interface CommandExecution {
  command: string;
  exitCode: number;
}

export interface HandoffResult {
  status: 'success' | 'failure';
  worker: string;
  next: string | null;
  data: Record<string, any>;
  artifacts: string[];                    // file paths created
  implemented: string[];
  undone: string[];
  commands_run: CommandExecution[];
  issues: string[];
  procedures_followed: boolean;
  timestamp: number;
}

// ── Parser ────────────────────────────────────────────────────────────────────

export function parseMissionScope(scopePath: string): MissionScope {
  if (!fs.existsSync(scopePath)) {
    throw new Error(`INTEGRITY_ERR: mission-scope.yml not found at ${scopePath}`);
  }

  const raw = fs.readFileSync(scopePath, 'utf-8');   // [read]
  const parsed = yaml.load(raw) as MissionScope;

  // ── Validate required fields ──────────────────────────────────────────────
  if (!parsed.mission_id)       throw new Error('INTEGRITY_ERR: mission_id is required');
  if (!parsed.objective)        throw new Error('INTEGRITY_ERR: objective is required');
  if (!parsed.verse)            throw new Error('INTEGRITY_ERR: verse is required');
  if (!parsed.field_of_inquiry) throw new Error('INTEGRITY_ERR: field_of_inquiry is required');

  // ── Verse format check ────────────────────────────────────────────────────
  if (!parsed.verse.match(/^\d+:\d+$/)) {
    throw new Error(
      `INTEGRITY_ERR: verse must be in "surah:ayah" format (e.g. "2:255"), got: "${parsed.verse}"`
    );
  }

  // ── No-Mock Gate (القاعدة ٢) ─────────────────────────────────────────────
  // إذا كان provider = simulated ولم يكن dev_mode = true → أجهض فوراً.
  const resolvedProvider = parsed.provider || 'google';
  if (resolvedProvider === 'simulated' && parsed.dev_mode !== true) {
    throw new Error(
      'NO_MOCK_ERR: provider "simulated" is forbidden in production. ' +
      'Add "dev_mode: true" to the mission file to allow simulation in development.'
    );
  }

  return {
    ...parsed,
    status: parsed.status || 'planned',
    provider: resolvedProvider,
    dev_mode: parsed.dev_mode ?? false,
  };
}

export function updateMissionStatus(
  scopePath: string,
  scope: MissionScope,
  status: MissionScope['status']
): void {
  const updated = { ...scope, status };
  fs.writeFileSync(scopePath, yaml.dump(updated), 'utf-8');
}

// ── validateProvider — مُصدَّرة للاستخدام المباشر ────────────────────────────
/**
 * يتحقق من أن provider ليس simulated في بيئة الإنتاج.
 * يُستخدم كـ utility مستقلة خارج parseMissionScope.
 *
 * @throws NO_MOCK_ERR إذا كان provider = simulated بدون dev_mode: true
 */
export function validateProvider(
  provider: string | undefined,
  devMode: boolean | undefined,
  missionId: string
): void {
  const resolved = provider ?? 'google';
  if (resolved === 'simulated' && devMode !== true) {
    throw new Error(
      `NO_MOCK_ERR: Mission "${missionId}" uses provider "simulated" ` +
      `without dev_mode: true. ` +
      `This is a constitutional violation (MĪTHĀQ §2). ` +
      `Add "dev_mode: true" to allow simulation in development only.`
    );
  }
}

// ── Cycle Management — إدارة الدورات ─────────────────────────────────────────

const DEFAULT_MAX_CYCLES = 3;

/**
 * Initialize cycle metadata for a new mission
 */
export function initCycles(): CycleMetadata {
  return {
    count: 0,
    maxCycles: DEFAULT_MAX_CYCLES,
    history: []
  };
}

/**
 * Increment cycle count and check if max cycles reached
 * @throws Error if max cycles exceeded (prevents infinite loops)
 */
export function incrementCycle(
  cycles: CycleMetadata | undefined,
  workerTransition: string
): CycleMetadata {
  const current = cycles ?? initCycles();
  
  const newCount = current.count + 1;
  
  if (newCount > current.maxCycles) {
    throw new Error(
      `MAX_CYCLES_REACHED: Mission exceeded maximum allowed cycles (${current.maxCycles}). ` +
      `Transition attempted: ${workerTransition}. ` +
      `History: ${current.history.join(' -> ')}. ` +
      `This indicates a potential infinite loop in worker handoffs.`
    );
  }
  
  return {
    ...current,
    count: newCount,
    history: [...current.history, workerTransition]
  };
}

/**
 * Check if max cycles would be exceeded (non-throwing version)
 */
export function wouldExceedMaxCycles(cycles: CycleMetadata | undefined): boolean {
  const current = cycles ?? initCycles();
  return current.count >= current.maxCycles;
}
