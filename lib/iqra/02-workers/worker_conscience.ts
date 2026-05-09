// بسم الله الرحمن الرحيم

/**
 * 🫀 WorkerConscience — حارس الضمير للعمال
 *
 * "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 *
 * دالة مساعدة تُدمج DamirConscience في بداية كل execute.
 * إذا فشل الضمير → يُرفع SovereignError فوراً (التوبة الفورية).
 *
 * الاستخدام:
 *   await assertConscience(this.id, this.intention, state.metadata.mission_id);
 */

import { DamirConscience } from '../damir_conscience.ts';
import { ResourceFactory } from '../conscience/resource_factory.ts';
import { SovereignError, SovereignErrorCode } from '../../../src/errors/sovereign_error.ts';
import { logToIQRAFile, appendToTrustChain } from '../security.ts';
import { IQRALogger } from '../12-infrastructure/logger.js';

// ── Singleton per-worker (lazy) ───────────────────────────────────────────────
const _workerDamirs = new Map<string, DamirConscience>();

function getDamir(workerId: string): DamirConscience {
  if (!_workerDamirs.has(workerId)) {
    _workerDamirs.set(workerId, new DamirConscience());
  }
  return _workerDamirs.get(workerId)!;
}

// ── assertConscience ──────────────────────────────────────────────────────────

/**
 * يتحقق من الضمير قبل تنفيذ أي worker.
 * إذا رُفض → يُسجَّل في TAWBAH.md ويُرفع SovereignError.
 *
 * @param workerId   - معرّف الوكيل
 * @param intention  - النية المُعلنة
 * @param missionId  - معرّف المهمة
 * @throws SovereignError إذا رفض الضمير
 */
export async function assertConscience(
  workerId: string,
  intention: string,
  missionId: string
): Promise<void> {
  const damir = getDamir(workerId);

  // بناء الموارد
  const { resources } = ResourceFactory.forWorker(workerId, missionId, intention);
  for (const r of resources) damir.registerResource(r);

  const action = {
    id: `${missionId}:${workerId}:${Date.now()}`,
    intention,
    requiredResources: resources,
    agent_id: workerId,
  };

  const verdict = damir.check(action);

  if (!verdict.allowed) {
    // ── التوبة الفورية ────────────────────────────────────────────────────────
    const tawbahEntry = `
### 🛑 [WORKER_CONSCIENCE_BLOCK] ${new Date().toISOString()}
- **Worker**: ${workerId}
- **Mission**: ${missionId}
- **Intention**: ${intention}
- **Reason**: ${verdict.reason}
- **Type**: ${verdict.rejection_type ?? 'unknown'}
- **Confidence**: ${verdict.confidence.toFixed(2)}
- **Latency**: ${verdict.latency_ms}ms
- **Action**: Worker halted. Tawbah initiated.
---`;

    await logToIQRAFile('TAWBAH.md', tawbahEntry);

    appendToTrustChain(
      'WORKER:CONSCIENCE_BLOCK',
      `${missionId}:${workerId}`,
      `BLOCKED reason="${verdict.reason}"`,
      0.0
    );

    IQRALogger.warn(
      `🛑 [${workerId}] Conscience blocked execution: ${verdict.reason}`
    );

    // إعادة ضبط الضمير (التوبة)
    damir.reset();

    // رفع SovereignError
    throw new SovereignError(
      `[DAMIR_BLOCK] Worker "${workerId}" blocked: ${verdict.reason}`,
      SovereignErrorCode.MITHAQ_VIOLATION,
      {
        severity: 'HIGH',
        source: workerId,
        context: { missionId, intention, reason: verdict.reason },
        recovery_strategy: 'HALT',
      }
    );
  }

  // مسموح — استهلاك الموارد
  damir.execute(action);

  IQRALogger.info(
    `✅ [${workerId}] Conscience passed ` +
    `confidence=${verdict.confidence.toFixed(2)} (${verdict.latency_ms}ms)`
  );
}

/**
 * يُعيد ضبط ضمير وكيل محدد (للاستخدام في الاختبارات)
 */
export function resetWorkerConscience(workerId: string): void {
  const damir = _workerDamirs.get(workerId);
  if (damir) damir.reset();
}
