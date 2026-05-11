import { it, expect, describe, vi, beforeEach } from 'vitest';
import { CuriosityEngine } from '../../lib/iqra/quran/curiosity';
import { IQRAMemory } from '../../lib/iqra/memory';
import * as groqModule from '../../lib/iqra/llm/groq';

describe('Resonance Cycle E2E', () => {
    beforeEach(async () => {
        // Mock IQRAMemory to avoid network calls
        vi.spyOn(IQRAMemory, 'get').mockResolvedValue(0.5);
        vi.spyOn(IQRAMemory, 'set').mockResolvedValue('OK');
        vi.spyOn(IQRAMemory, 'getCuriosity').mockResolvedValue(0.55);
        vi.spyOn(IQRAMemory, 'grantReward').mockResolvedValue();
        vi.spyOn(IQRAMemory, 'searchSemantic').mockResolvedValue([]);
        vi.spyOn(IQRAMemory, 'saveSemantic').mockResolvedValue();

        vi.restoreAllMocks();
    });

    it('should complete a full resonance cycle and grant rewards', async () => {
        const ayah = "وَفِي أَنفُسِكُمْ ۚ أَفَلَا تُبْصِرُونَ";
        const newData = "Modern neuroscience explores the depth of human consciousness and self-awareness.";
        const sessionId = 'test-session-' + Date.now();

        // 1. Mock Deep Resonance (Groq)
        const mockDeepResonance = vi.spyOn(groqModule, 'callGroqForResonance').mockResolvedValue({
            type: 'Scientific',
            reason: 'Neuroscience aligns with the Quranic invitation to look within oneself.',
            confidence: 0.9,
            isTrivial: false
        });

        // 2. Execute Process Resonance
        const result = await CuriosityEngine.processResonance(ayah, newData, {}, sessionId);

        // 3. Assertions
        expect(result).not.toBeNull();
        expect(result.type).toBe('Scientific');
        expect(mockDeepResonance).toHaveBeenCalled();

        // 4. Verify Reward in Memory
        const finalScore = await IQRAMemory.getCuriosity();
        expect(finalScore).toBeGreaterThan(0.5);
        
        console.log(`✅ Resonance Cycle Complete. Score: 0.5 -> ${finalScore.toFixed(4)}`);
    });

    it('should fail if truth validation (Inverse Mirror) fails', async () => {
        const ayah = "verse";
        const newData = "short text"; // Will trigger short reason constraint in Scientific
        const sessionId = 'test-fail-session';

        vi.spyOn(groqModule, 'callGroqForResonance').mockResolvedValue({
            type: 'Scientific',
            reason: 'Too short.', // < 20 chars
            confidence: 0.8,
            isTrivial: false
        });

        const result = await CuriosityEngine.processResonance(ayah, newData, {}, sessionId);
        
        expect(result).toBeNull();
        console.log("✅ Inverse Mirror correctly blocked short scientific resonance.");
    });
});
