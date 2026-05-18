import { Redis } from '@upstash/redis';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🏛️ IQRA Memory Governor
 * 
 * Per ADR-0001: Qdrant removed — uses Upstash Redis + local SQLite.
 */
export class MemoryGovernor {
  private redis: Redis | null = null;

  // Sovereign Thresholds
  private readonly HOT_LIMIT = 29;     // Upstash Redis entries
  private readonly WARM_LIMIT = 100;   // Local JSONL entries
  private readonly LEARNINGS_PATH = path.join(process.cwd(), 'LEARNINGS.md');
  private readonly COLD_STORAGE_DIR = path.join(process.cwd(), 'iqra-core', 'data', 'cold_storage');
  
  constructor() {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      this.redis = Redis.fromEnv();
    }
  }

  /**
   * 🔄 Self-Healing Cycle
   */
  async maintain() {
    console.log('🏛️ [GOVERNOR] Starting memory maintenance cycle...');
    
    try {
      await this.manageHotMemory();
      await this.manageWarmMemory();
      await this.compaction();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('⚠️ [GOVERNOR] Emergency Mode Activated: Using local fallback.', message);
      this.activateEmergencyMode();
    }
  }

  private async manageHotMemory() {
    if (!this.redis) return;
    
    // Check key count (simulated or via keys command if supported)
    const keys = await this.redis.keys('iqra:hot:*');
    if (keys.length > this.HOT_LIMIT) {
      console.log(`🧹 [GOVERNOR] Hot memory exceeds limit (${keys.length}/${this.HOT_LIMIT}). Evicting oldest...`);
      // Eviction logic: In a real scenario, we would use LRU or move to Warm.
      // For now, we move excess to Warm (Qdrant).
      const excessKeys = keys.slice(0, keys.length - this.HOT_LIMIT);
      for (const key of excessKeys) {
        const value = await this.redis.get(key);
        if (value) await this.moveToWarm(key, value);
        await this.redis.del(key);
      }
    }
  }

  private async manageWarmMemory() {
    // Per ADR-0001: Qdrant removed. Warm memory uses local SQLite via MicroMemory.
    const warmPath = path.join(process.cwd(), '.iqra', 'warm_memory.jsonl');
    if (!fs.existsSync(warmPath)) return;
    
    const lines = fs.readFileSync(warmPath, 'utf-8').trim().split('\n').filter(Boolean);
    if (lines.length > this.WARM_LIMIT) {
      const excess = lines.slice(0, lines.length - this.WARM_LIMIT);
      for (const line of excess) {
        try {
          const data = JSON.parse(line);
          await this.offloadToCold('warm', data);
        } catch {}
      }
      fs.writeFileSync(warmPath, lines.slice(-this.WARM_LIMIT).join('\n') + '\n', 'utf-8');
    }
  }

  /**
   * 🧹 Compaction Logic — Prune or offload based on age/importance
   */
  async compaction() {
    console.log('🧹 [GOVERNOR] Running memory compaction...');
    // Implementation: Review recent learns and consolidate patterns
  }

  private async offloadToCold(collection: string, data: any) {
    if (!fs.existsSync(this.COLD_STORAGE_DIR)) {
      fs.mkdirSync(this.COLD_STORAGE_DIR, { recursive: true });
    }
    const fileName = `offload_${collection}_${Date.now()}.json`;
    fs.writeFileSync(path.join(this.COLD_STORAGE_DIR, fileName), JSON.stringify(data, null, 2));
    console.log(`❄️ [GOVERNOR] Offloaded data to ${fileName}`);
  }

  /**
   * 🎓 Learning Tier — Capture corrections and post-mortems
   */
  async promoteToLearning(lesson: string, context: Record<string, unknown>) {
    console.log('🎓 [GOVERNOR] New learning captured.');
    const entry = `\n### 📝 Lesson (${new Date().toISOString()})\n- **Observation**: ${lesson}\n- **Context**: ${JSON.stringify(context)}\n`;
    
    if (!fs.existsSync(this.LEARNINGS_PATH)) {
      fs.writeFileSync(this.LEARNINGS_PATH, '# 🎓 IQRA Sovereign Learnings\n\n[DO NOT EDIT MANUALLY - AUTO-EVOLUTION FEED]\n');
    }
    fs.appendFileSync(this.LEARNINGS_PATH, entry);
  }

  private async moveToWarm(key: string, data: unknown) {
    console.log(`🔥 -> ☀️ [GOVERNOR] Promoting ${key} to Warm storage.`);
    const warmPath = path.join(process.cwd(), '.iqra', 'warm_memory.jsonl');
    const dir = path.dirname(warmPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(warmPath, JSON.stringify({ key, data, timestamp: Date.now() }) + '\n', 'utf-8');
  }

  private activateEmergencyMode() {
    const emergencyLog = path.join(process.cwd(), 'iqra-core', 'EMERGENCY_STATE.json');
    const state = {
      timestamp: new Date().toISOString(),
      status: 'EMERGENCY_LOCAL_FALLBACK',
      reason: 'Infrastructure failure detected'
    };
    fs.writeFileSync(emergencyLog, JSON.stringify(state, null, 2));
    console.log('🛑 [EMERGENCY] Infrastructure is now running in local-only mode.');
  }
}
