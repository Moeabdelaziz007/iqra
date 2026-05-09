import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseConnector, ConnectorResponse } from './base';
import { IQRA_SYSTEM_PROMPT } from '../personality';

export class GoogleConnector extends BaseConnector {
    name = 'Google (Gemini)';
    private genAI: GoogleGenerativeAI;

    constructor() {
        super();
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            this.handleFailure(new Error('Missing Google API Key (GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY)'), 'GOOGLE_INIT');
        }
        this.genAI = new GoogleGenerativeAI(apiKey!);
    }

    async generate(prompt: string, context: { role: 'user' | 'assistant' | 'system'; content: string }[] = []): Promise<ConnectorResponse> {
        return this.withQuantumResilience(async () => {
            const systemPrompt = context.find(m => m.role === 'system')?.content || IQRA_SYSTEM_PROMPT;
            const history = context
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                }));

            const model = this.genAI.getGenerativeModel({ 
                model: 'gemini-1.5-pro',
                systemInstruction: systemPrompt
            });

            const chat = model.startChat({ history });
            const result = await chat.sendMessage(prompt);
            const content = result.response.text();

            // Verify output integrity
            await this.verifyTruth(content);

            return {
                content,
                model: 'gemini-1.5-pro'
            };
        });
    }

    private async withQuantumResilience<T>(fn: () => Promise<T>, attempts: number = 5): Promise<T> {
        const backoff = [1000, 2000, 4000, 8000, 16000];
        
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (error: any) {
                const isRateLimit = error.message?.includes('429') || 
                                  error.message?.includes('RESOURCE_EXHAUSTED') ||
                                  error.status === 429;

                if (isRateLimit && i < attempts - 1) {
                    const delay = backoff[i] + Math.random() * 1000;
                    console.warn(`🌀 [Quantum Resilience] 429 Detected. Rerouting via Temporal Backoff: ${delay.toFixed(0)}ms (Sequence ${i + 1}/${attempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                this.handleFailure(error, 'GOOGLE_GENERATE');
            }
        }
        throw new Error('Quantum Resonance Failure: Max reconnection attempts exhausted.');
    }
}
