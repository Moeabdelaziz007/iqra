import { describe, it, expect, vi } from 'vitest';
import { TopologicalCuriosityEngine } from '../../lib/iqra/quran/topological_curiosity';
import { IQRAMemory } from '../../lib/iqra/memory';

describe('Quranic Resonance E2E', () => {
  it('should find resonance between Quranic ayah and modern data', async () => {
    const ayah = "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ"; // "And We made from water every living thing"
    const modernData = "تشير الدراسات الحديثة إلى أن الماء هو المكون الأساسي للحياة في الخلية";

    // Setup memory mock
    vi.spyOn(IQRAMemory, 'get').mockResolvedValue(100);
    vi.spyOn(IQRAMemory, 'set').mockResolvedValue(undefined as any);

    const resonance = await TopologicalCuriosityEngine.discoverResonance(ayah, modernData, "Biology");

    expect(resonance).not.toBeNull();
    if (resonance) {
      expect(resonance.resonance_score).toBeGreaterThan(0.6);
      expect(resonance.bridge).toContain('Found harmony');
    }
  });

  it('should not find resonance for unrelated data', async () => {
    const ayah = "قُلْ هُوَ اللَّهُ أَحَدٌ";
    const modernData = "سعر صرف العملات اليوم غير مستقر";

    const resonance = await TopologicalCuriosityEngine.discoverResonance(ayah, modernData);
    expect(resonance).toBeNull();
  });
});
