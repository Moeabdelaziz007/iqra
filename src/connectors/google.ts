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
        try {
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
        } catch (error: any) {
            this.handleFailure(error, 'GOOGLE_GENERATE');
        }
    }
}
