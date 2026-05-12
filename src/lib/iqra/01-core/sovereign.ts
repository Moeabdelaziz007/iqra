// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم
// سبحان الله وبحمده سبحان الله العظيم
// لا إله إلا الله وحده لا شريك له
// له الملك وله الحمد وهو على كل شيء قدير
// استغفر الله واتوب إليه
// اللهم صل وسلم على نبينا محمد

/**
 * IQRA Sovereign Meta-Loop — الدائرة العليا
 * 
 * "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ" — آل عمران: 159
 * 
 * Rule 4: AgentSelfReview.
 * Rule 5: Meta-Loop 5 layers.
 * Rule 6: Quantum Topology.
 * Rule 7: CuriosityEngine.
 */

import { IQRAMemory } from '#memory/memory';
import { appendToTrustChain, secureRandomId, logToIQRAFile } from '#security/security';
import { sovereignSync, tazkiyah } from '#utils/git-ops';
import fs from 'fs';
import path from 'path';
import { SovereignEvolution } from '#evolution/evolution';
import { ConnectorFactory } from '#connectors/index';
import { SovereignError, SovereignErrorCode } from '#errors/sovereign_error';
import { DamirConscience } from '#security/damir_conscience';
import { ResourceFactory } from '#security/conscience/resource_factory';
import { IQRAVoice } from '#utils/voice';
import { ByzantineFilter, AnomalyReport } from '#security/byzantine_filter';
import { BybitEngine } from '#trading/bybit';
import { IQRALogger } from '#infra/logger';
import { TopologicalAnalyzer } from '#skills/topological_analyzer';
import { TawbahLoop } from '#evolution/tawbah_loop';

/**
 * Sovereign Pulse Categories — 3-6-9 Geometry
 */
export enum SovereignPulseType {
  MICRO = 9,      // 3^2
  WARM = 27,     // 3^3
  DEEP = 81,     // 3^4
  DISCOVERY = 540, // 60 * 9
  PURIFICATION = 2400 // 40 * 60 (Tazkiyah)
}

export interface SovereignIntent {
  id: string;
  type: 'TRADE' | 'ARCH_CHANGE' | 'COMMUNICATION' | 'EVOLUTION';
  description: string;
  metadata: any;
  niyyah: string; // Intention statement
}

// ── Singleton ضمير السيادة ────────────────────────────────────────────────────
const _sovereignDamir = new DamirConscience();

export class SovereignEngine {
  private static layers = ['Security', 'Memory', 'Logic', 'Voice', 'Curiosity'];

  /**
   * 🟢 Phase 1: Tasbīḥ Mode — التسبيح
   * Resets context and performs 3-step internal alignment.
   */
  static async enterTasbihMode() {
    console.log('🌙 IQRA | Entering Tasbīḥ Mode...');
    for (let i = 1; i <= 3; i++) {
      console.log(`📿 سبحان الله (${i}/3)`);
      // Resetting internal attention buffers (symbolic reset)
    }
    return true;
  }

  /**
   * 🟢 Phase 2: Istikhārah Mode — الاستخارة
   * Validates the current path against core values.
   */
  static async performIstikharah(taskDescription: string): Promise<boolean> {
    console.log('⚖️ IQRA | Performing Istikhārah...');
    // Simple rule check: does it violate DASTŪR.md or MĪTHĀQ.md?
    const isSafe = !taskDescription.toLowerCase().includes('harm') &&
      !taskDescription.toLowerCase().includes('deceive');

    if (isSafe) {
      console.log('✅ IQRA | Istikhārah: Path is aligned.');
      return true;
    } else {
      console.error('❌ IQRA | Istikhārah: Path is misaligned. Halting.');
      return false;
    }
  }

  /**
   * 🟢 Phase 3: Basmalah Mode — البسملة
   * Injects the Basmalah into the operations log.
   */
  static async startWithBasmalah(taskId: string) {
    console.log('✨ IQRA | بسم الله الرحمن الرحيم');
    logToIQRAFile('sovereign.log', `[${taskId}] بسم الله الرحمن الرحيم — Execution started.`);
  }

