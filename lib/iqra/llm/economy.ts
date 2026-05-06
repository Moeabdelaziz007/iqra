import { IQRALogger } from '../logger.ts';
import { withTimeout, IQRA_TIMEOUTS } from '../utils/timeout.ts';

/**
 * 🍃 Economy Model Connector | الموصل الاقتصادي
 * 
 * Supports:
 * - GLM-4.7-Flash (Free Tier)
 * - Qwen-2.5-Coder (Low Cost)
 * - MiniMax-M2.7 (Self-Evolutionary)
 * - InternLM-S1-Pro (Physical World/FoPE)
 */

export async function callEconomyModel(input: string, context: any[]): Promise<string> {
    // Choose model based on input length or specific budget flags
    // Defaulting to GLM-4.7-Flash if free tier is available
    const useGlm = true; 
    const model = useGlm ? "glm-4-flash" : "qwen-2.5-72b-instruct";
    const apiKey = useGlm ? process.env.GLM_API_KEY : process.env.QWEN_API_KEY;
    const baseURL = useGlm ? "https://open.bigmodel.cn/api/paas/v4/" : "https://dashscope.aliyuncs.com/compatible-mode/v1";

    if (!apiKey) {
        const errorMsg = `❌ [SOVEREIGN_ERROR] No API Key for ${model}. Mocks are forbidden.`;
        IQRALogger.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL
        });

        const response = await withTimeout(
            client.chat.completions.create({
                model: model,
                messages: [
                    { role: 'system', content: 'You are IQRA, a sovereign AI focused on structural and causal analysis.' },
                    ...context,
                    { role: 'user', content: input }
                ],
                max_tokens: 1500
            }),
            IQRA_TIMEOUTS.LLM,
            `Economy Model: ${model}`
        );

        return response.choices[0]?.message?.content || '';
    } catch (error: any) {
        IQRALogger.error(`❌ [ECONOMY] Error with ${model}:`, error);
        throw error;
    }
}
