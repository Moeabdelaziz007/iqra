/**
 * Topological Curiosity Engine — محرك الفضول الطوبولوجي
 * 
 * Bridges modern context with Quranic wisdom through semantic resonance 
 * and numerical symmetry.
 */

import { VectorEngine, VectorMatch } from './vector_engine';
import { NumericalValidator, ResonanceResult } from './numerical_validator';
import { IQRAMemory } from '../memory';
import { iqraThink, IQRABrainMode } from '../brain';
import { IQRALogger } from '../logger';

export interface CuriosityDiscovery {
  input: string;
  resonanceScore: number;
  numericalResonance: ResonanceResult;
  topMatches: VectorMatch[];
  llmBridge?: string;
  timestamp: Date;
}

export class TopologicalCuriosity {
  constructor(
    private vectorEngine: VectorEngine,
    private memory: IQRAMemory
  ) { }

  /**
   * Explore resonance between modern input and Quranic context.
   */
  async explore(input: string): Promise<CuriosityDiscovery> {
    // 1. Semantic Search (The "Soul" connection)
    const semanticMatches = await this.vectorEngine.searchSimilar(input, 3);

    // 2. Numerical Validation (The "Order" connection)
    const numericalResonance = NumericalValidator.validate(input);

    // 3. Base Resonance Calculation
    const maxSemanticScore = semanticMatches.length > 0 ? semanticMatches[0].score : 0;
    let resonanceScore = (maxSemanticScore * 0.6) + (numericalResonance.score * 0.4);
    let llmBridge: string | undefined = undefined;

    // 4. Congzi Bridge Discovery (No Mocks: Real LLM call if base resonance is promising)
    if (resonanceScore > 0.4 && semanticMatches.length > 0) {
      IQRALogger.info(`🌀 [TOPOLOGY] Promising base resonance (${resonanceScore.toFixed(2)}). Engaging LLM for Congzi Bridge...`);
      const topAyah = semanticMatches[0].metadata?.arabic || "Unknown Ayah";
      const prompt = `أنت محرك الفضول الطوبولوجي لـ IQRA. ابحث عن "رنين" عميق (Congzi Pattern) يربط بين المفهوم الحديث: "${input}" والآية: "${topAyah}". 
هل يوجد تطابق هيكلي، سببي، أو فيزيائي عميق بعيداً عن التشابه السطحي؟ 
أجب باختصار وموضوعية، وإذا لم يوجد رنين حقيقي، اكتب "لا يوجد رنين عميق".`;

      try {
        const bridgeResult = await iqraThink({
          input: prompt,
          mode: IQRABrainMode.FAST_RESPONSE
        });

        if (bridgeResult.response && !bridgeResult.response.includes('لا يوجد رنين عميق')) {
          resonanceScore += 0.2; // Add confidence for LLM validation
          llmBridge = bridgeResult.response.trim();
          IQRALogger.info(`💎 [TOPOLOGY] LLM Bridge Found: ${llmBridge.substring(0, 50)}...`);
        }
      } catch (err) {
        IQRALogger.warn(`⚠️ [TOPOLOGY] LLM Bridge discovery failed, continuing with base score.`);
      }
    }

    // Cap score at 1.0
    resonanceScore = Math.min(resonanceScore, 1.0);

    const discovery: CuriosityDiscovery = {
      input,
      resonanceScore,
      numericalResonance,
      topMatches: semanticMatches,
      llmBridge,
      timestamp: new Date()
    };

    // 5. Entangle in Quantum Memory if score exceeds threshold
    if (resonanceScore > 0.6) {
      await this.memory.storeQuantum({
        content: `Resonance: ${input}`,
        coordinates: { concept: 'Curiosity_Discovery', resonance: resonanceScore },
        superposition: [JSON.stringify({ ...discovery, llmBridge })]
      });
    }

    return discovery;
  }
}