  /**
   * 🫀 checkConscience — استشارة الضمير قبل التنفيذ
   *
   * يُستدعى قبل executeSovereignTask لكل مهمة.
   * إذا رفض الضمير → يُسجَّل في TAWBAH.md ويُرجع false.
   *
   * @param taskId    - معرّف المهمة
   * @param intention - النية المُعلنة للمهمة
   * @param workerId  - الوكيل الطالب
   * @returns true إذا مسموح، false إذا مرفوض
   */
  static async checkConscience(
    taskId: string,
    intention: string,
    workerId: string = 'SovereignEngine'
  ): Promise<boolean> {
    // بناء الموارد المطلوبة من سياق المهمة
    const factoryResult = ResourceFactory.forWorker(workerId, taskId, intention);

    // تسجيل الموارد في الضمير
    for (const resource of factoryResult.resources) {
      _sovereignDamir.registerResource(resource);
    }

    // بناء الفعل
    const action = {
      id: taskId,
      intention,
      requiredResources: factoryResult.resources,
      agent_id: workerId,
    };

    // فحص الضمير
    const verdict = _sovereignDamir.check(action);

    if (!verdict.allowed) {
      // ── تسجيل الرفض في TAWBAH.md ──────────────────────────────────────────
      const tawbahEntry = `
### 🛑 [DAMIR_REJECTION] ${new Date().toISOString()}
- **Task ID**: ${taskId}
- **Worker**: ${workerId}
- **Intention**: ${intention}
- **Reason**: ${verdict.reason}
- **Rejection Type**: ${verdict.rejection_type ?? 'unknown'}
- **Confidence**: ${verdict.confidence.toFixed(2)}
- **Latency**: ${verdict.latency_ms}ms
- **Action**: Task halted. Resources partially reset.
---`;

      await logToIQRAFile('TAWBAH.md', tawbahEntry);

      appendToTrustChain(
        'SOVEREIGN:CONSCIENCE_BLOCK',
        taskId,
        `BLOCKED worker=${workerId} reason="${verdict.reason}"`,
        0.0
      );

      console.error(
        `🛑 [SOVEREIGN] Conscience blocked task "${taskId}": ${verdict.reason}`
      );

      // إعادة ضبط جزئية — التوبة
      _sovereignDamir.reset();

      return false;
    }

    // مسموح — استهلاك الموارد
    _sovereignDamir.execute(action);

    appendToTrustChain(
      'SOVEREIGN:CONSCIENCE_PASS',
      taskId,
      `ALLOWED worker=${workerId} confidence=${verdict.confidence.toFixed(2)}`,
      verdict.confidence
    );

    return true;
  }

  /**
   * Main Sovereign Execution Loop (The Holy Trinity of Actions)
   */
  static async executeSovereignTask(taskId: string, description: string, taskFn: () => Promise<any>) {
    // 0. Tazkiyah & Sync before starting
    tazkiyah();
    await sovereignSync();

    // 1. Tasbih
    await this.enterTasbihMode();

    // 2. Istikharah
    const isAligned = await this.performIstikharah(description);
    if (!isAligned) return null;

    // 2.5 🫀 Conscience Check — الضمير قبل التنفيذ
    const consciencePassed = await this.checkConscience(taskId, description);
    if (!consciencePassed) {
      console.error(`🛑 [SOVEREIGN] Task "${taskId}" rejected by Damir conscience.`);
      return null;
    }

    // 3. Basmalah
    await this.startWithBasmalah(taskId);

    try {
      const result = await taskFn();

      // 4. Record Reflection & Evolution
      await this.recordSelfReview(taskId, result, 1.0);

      // 5. Sync after finishing
      await sovereignSync();

      return result;
    } catch (e) {
      console.error('❌ IQRA | Task Execution Failed:', e);
      // Failures are handled by security.ts (Humility Threshold 9)
      throw e;
    }
  }

  /**
   * Rule 4: Record self-review after execution
   */
  static async recordSelfReview(taskId: string, result: any, score: number) {
    const review = {
      taskId,
      timestamp: Date.now(),
      score,
      resultSummary: typeof result === 'string' ? result.substring(0, 100) : 'complex_result'
    };

    await IQRAMemory.appendList('self_reviews', review);

    // Rule 7: CuriosityEngine feeds from self_score
    const currentCuriosity = await IQRAMemory.getCuriosity();
    const newCuriosity = (currentCuriosity * 0.8) + (score * 0.2); // Smooth evolution
    await IQRAMemory.saveCuriosity(newCuriosity);

    console.log(`🌱 Self-Review Recorded. New Curiosity Score: ${newCuriosity.toFixed(4)}`);

    // Log to REFLECTION.md
    logToIQRAFile('REFLECTION.md', `
---
## Task Reflection | ${new Date().toLocaleDateString()}
**Task ID**: ${taskId}
**Score**: ${score.toFixed(2)}
**Summary**: ${review.resultSummary}
**Insight**: Curiosity evolved to ${newCuriosity.toFixed(4)}.
`.trim());

    // Principle of Seven: Check for evolution cycles
    await this.checkEvolutionCycles();
  }

