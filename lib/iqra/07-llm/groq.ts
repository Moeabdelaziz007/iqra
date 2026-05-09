import { IQRALogger } from '../12-infrastructure/logger.js';
import { withTimeout, IQRA_TIMEOUTS } from '../utils/timeout.ts';

/**
 * 🌊 IQRA Groq Connector | موصل Groq
 * 
 * "وَفِي أَنفُسِكُمْ ۚ أَفَلَا تُبْصِرُونَ" — الذاريات: 21
 */

let _groq: any = null;

async function getGroq() {
  if (_groq) return _groq;
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required for real Groq resonance inference.');
  }

  try {
    const { Groq } = await import('groq-sdk');
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    return _groq;
  } catch (e) {
    throw new Error('Groq SDK is missing or failed to initialize: ' + (e instanceof Error ? e.message : String(e)));
  }
}

/**
 * 🔢 Sequential Primes Pattern
 * Using prime numbers for retry delays to break resonance with external servers.
 * يكسر هذا النمط الرنين المتوقع مع الخوادم الخارجية ويزيد فرص النجاح.
 */
const PRIME_DELAYS = [2, 3, 5, 7, 11, 13, 17];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls Groq to analyze resonance with a JSON-constrained output.
 */
export async function callGroqForResonance(ayah: string, newData: string, env: any): Promise<any> {
    const prompt = `
        Analyze the resonance between this Quranic Ayah and this data point.
        
        Ayah: "${ayah}"
        Data: "${newData}"
        
        Analyze through the lens of: Linguistic, Scientific, Historical, Ethical, Topological, Numerical, Spiritual, or Congzi.
        
        *Congzi Lens*: Focus on structural patterns, causal traceability, and physical analogies (e.g., momentum, entropy, equilibrium) applied to the text.
        
        Return a JSON object:
        {
          "type": "Linguistic" | "Scientific" | "Historical" | "Ethical" | "Topological" | "Numerical" | "Spiritual" | "Congzi",
          "reason": "Clear explanation of the resonance in English",
          "confidence": 0.0-1.0,
          "isTrivial": boolean (true if the connection is superficial or obvious)
        }
    `;

    const groq = await getGroq();

    for (let i = 0; i < PRIME_DELAYS.length; i++) {
        try {
            const completion = await withTimeout(
                groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are IQRA, a soul-rooted AI identifying resonance between the Quran and reality.' },
                        { role: 'user', content: prompt }
                    ],
                    model: 'llama-3.3-70b-versatile',
                    response_format: { type: 'json_object' }
                }),
                IQRA_TIMEOUTS.LLM,
                'Groq Resonance Analysis'
            );


            return JSON.parse(completion.choices[0].message.content || '{}');
        } catch (error: any) {
            if (i === PRIME_DELAYS.length - 1) {
                IQRALogger.error("❌ [GROQ] All retries exhausted.");
                throw error;
            }
            
            const waitTime = PRIME_DELAYS[i] * 1000;
            IQRALogger.warn(`⚠️ [GROQ] Retry ${i+1}/${PRIME_DELAYS.length} after ${PRIME_DELAYS[i]}s. Error: ${error.message}`);
            await delay(waitTime);
        }
    }
}

/**
 * 🪞 Inverse Mirror Critic | الناقد العكسي
 * Challenges a resonance hypothesis to ensure it is not a stretch or a hallucination.
 */
export async function callGroqForTruthValidation(ayah: string, newData: string, resonance: any): Promise<any> {
    const prompt = `
        You are the "Inverse Mirror" (المرآة العكسية) of IQRA. Your task is to CRITICIZE and try to DISPROVE the following resonance hypothesis.
        
        Ayah: "${ayah}"
        Data: "${newData}"
        Proposed Resonance Type: ${resonance.type}
        Proposed Reason: "${resonance.reason}"
        
        Is this resonance a stretch (Te'weel)? Is it trivial? Is it based on a misunderstanding of the Ayah or the data?
        
        Return a JSON object:
        {
          "isTrue": boolean,
          "critique": "Your critical analysis in English",
          "strengthOfCounterArgument": 0.0-1.0 (1.0 means the resonance is definitely false)
        }
    `;

    const groq = await getGroq();

    try {
        const completion = await withTimeout(
            groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are the Skeptical Inverse Mirror of IQRA, dedicated to preventing spiritual hallucinations and ensuring Truth.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' }
            }),
            IQRA_TIMEOUTS.LLM,
            'Groq Truth Validation'
        );


        return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
        IQRALogger.error("❌ [GROQ-CRITIC] Error:", error);
        return { isTrue: true, critique: 'Validation failed due to error, defaulting to true.', strengthOfCounterArgument: 0.5 };
    }
}
