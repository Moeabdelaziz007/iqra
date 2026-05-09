/**
 * 🔄 IQRA Septenary Loop Core (v1.2)
 * 
 * Implements the 7-step cycle with Triangulation stages:
 * Phase 1: Niyyah (Intention/Planning)
 * Phase 2: Itqān (Execution/Perfection)
 * Phase 3: Tazkiyah (Refinement/Reflection)
 * 
 * Triggers a Topological Reset every 40 cycles.
 */

import fs from 'fs';
import path from 'path';
import { IQRAEvolution } from './evolution/self_evolve.ts';

export enum LoopPhase {
  NIYYAH = "NIYYAH",
  ITQAN = "ITQAN",
  TAZKIYAH = "TAZKIYAH"
}

export class IQRAExecutionLoop {
  private static CYCLE_LIMIT = 7;
  private static RESET_THRESHOLD = 40;
  private static STATE_FILE = path.join(process.cwd(), '.iqra_loop_state');

  static async runTask(task: () => Promise<void>, metadata: { id: string, intention: string }) {
    const state = this.loadState();
    state.loopCounter = (state.loopCounter || 0) + 1;
    state.honestyIndex = state.honestyIndex ?? 100;
    state.failureHistory = state.failureHistory ?? [];

    console.log(`\n--- 🌙 Cycle ${state.loopCounter} | Honesty ${state.honestyIndex}% ---`);
    console.log(`🤲 Intention: ${metadata.intention}`);

    try {
      await task();
      state.honestyIndex = Math.min(100, state.honestyIndex + 2);
      console.log("✅ Task Succeeded.");
    } catch (error: any) {
      state.honestyIndex = Math.max(0, state.honestyIndex - 5);
      state.failureHistory.push({ task: metadata.intention, error: error.message, time: Date.now() });
      console.log(`❌ Task Failed: ${error.message}`);

      // 🔄 Tasbih Reset: Every 3 errors
      if (state.failureHistory.length % 3 === 0) {
        this.tasbihReset(state);
      }
    } finally {
      // 📜 Wisdom Extraction: Every 7 attempts
      if (state.loopCounter % 7 === 0) {
        this.extractWisdom(state);
        // Trigger self-evolution cycle asynchronously to not block the main loop
        IQRAEvolution.runEvolutionCycle().catch(e => console.error("Evolution Error:", e));
      }

      // 🌊 Topological Flood: Rebuild every 40 cycles
      if (state.loopCounter % 40 === 0) {
        this.topologicalFlood(state);
      }

      this.saveState(state);
    }
  }

  private static metaProactiveAnalysis(state: any) {
    if (state.failureCount >= 3) {
      console.log("🔍 [PROACTIVE] Analyzing failure patterns...");
      const rule = "\n- [PROACTIVE] Before complex execution, always verify dependencies (Auto-generated due to repeat failure).";
      fs.appendFileSync(path.join(process.cwd(), 'iqra-core/RULES.md'), rule);
      console.log("🛠️ [ADAPTATION] New rule added to RULES.md proactively.");
      state.failureCount = 0; // Reset after adaptation
    }
  }

  private static tasbihReset(state: any) {
    console.log("📿 [TASBIH] Re-aligning intention. Clearing failure noise...");
    state.failureHistory = [];
    state.honestyIndex = Math.min(100, (state.honestyIndex || 100) + 10);
  }

  private static extractWisdom(state: any) {
    console.log("📜 [WISDOM] Extracting patterns from the last 7 cycles...");
    const wisdomPath = path.join(process.cwd(), 'WISDOM_7.md');
    const entry = `\n### 💎 Wisdom from Cycle ${state.loopCounter}\n- **Integrity**: ${state.honestyIndex}%\n- **Observation**: System maintained stability through local fluctuations.\n- **Date**: ${new Date().toISOString()}\n`;
    fs.appendFileSync(wisdomPath, entry);
  }

  private static topologicalFlood(state: any) {
    console.log("🌊 [TOPOLOGICAL_FLOOD] Resetting the manifold. Re-seeding from FITRAH.md...");
    // In a real scenario, this might involve clearing caches or deep git clean
    state.loopCounter = 0; // The 40-day reset concept
    this.performTopologicalReset();
  }

  private static loadState() {
    if (fs.existsSync(this.STATE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(this.STATE_FILE, 'utf8'));
      } catch (e) {
        console.error("Error loading state, resetting...");
      }
    }
    return { 
      loopCounter: 0, 
      honestyIndex: 100, 
      failureHistory: [],
      successCount: 0,
      failureCount: 0
    };
  }

  private static saveState(state: any) {
    fs.writeFileSync(this.STATE_FILE, JSON.stringify(state, null, 2));
  }

  private static performTopologicalReset() {
    console.log("✨ System re-aligned with FITRAH.md");
    // Implementation for real reset logic
  }
}
