/**
 * 🌀 Curiosity Engine | محرك الفضول
 * 
 * "وَفِي أَنفُسِكُمْ ۚ أَفَلَا تُبْصِرُونَ" — الذاريات: 21
 * 
 * This engine drives the discovery of deep resonances between Quranic verses 
 * and external data sources using Topological Curiosity and Inverse Mirror validation.
 */

import { IQRALogger } from '../logger.ts';
import { TopologicalCuriosityEngine, TopologicalResonance } from './topological_curiosity.ts';

// Re-export for backward compatibility
export { ResonanceType } from './topological_curiosity.ts';

export class CuriosityEngine {
    /**
     * Finds "Resonance" (Raneen) between an Ayah and new data.
     * Proxy to the Sovereign TopologicalCuriosityEngine
     */
    static async processResonance(
        ayah: string,
        newData: string,
        env: any,
        sessionId: string = 'global'
    ): Promise<TopologicalResonance | null> {
        IQRALogger.info(`🌀 [CURIOSITY] Session [${sessionId}] routing to Topological Engine...`);
        return await TopologicalCuriosityEngine.discoverResonance(ayah, newData, env);
    }
}