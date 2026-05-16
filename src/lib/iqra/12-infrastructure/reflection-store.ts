import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * IQRA Reflection Store — replaces Qdrant per ADR-0001.
 * Stores reflections locally in JSONL format.
 */

const REFLECTIONS_PATH = path.join(process.cwd(), '.iqra', 'reflections.jsonl');

export async function storeReflection(content: string, metadata: Record<string, any> = {}) {
  try {
    const dir = path.dirname(REFLECTIONS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const entry = JSON.stringify({
      id: randomUUID(),
      content,
      metadata,
      timestamp: new Date().toISOString(),
    }) + '\n';

    fs.appendFileSync(REFLECTIONS_PATH, entry, 'utf-8');
    return null;
  } catch (error) {
    console.error('❌ Reflection Store Error:', error);
    return null;
  }
}

export async function searchMemory(query: string, limit: number = 3) {
  try {
    if (!fs.existsSync(REFLECTIONS_PATH)) return [];
    const lines = fs.readFileSync(REFLECTIONS_PATH, 'utf-8').trim().split('\n').filter(Boolean);
    const entries = lines.map(l => JSON.parse(l));
    return entries.slice(-limit).map((e: any) => ({
      id: e.id,
      payload: { content: e.content, ...e.metadata },
      score: 0,
    }));
  } catch {
    return [];
  }
}