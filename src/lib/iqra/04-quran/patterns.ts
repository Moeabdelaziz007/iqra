/**
 * IQRA Pattern Discovery — اكتشاف الأنماط
 * 
 * "أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ" — النساء: 82
 */

import { IQRAMemory } from '#memory/memory';

export interface QuranicPattern {
  root: string;
  count: number;
  occurrences: { surah: number; ayah: number }[];
  connections: string[]; // Related roots or concepts
}

export class PatternDiscovery {
  /**
   * Analyze a specific segment to extract semantic patterns
   */
  static async discoverSemanticLink(text: string): Promise<void> {
    console.log('🔍 Analyzing Semantic Patterns...');
    
    const discoveredPatterns = this.extractRoots(text);
    
    // Optimized: Use batch saving instead of sequential loop
    if (discoveredPatterns.length > 0) {
      await this.saveBatchToKnowledgeBase(discoveredPatterns);
    }
  }

  private static extractRoots(text: string): string[] {
    // Basic extraction logic to be enhanced by LLM/External Tools
    return text.split(' ').map(word => word.trim()).filter(word => word.length > 2);
  }

  /**
   * Batch Save to Knowledge Base
   * Reduces I/O from O(N) to O(1)
   */
  private static async saveBatchToKnowledgeBase(patterns: string[]) {
    // 1. Fetch the knowledge base once
    const memory = await IQRAMemory.get<string[]>('quranic_knowledge') || [];
    let updated = false;

    // 2. Identify new unique patterns
    for (const pattern of patterns) {
      if (!memory.includes(pattern)) {
        memory.push(pattern);
        updated = true;
        console.log(`✨ New Pattern Archived: ${pattern}`);
      }
    }

    // 3. Save once if updates occurred
    if (updated) {
      const limitedMemory = memory.slice(-100); // Last 100 discoveries
      await IQRAMemory.set('quranic_knowledge', limitedMemory);
      console.log(`✅ Batch Archive Complete: ${patterns.length} patterns processed.`);
    }
  }
}
