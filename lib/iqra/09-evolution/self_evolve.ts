import { IQRALogger } from '../12-infrastructure/logger.js';
import { IQRAMemory } from '../03-memory/memory.js';
import { callEconomyModel } from '../llm/economy.ts';
import fs from 'fs';
import path from 'path';

/**
 * 🧬 Self-Evolution Module | وحدة التطور الذاتي
 * Inspired by MiniMax M2.7 "Self-Evolution" architecture.
 */
export class IQRAEvolution {
    private static REFLECTION_DIR = path.join(process.cwd(), 'iqra-core');
    
    /**
     * The Self-Evolution Loop:
     * Analyze Failure -> Plan Correction -> Modify Code -> Test -> Review
     */
    static async runEvolutionCycle() {
        IQRALogger.info("🧬 [EVOLUTION] Starting self-evolution cycle...");
        
        // 1. Collect Experience (FAILURES and REFLECTIONS)
        const failures = await this.readLog('FAILURES.md');
        const reflections = await this.readLog('REFLECTION.md');
        
        if (!failures && !reflections) {
            IQRALogger.info("✅ [EVOLUTION] No significant failures or reflections found. System stable.");
            return;
        }

        // 2. Analyze Patterns using Economy Model (MiniMax logic)
        const analysisPrompt = `
            Analyze these logs and identify recurring patterns of failure or inefficiency.
            Suggest a concrete coding or rule change to prevent these in the future.
            
            FAILURES:
            ${failures}
            
            REFLECTIONS:
            ${reflections}
        `;
        
        const strategy = await callEconomyModel(analysisPrompt, [
            { role: 'system', content: 'You are the IQRA Meta-Agent specializing in architectural self-improvement.' }
        ]);

        IQRALogger.info("🧬 [EVOLUTION] Proposed Strategy: " + strategy);

        // 3. Document the evolutionary step
        await this.logEvolutionStep(strategy);
        
        return strategy;
    }

    private static async readLog(filename: string): Promise<string | null> {
        const filePath = path.join(this.REFLECTION_DIR, filename);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8').slice(-2000); // Last 2k chars
        }
        return null;
    }

    private static async logEvolutionStep(strategy: string) {
        const logPath = path.join(this.REFLECTION_DIR, 'EVOLUTION_LOG.md');
        const entry = `\n## 🧬 [EVOLUTION_STEP] ${new Date().toISOString()}\n- **Strategy**: ${strategy}\n- **Status**: ANALYSIS_COMPLETE\n`;
        fs.appendFileSync(logPath, entry);
    }
}
