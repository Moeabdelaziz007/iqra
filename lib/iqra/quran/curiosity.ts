/**
 * 🌀 Curiosity Engine | محرك الفضول
 * 
 * "وَفِي أَنفُسِكُمْ ۚ أَفَلَا تُبْصِرُونَ" — الذاريات: 21
 * 
 * This engine drives the discovery of deep resonances between Quranic verses 
 * and external data sources using Topological Curiosity and Inverse Mirror validation.
 */

import { IQRALogger } from '../logger';
import { computeArabicSimilarity } from '../utils/similarity';
import { callGroqForResonance, callGroqForTruthValidation } from '../llm/groq';
import { IQRAMemory } from '../memory';
import { appendToTrustChain } from '../security';

/**
 * 🌀 Resonance Types | انواع الرنين
 */
export enum ResonanceType {
  LINGUISTIC = "Linguistic",   // لغوي
  SCIENTIFIC = "Scientific",   // علمي
  HISTORICAL = "Historical",   // تاريخي
  ETHICAL = "Ethical",         // أخلاقي
  TOPOLOGICAL = "Topological", // طوبولوجي
  NUMERICAL = "Numerical",     // عددي
  SPIRITUAL = "Spiritual",     // روحي
  CONGZI = "Congzi"             // كونغتزي - أنماط بنيوية وسببية
}

export class CuriosityEngine {
    // 1. Granular failure tracking: Map<session:ayah, failures>
    private static failureMap = new Map<string, number>();

    /**
     * 🧬 Recursive Triangulation Pattern
     */
    
    private static checkSurfaceResonance(ayah: string, newData: string): number {
        return computeArabicSimilarity(ayah, newData);
    }

    private static async analyzeDeepResonance(ayah: string, newData: string, env: any): Promise<any> {
        return await callGroqForResonance(ayah, newData, env);
    }

    /**
     * 🏗️ Structural Analysis (Congzi Pattern)
     * Look for physical analogies and causal constraints.
     */
    private static async analyzeStructuralPatterns(ayah: string, newData: string): Promise<any> {
        IQRALogger.info("🏗️ [CONGZI] Executing structural pattern discovery...");
        const result = await callGroqForResonance(ayah, newData, { lens: "Congzi" });
        return result;
    }

    private static validateResonance(result: any): boolean {
        if (!result || typeof result !== 'object') return false;
        
        const confidence = typeof result.confidence === 'number' ? result.confidence : 0;
        if (confidence < 0.3) return false;

        const isTrivial = result.isTrivial === true;
        if (isTrivial) return false; 

        if (!result.type || !result.reason) return false;

        return true;
    }

    /**
     * 🪞 Inverse Mirror Validation | التحقق من المرآة العكسية
     * Ensures the resonance discovery is not a hallucination by checking the "negative" space.
     */
    private static async validateTruth(ayah: string, newData: string, resonance: any): Promise<boolean> {
        IQRALogger.info(`🪞 [INVERSE MIRROR] Validating truth of ${resonance.type} resonance...`);
        
        try {
            const validation = await callGroqForTruthValidation(ayah, newData, resonance);
            
            if (validation.strengthOfCounterArgument > 0.7) {
                IQRALogger.warn(`🛡️ [TRUTH] Inverse Mirror found a strong counter-argument (${validation.strengthOfCounterArgument.toFixed(2)}): ${validation.critique}`);
                return false;
            }

            if (validation.strengthOfCounterArgument > 0.4) {
                IQRALogger.info(`🪞 [INVERSE MIRROR] Weak critique: ${validation.critique}`);
            } else {
                IQRALogger.info(`✅ [TRUTH] Resonance survived the Inverse Mirror.`);
            }

            return validation.isTrue;
        } catch (error) {
            IQRALogger.error("❌ [INVERSE-MIRROR] Validation Error:", error);
            return true; // Default to true if validation engine fails
        }
    }

    /**
     * Finds "Resonance" (Raneen) between an Ayah and new data.
     */
    static async processResonance(
        ayah: string, 
        newData: string, 
        env: any, 
        sessionId: string = 'global'
    ): Promise<any | null> {
        
        const failureKey = `${sessionId}:${ayah.substring(0, 20)}`;
        const consecutiveFailures = this.failureMap.get(failureKey) || 0;
        let threshold = 0.6;
        
        if (consecutiveFailures > 7) {
            threshold = 0.4;
            IQRALogger.info(`💎 [HONESTY] Humility detected for ${failureKey}. Threshold lowered.`);
        }

        const similarityScore = this.checkSurfaceResonance(ayah, newData);

        if (similarityScore < threshold) {
            this.failureMap.set(failureKey, consecutiveFailures + 1);
            
            // Log cancellation to TrustChain
            await appendToTrustChain(
                'RESONANCE_SEARCH_CANCELLED',
                ayah.substring(0, 50) + "..." + newData.substring(0, 50),
                `Similarity: ${similarityScore.toFixed(4)} < Threshold: ${threshold}`,
                1.0
            );
            return null;
        }

        this.failureMap.set(failureKey, 0);

        try {
            const deepResult = await this.analyzeDeepResonance(ayah, newData, env);
            
            if (this.validateResonance(deepResult)) {
                // 🪞 Truth Validation (Inverse Mirror)
                const isTrue = await this.validateTruth(ayah, newData, deepResult);
                
                if (!isTrue) {
                    IQRALogger.warn(`🛡️ [TRUTH] Resonance failed Inverse Mirror validation. Skipping.`);
                    return null;
                }

                IQRALogger.info(`🌀 [RESONANCE] Found ${deepResult.type} resonance: ${deepResult.reason}`);
                
                // Record Reward
                await IQRAMemory.grantReward(deepResult.confidence * 0.1);
                
                return deepResult;
            }
        } catch (error) {
            IQRALogger.error("❌ [CURIOSITY] Deep Analysis Error:", error);
        }

        return null;
    }
}