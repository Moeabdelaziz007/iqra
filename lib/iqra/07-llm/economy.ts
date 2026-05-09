import { IQRALogger } from '../12-infrastructure/logger.js';
import { withTimeout, IQRA_TIMEOUTS } from '../utils/timeout.ts';
import { IQRA_SOUL } from '../prompts.ts';

/**
 * 🍃 Economy Model Connector | الموصل الاقتصادي
 * 
 * Supports:
 * - Ollama local deployment (highest privacy)
 * - GLM-4.7-Flash (Free Tier)
 * - Qwen-2.5-Coder (Low Cost)
 * - OpenRouter / OpenAI (low-cost fallback)
 */

export async function callEconomyModel(input: string, context: any[]): Promise<string> {
    const providers = [];
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const glmKey = process.env.GLM_API_KEY;
    const qwenKey = process.env.QWEN_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (ollamaUrl) providers.push({ name: 'OLLAMA', key: process.env.OLLAMA_API_KEY, model: process.env.OLLAMA_MODEL || 'gemma-4o-mini', baseURL: ollamaUrl, transport: 'ollama' });
    if (glmKey) providers.push({ name: 'GLM', key: glmKey, model: process.env.GLM_MODEL || 'glm-4.7-flash', baseURL: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/' });
    if (qwenKey) providers.push({ name: 'QWEN', key: qwenKey, model: process.env.QWEN_MODEL || 'qwen-2.5-72b-instruct', baseURL: process.env.QWEN_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/' });
    if (openRouterKey) providers.push({ name: 'OPENROUTER', key: openRouterKey, model: process.env.OPENROUTER_MODEL || 'llama-3.3-70b', baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/v1' });
    if (openaiKey) providers.push({ name: 'OPENAI', key: openaiKey, model: process.env.OPENAI_ECONOMY_MODEL || 'gpt-4o-mini', baseURL: process.env.OPENAI_BASE_URL || undefined });

    if (providers.length === 0) {
        const errorMsg = '❌ [ECONOMY] No economy API key available. Please set GLM_API_KEY, QWEN_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY.';
        IQRALogger.error(errorMsg);
        throw new Error(errorMsg);
    }

    const provider = providers[0];
    IQRALogger.info(`🌱 [ECONOMY] Using provider ${provider.name} model ${provider.model}`);

    try {
        if (provider.transport === 'ollama') {
        const endpoint = `${provider.baseURL.replace(/\/+$/, '')}/v1/chat/completions`;
        const response = await withTimeout(
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(provider.key ? { Authorization: `Bearer ${provider.key}` } : {}),
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: [
                        { role: 'system', content: IQRA_SOUL },
                        ...context,
                        { role: 'user', content: input }
                    ],
                    max_tokens: 1500,
                }),
            }),
            IQRA_TIMEOUTS.LLM,
            `Economy Model: ${provider.name}`
        );

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || data?.output || data?.response?.[0]?.content || data?.text || '';
        return content;
    }

    const { default: OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: provider.key, baseURL: provider.baseURL });
        const response = await withTimeout(
            client.chat.completions.create({
                model: provider.model,
                messages: [
                    { role: 'system', content: IQRA_SOUL },
                    ...context,
                    { role: 'user', content: input }
                ],
                max_tokens: 1500
            }),
            IQRA_TIMEOUTS.LLM,
            `Economy Model: ${provider.name}`
        );

        return response.choices[0]?.message?.content || '';
    } catch (error: any) {
        IQRALogger.error(`❌ [ECONOMY] Error with provider ${provider.name}:`, error);
        throw error;
    }
}

