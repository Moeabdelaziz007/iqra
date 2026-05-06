import { CuriosityEngine } from '../lib/iqra/quran/curiosity';
import * as similarity from '../lib/iqra/utils/similarity';
import * as security from '../lib/iqra/security';
import * as groq from '../lib/iqra/llm/groq';

/**
 * Unit Test: Verify that CuriosityEngine correctly aborts and logs to TrustChain
 */
export async function runCuriosityUnitTest() {
    console.log("🧪 [UNIT TEST] Testing Similarity Cancellation Threshold & TrustChain Logging...");

    const testAyah = "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ";
    const lowSimilarityData = "Some random text about market prices";

    // 1. Mock similarity to return 0.2 (below threshold)
    const originalSimilarity = similarity.computeArabicSimilarity;
    (similarity as any).computeArabicSimilarity = () => 0.2;

    // 2. Spy on appendToTrustChain
    let capturedEvent: string | null = null;
    let capturedInput: string | null = null;
    const originalAppend = security.appendToTrustChain;
    (security as any).appendToTrustChain = async (event: string, input: string) => {
        capturedEvent = event;
        capturedInput = input;
    };

    // 3. Spy on Groq (ensure it is NOT called)
    let groqCalled = false;
    const originalGroq = groq.callGroqForResonance;
    (groq as any).callGroqForResonance = async () => { groqCalled = true; return null; };

    try {
        const result = await CuriosityEngine.processResonance(testAyah, lowSimilarityData, {});

        // Verifications
        const isAborted = result === null;
        const isLoggedCorrectly = capturedEvent === 'RESONANCE_SEARCH_CANCELLED' && capturedInput === (testAyah + lowSimilarityData);
        const isGroqAvoided = !groqCalled;

        if (isAborted && isLoggedCorrectly && isGroqAvoided) {
            console.log("✅ [GREEN] Unit Test Passed: TrustChain recorded the correct preventative abort data.");
            return true;
        } else {
            throw new Error(`❌ Test Failed: Aborted=${isAborted}, Logged=${isLoggedCorrectly}, GroqAvoided=${isGroqAvoided}`);
        }
    } finally {
        // Restore originals
        (similarity as any).computeArabicSimilarity = originalSimilarity;
        (security as any).appendToTrustChain = originalAppend;
        (groq as any).callGroqForResonance = originalGroq;
    }
}

if (require.main === module) {
    runCuriosityUnitTest().catch(err => { console.error(err); process.exit(1); });
}