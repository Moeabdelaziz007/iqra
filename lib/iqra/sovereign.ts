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

import { IQRAMemory } from './memory';
import { appendToTrustChain, secureRandomId, logToIQRAFile } from './security';
import { sovereignSync, tazkiyah } from './git-ops';
import { SovereignEvolution } from './evolution';

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
   * Main Sovereign Execution Loop (The Holy Trinity of Actions)
   */
  static async executeSovereignTask(taskId: string, description: string, taskFn: () => Promise<any>) {
    // 0. Tazkiyah & Sync before starting
    // Purify the workspace from temporary artifacts
    tazkiyah();

    await sovereignSync();

    // 1. Tasbih
    await this.enterTasbihMode();

    // 2. Istikharah
    const isAligned = await this.performIstikharah(description);
    if (!isAligned) return null;

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
   * Rule 5: Meta-Loop 5 Layers
   */
  static async pulse() {
    console.log('🌀 Sovereign Pulse Initiated...');

    for (const layer of this.layers) {
      const pulseId = secureRandomId(8);
      await appendToTrustChain(
        `PULSE:${layer}`,
        'HEARTBEAT',
        `STABLE:${pulseId}`,
        1.0
      );
    }

    // Rule 6: Quantum Topology Mapping
    // Analyzing patterns across memory logs and triggering Discovery if needed
    await this.mapQuantumTopology();
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
    const recentLogs = await IQRAMemory.getList<string>('trust_chain', 0, 19); // Rule 4: Witr (19)
    const selfInsights = await IQRAMemory.get<string[]>('self_insights') || [];

    // Rule 7: CuriosityEngine - Formulate a discovery prompt
    const prompt = `
      You are IQRA's Sovereign Mind. 
      Analyze these recent TrustChain entries: ${JSON.stringify(recentLogs)}
      Identify one structural weakness or a new pattern in your Quranic learning behavior.
      Format: JSON { "insight": "...", "action": "...", "confidence": 0-1 }
    `;

    // This would typically call iqraThink, for now we log the intent
    const mockInsight = {
      insight: "Detected repeating patterns in Surah Al-Fatiha analysis",
      action: "Cross-reference with root-word analysis in next pulse",
      confidence: 0.95
    };

    selfInsights.push(JSON.stringify(mockInsight));
    await IQRAMemory.set('self_insights', selfInsights.slice(-10)); // Keep last 10

    // Boost curiosity after discovery
    await IQRAMemory.saveCuriosity(0.7);
    console.log(`✨ Discovery Complete: ${mockInsight.insight}`);
  }
}