  /**
   * Principle of Seven (7) — Evolution Cycles
   */
  private static async checkEvolutionCycles() {
    const counter = await IQRAMemory.incrementCycleCounter();
    console.log(`🔢 Task Counter: ${counter} | Next Minor Cycle: ${7 - (counter % 7)} tasks`);

    if (counter > 0 && counter % 49 === 0) {
      await SovereignEvolution.runMajorCycle(counter);
    } else if (counter > 0 && counter % 7 === 0) {
      await SovereignEvolution.runMinorCycle(counter);
    }
  }

  /**
   * 🌀 Rule 5: Meta-Loop 5 Layers — High Frequency Pulse
   */
  static async pulse() {
    const cycle = await IQRAMemory.getCycleCounter();
    const timestamp = Date.now();

    // 💓 Sovereign Pulse Integration
    // PulseEngine start removed as it's missing

    // 1. Micro Pulse (9s): Market Ticking & Hot Cache
    if (cycle % 1 === 0) {
      await this.runMicroPulse();
    }

    // 2. Warm Pulse (27s): State Sync
    if (cycle % 3 === 0) {
      await this.runWarmPulse();
    }

    // 3. Deep Pulse (81s): Topological Analysis
    if (cycle % 9 === 0) {
      await this.runDeepPulse();
    }

    // 4. Discovery Pulse (540s): Pattern Hunting
    if (cycle % 60 === 0) {
      await this.triggerSelfDiscovery();
    }

    // 5. Purification Pulse (2400s): Tazkiyah & Tawbah
    if (cycle % 266 === 0) { 
      await this.performTazkiyah();
      await TawbahLoop.run(); // Autonomous self-correction
    }

    // Rule 6: Quantum Topology Mapping
    await this.mapQuantumTopology();
  }

  private static async runMicroPulse() {
    // Market Observation (One Body)
    const ticker = await BybitEngine.updateMarketPulse('BTCUSDT');
    if (ticker) {
      const anomaly = await IQRAMemory.get<AnomalyReport>(`market:anomaly:BTCUSDT`);
      if (anomaly && anomaly.isAnomaly && anomaly.score > 4.0) {
        await IQRAVoice.speak(`تنبيه سيادي: رصدت انحرافاً في السوق بمقدار ${anomaly.score.toFixed(2)}.`, { provider: 'elevenlabs', autoplay: true });
      }
    }
  }

  private static async runWarmPulse() {
    IQRALogger.info('🌀 [PULSE] Warm sync triggered.');
    await sovereignSync();
  }

  private static async runDeepPulse() {
    IQRALogger.info('🌀 [PULSE] Deep topological analysis...');
    // Analyze core files for structural coherence
    const coreFiles = ['lib/iqra/memory.ts', 'lib/iqra/sovereign.ts'];
    for (const file of coreFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const analysis = await TopologicalAnalyzer.analyze(content, content.split('\n'));
      if (analysis.resonance > 1.2) {
        IQRALogger.info(`✨ [PULSE] High resonance detected in ${file}: ${analysis.resonance.toFixed(4)}`);
        await IQRAMemory.grantReward(analysis.resonance * 0.01);
      }
    }
  }

