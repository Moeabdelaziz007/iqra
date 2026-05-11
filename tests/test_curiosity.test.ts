import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CuriosityEngine } from '../lib/iqra/quran/curiosity';
import * as similarity from '../lib/iqra/utils/similarity';
import * as security from '../lib/iqra/security';
import * as groq from '../lib/iqra/llm/groq';
import { IQRAMemory } from '../lib/iqra/memory';

describe('🌀 CuriosityEngine | محرك الفضول', () => {
    const testAyah = "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ";
    const lowSimilarityData = "Some random text about market prices";

    beforeEach(() => {
        vi.restoreAllMocks();
        // Mock Memory to avoid hitting real Redis/FS during unit tests
        vi.spyOn(IQRAMemory, 'getCuriosity').mockResolvedValue(0.5);
        vi.spyOn(IQRAMemory, 'set').mockResolvedValue('OK');
        vi.spyOn(IQRAMemory, 'appendList').mockResolvedValue(1);
        vi.spyOn(IQRAMemory, 'grantReward').mockResolvedValue();
    });

    it('should abort if similarity is below threshold', async () => {
        vi.spyOn(similarity, 'computeArabicSimilarity').mockReturnValue(0.1);
        const groqSpy = vi.spyOn(groq, 'callGroqForResonance');

        const result = await CuriosityEngine.processResonance(testAyah, lowSimilarityData, {});

        expect(result).toBeNull();
        expect(groqSpy).not.toHaveBeenCalled();
    });

    it('should proceed to deep analysis if similarity is above threshold', async () => {
        vi.spyOn(similarity, 'computeArabicSimilarity').mockReturnValue(0.8);
        const mockResonance = { 
            type: 'Spiritual', 
            reason: 'Test reason', 
            confidence: 0.9, 
            isTrivial: false 
        };
        
        vi.spyOn(groq, 'callGroqForResonance').mockResolvedValue(mockResonance);
        vi.spyOn(groq, 'callGroqForTruthValidation').mockResolvedValue({ isTrue: true });

        const result = await CuriosityEngine.processResonance(testAyah, 'Related data', {});

        expect(result).toEqual(mockResonance);
    });

    it('should fail if Inverse Mirror (Truth Validation) rejects it', async () => {
        vi.spyOn(similarity, 'computeArabicSimilarity').mockReturnValue(0.8);
        vi.spyOn(groq, 'callGroqForResonance').mockResolvedValue({ 
            type: 'Scientific', 
            reason: 'Seems scientific', 
            confidence: 0.9, 
            isTrivial: false 
        });
        
        // Inverse Mirror says NO
        vi.spyOn(groq, 'callGroqForTruthValidation').mockResolvedValue({ 
            isTrue: false, 
            critique: 'This is a hallucination',
            strengthOfCounterArgument: 0.9 
        });

        const result = await CuriosityEngine.processResonance(testAyah, 'Pseudo-scientific data', {});

        expect(result).toBeNull();
    });

    it('should reject trivial resonances', async () => {
        vi.spyOn(similarity, 'computeArabicSimilarity').mockReturnValue(0.8);
        vi.spyOn(groq, 'callGroqForResonance').mockResolvedValue({ 
            type: 'Linguistic', 
            reason: 'Both have letters', 
            confidence: 0.9, 
            isTrivial: true 
        });

        const result = await CuriosityEngine.processResonance(testAyah, 'Trivial data', {});

        expect(result).toBeNull();
    });
});
