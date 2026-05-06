import { randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * IQRA Semantic Memory — الذاكرة الدلالية
 * Stores and retrieves knowledge based on meaning.
 */

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION = 'iqra_memory';

// Initialize Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

export async function storeReflectionInQdrant(content: string, metadata: Record<string, any> = {}) {
    try {
        // 1. Ensure the collection exists
        await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                ...(QDRANT_API_KEY && { 'api-key': QDRANT_API_KEY })
            },
            body: JSON.stringify({
                vectors: {
                    size: 768, // Gemini text-embedding-004 dimensions
                    distance: 'Cosine'
                }
            })
        });

        // 2. Generate Real Embedding
        const embedding = await generateEmbedding(content);

        // 3. Upsert the point
        const pointId = randomUUID();
        const payload = {
            points: [
                {
                    id: pointId,
                    vector: embedding,
                    payload: {
                        content,
                        timestamp: new Date().toISOString(),
                        ...metadata
                    }
                }
            ]
        };

        const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                ...(QDRANT_API_KEY && { 'api-key': QDRANT_API_KEY })
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());
        console.log(`🧠 [أخوَّة] | Memory stored in Qdrant (ID: ${pointId})`);
        return pointId;
    } catch (error) {
        console.error('❌ [أخوَّة] | Qdrant Error:', error);
        return null;
    }
}

export async function searchMemory(query: string, limit: number = 7) {
    try {
        const vector = await generateEmbedding(query);
        
        const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(QDRANT_API_KEY && { 'api-key': QDRANT_API_KEY })
            },
            body: JSON.stringify({
                vector,
                limit,
                with_payload: true
            })
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.result || [];
    } catch (error) {
        console.error('❌ [أخوَّة] | Search Error:', error);
        return [];
    }
}

async function generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.warn('⚠️ [أخوَّة] | No Gemini API Key found. Using mock embeddings.');
        return Array.from({ length: 768 }, () => Math.random() - 0.5);
    }

    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('❌ [أخوَّة] | Embedding Generation Failed:', error);
        return Array.from({ length: 768 }, () => Math.random() - 0.5);
    }
}