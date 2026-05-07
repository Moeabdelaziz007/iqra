import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TopologicalLoop } from '../../orchestrator/topological-loop';

/**
 * 🌙 Topological Curiosity E2E Test — اختبار النهاية للنهاية
 * 
 * Validates the full slice: Mission -> Orchestrator -> Workers -> Rewards -> Ledger.
 */

describe('Topological Curiosity Mission E2E', () => {
  const missionPath = path.join(process.cwd(), 'missions/topological-curiosity.yaml');
  const ledgerPath = path.join(process.cwd(), 'ledger/rewards.jsonl');

  beforeAll(() => {
    // Clean ledger for a clean test
    if (fs.existsSync(ledgerPath)) {
      fs.unlinkSync(ledgerPath);
    }
  });

  it('should execute the full mission loop and record rewards', async () => {
    const orchestrator = new TopologicalLoop(missionPath);
    
    // Run the cycle
    await orchestrator.runCycle();

    // Verify Ledger
    expect(fs.existsSync(ledgerPath)).toBe(true);
    
    const content = fs.readFileSync(ledgerPath, 'utf8').trim();
    const entries = content.split('\n').map(line => JSON.parse(line));
    
    expect(entries.length).toBe(1);
    const entry = entries[0];
    
    expect(entry.mission_id).toBe('topological-curiosity-001');
    expect(entry.validation_status).toBe('verified');
    expect(entry.total_reward).toBeGreaterThan(0.5);
    expect(entry.discovery_level).toBeDefined();
    
    console.log(`✅ [E2E] Success: Reward recorded in ledger: ${entry.total_reward}`);
  });
});
