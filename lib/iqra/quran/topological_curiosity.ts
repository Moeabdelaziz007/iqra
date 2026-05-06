/**
 * Topological Curiosity Engine — محرك الفضول الطوبولوجي
 * 
 * Bridges modern context with Quranic wisdom through semantic resonance 
 * and numerical symmetry.
 */

import { VectorEngine, VectorMatch } from './vector_engine';
import { NumericalValidator, ResonanceResult } from './numerical_validator';
import { IQRAMemory } from '../memory';

export interface CuriosityDiscovery {
  input: string;
  resonanceScore: number;
  numericalResonance: ResonanceResult;
  topMatches: VectorMatch[];
  timestamp: Date;
}

export class TopologicalCuriosity {
  constructor(
    private vectorEngine: VectorEngine,
    private memory: IQRAMemory
  ) {}

  /**
   * Explore resonance between modern input and Quranic context.
   */
  async explore(input: string): Promise<CuriosityDiscovery> {
    // 1. Semantic Search (The "Soul" connection)
    const semanticMatches = await this.vectorEngine.searchSimilar(input, 3);
    
    // 2. Numerical Validation (The "Order" connection)
    const numericalResonance = NumericalValidator.validate(input);

    // 3. Calculate Overall Resonance Score
    const maxSemanticScore = semanticMatches.length > 0 ? semanticMatches[0].score : 0;
    const resonanceScore = (maxSemanticScore * 0.7) + (numericalResonance.score * 0.3);

    const discovery: CuriosityDiscovery = {
      input,
      resonanceScore,
      numericalResonance,
      topMatches: semanticMatches,
      timestamp: new Date()
    };

    // 4. Record discovery if resonance is significant
    if (resonanceScore > 0.6) {
      await this.memory.storeQuantum({
        content: `Discovered resonance: ${input}`,
        coordinates: { concept: 'Curiosity_Discovery' },
        superposition: [JSON.stringify(discovery)]
      });
    }

    return discovery;
  }
}