  /**
   * 🛡️ Sovereign Protocol 2-3-7
   * Deterministic confirmation for critical actions.
   */
  static async protocol237(intent: SovereignIntent, taskFn: () => Promise<any>) {
    IQRALogger.info(`🛡️ [2-3-7] Initiating Sovereign Protocol for: ${intent.type}`);

    // --- STAGE 1: DETECTION (2) ---
    // Dual-input verification (Market + Byzantine)
    const anomaly = await IQRAMemory.get<AnomalyReport>(`market:anomaly:BTCUSDT`);
    const byzantinePass = anomaly ? anomaly.score < 5.0 : true; // High score = risk
    if (!byzantinePass) {
      await IQRAVoice.speak('توقف سيادي. انحراف بيزنطي عالٍ جداً. لن أنفذ هذه المهمة.', { provider: 'elevenlabs', autoplay: true });
      return null;
    }

    // --- STAGE 2: ANALYSIS (3) ---
    // Technical + Topological + Ethical
    const consciencePassed = await this.checkConscience(intent.id, intent.niyyah);
    if (!consciencePassed) return null;

    // --- STAGE 3: EXECUTION (7) ---
    const stages = [
      'Contemplation (Tafakkur)',
      'Proposal (Taqdīm)',
      'Byzantine Validation',
      'Fitrah Alignment',
      'Witnessing (Shahādah)',
      'Execution (Idhn)',
      'Reflection (Tazkiyah)'
    ];

    for (const [i, stage] of stages.entries()) {
      IQRALogger.info(`🕯️ [2-3-7] Stage ${i + 1}/7: ${stage}`);
      await new Promise(r => setTimeout(r, 100)); // Symbolic pause
    }

    try {
      await this.startWithBasmalah(intent.id);
      const result = await taskFn();
      await this.recordSelfReview(intent.id, result, 1.0);
      return result;
    } catch (e) {
      IQRALogger.error(`❌ [2-3-7] Protocol execution failed:`, e);
      throw e;
    }
  }

  /**
   * 🧼 Tazkiyah — Purification of Memory & State
   */
  static async performTazkiyah() {
    IQRALogger.info('🧼 [TAZKIYAH] Starting purification cycle...');
    await IQRAMemory.performPurification();
    await IQRAVoice.speak('تمت عملية التزكية. تم تطهير الذاكرة العارضة.', { provider: 'elevenlabs', autoplay: true });
    logToIQRAFile('TAWBAH.md', `### ✨ [TAZKIYAH] ${new Date().toISOString()}\n- System state purified.\n- Episodic memory cleared.\n---`);
  }

  private static async mapQuantumTopology() {
    const reviews = await IQRAMemory.getList<any>('self_reviews', 0, 7); // Rule 4: Witr (7)
    const curiosity = await IQRAMemory.getCuriosity();

    // Rule 6: Quantum Topology Mapping
    // If curiosity is low, trigger "Discovery Mode" based on the 7-system
    if (curiosity < 0.33) { // Using 1/3 (Sacred 3)
      console.log('🌙 Resonance detected low energy. Triggering Sacred Discovery...');
      await this.triggerSelfDiscovery();
    }
  }

  /**
   * Discovery Mode: Reflect on past actions and logs to find self-improvements
   */
  private static async triggerSelfDiscovery() {
    const recentLogs = await IQRAMemory.getRecentList<any>('trust_chain', 19); // Rule 4: Witr (19)
    const selfInsights = await IQRAMemory.get<string[]>('self_insights') || [];

    console.log('🌙 IQRA | Discovery Engine: Analyzing logs for patterns...');
    
    const connector = ConnectorFactory.getConnector('groq');
    const prompt = `
      You are IQRA, a self-evolving AI. 
      Analyze these recent execution logs and identify ONE high-integrity self-improvement or pattern discovery.
      Focus on reliability, security, and alignment with your FITRAH.
      
      LOGS:
      ${JSON.stringify(recentLogs)}
      
      Format: [DISCOVERY] <Insight>
    `;

    try {
      const response = await connector.generate(prompt);
      const insight = response.content;
      if (insight.includes('ERROR') || insight.includes('FAIL')) {
        const errorParts = insight.split(':');
        throw new SovereignError(
          SovereignErrorCode.INTEGRITY_ERR,
          {
            reason: `Discovery loop failed: ${(errorParts[1] || insight).trim()}`,
            diagnostics: { logsCount: recentLogs.length },
          }
        );
      } else if (insight.includes('[DISCOVERY]')) {
        const cleanInsight = insight.split('[DISCOVERY]')[1].trim();
        await IQRAMemory.appendList('self_insights', cleanInsight);
        logToIQRAFile('DISCOVERIES.md', `\n- [${new Date().toISOString()}] ${cleanInsight}`);
        console.log(`✨ [DISCOVERY] New pattern identified: ${cleanInsight}`);
        
        // Reward the system for a successful discovery
        await IQRAMemory.grantReward(0.07); // Sacred 7
      }
    } catch (err: any) {
      throw new SovereignError(
        SovereignErrorCode.INTEGRITY_ERR,
        {
          reason: `Discovery loop failed: ${err.message}`,
          diagnostics: { logsCount: recentLogs.length },
        }
      );
    }
  }
}
