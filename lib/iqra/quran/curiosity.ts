// افتراض وجود استيرادات للملفات المساعدة
import { IQRALogger } from '../logger';
import { computeArabicSimilarity } from '../utils/similarity';
import { callGroqForResonance } from '../llm/groq';
// import { appendToTrustChain } from '../security'; // Removed as per new requirement flow

export class CuriosityEngine {
    /**
     * Finds "Resonance" (Raneen) between an Ayah and new data.
     * 
     * @param ayah The Quranic verse text.
     * @param newData The new data to check resonance against.
     * @param env Environment variables/config.
     * @param skip_low_similarity If true (default), avoids calling Groq if similarity < 0.6.
     * @returns The resonance object or null if similarity is too low or error occurs.
     */
    static async processResonance(
        ayah: string, 
        newData: string, 
        env: any, 
        skip_low_similarity: boolean = true
    ): Promise<any | null> {
        // لا نضيع طلبات Groq على تشابه سطحي
        if (skip_low_similarity) {
            const similarityScore = computeArabicSimilarity(ayah, newData);
            if (similarityScore < 0.6) {
                IQRALogger.info(
                    `🌊 [CURIOSITY] Aborting: Similarity (${similarityScore.toFixed(2)}) < 0.6. Skipping Groq.`
                );
                return null;
            }
        }

        return await callGroqForResonance(ayah, newData, env);
    }
}