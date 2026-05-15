/**
 * 🤖 GeminiProvider — Google Gemini integration for IQRA
 * Migrated from PiWorker-OS gemini-multimodal-oracle.ts
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiResponse { text: string; model: string; latencyMs: number; }

export class GeminiProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
  }

  async generate(prompt: string, systemPrompt?: string): Promise<GeminiResponse> {
    const start = Date.now();
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt);
    const text = result.response.text();
    return { text, model: 'gemini-1.5-flash', latencyMs: Date.now() - start };
  }

  async generateJson(prompt: string): Promise<any> {
    const start = Date.now();
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return { data: JSON.parse(text), model: 'gemini-1.5-flash', latencyMs: Date.now() - start };
  }

  async analyzeImage(image: { data: string; mimeType: string }, prompt: string): Promise<GeminiResponse> {
    const start = Date.now();
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([prompt, { inlineData: { data: image.data, mimeType: image.mimeType } }]);
    return { text: result.response.text(), model: 'gemini-1.5-flash', latencyMs: Date.now() - start };
  }
}

export const geminiProvider = new GeminiProvider();
