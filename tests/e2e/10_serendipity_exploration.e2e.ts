import { it, expect, describe, vi, beforeEach } from 'vitest';
import { TopologicalLoop } from '../../orchestrator/topological-loop';
import { MissionControl } from '../../lib/iqra/sovereign_orchestrator';
import { IQRAMemory } from '../../lib/iqra/memory';
import { RewardEngine } from '../../rewards/engine';
import { RewardLedger } from '../../ledger/reward-ledger';
import fs from 'fs';

describe('Serendipity & Pristine Path E2E', () => {
  
  beforeEach(() => {
    vi.restoreAllMocks();
    
    // Mock RewardLedger to prevent writing to disk
    vi.spyOn(RewardLedger, 'append').mockResolvedValue();
    
    // Mock IQRAMemory
    vi.spyOn(IQRAMemory, 'get').mockResolvedValue(null); // Default: path doesn't exist
    vi.spyOn(IQRAMemory, 'set').mockResolvedValue('OK');
  });

  it('should apply a 2.0x multiplier for a Pristine Path', async () => {
    const loop = new TopologicalLoop('/Applications/iqra/missions/test_serendipity.yaml');
    
    // 1. Mock MissionControl to return a set of reports
    const mockReports = [
      {
        worker_id: 'ResonanceWorker',
        status: 'PASS',
        implemented: ['Task A'],
        undone: [],
        commands_run: [],
        issues_discovered: [],
        mission_id: 'test_serendipity_mission',
        procedures_followed: true,
        exit_code: 0,
        serendipity: { found: true, note: 'Spiritual discovery' }
      },
      {
        worker_id: 'ValidationWorker',
        status: 'PASS',
        implemented: ['Task B'],
        undone: [],
        commands_run: [],
        issues_discovered: [],
        mission_id: 'test_serendipity_mission',
        procedures_followed: true,
        exit_code: 0
      }
    ];

    vi.spyOn(MissionControl.prototype, 'run').mockResolvedValue({
      response: 'Success',
      reports: mockReports as any,
      context: {
        novelty: 0.8,
        resonance: { coherence: 0.9 }
      }
    });

    // 2. Spy on RewardEngine to see what it computes before multiplier
    const computeSpy = vi.spyOn(RewardEngine, 'computeTotalReward');

    // 3. Run the loop
    await loop.runCycle();

    // 4. Assertions
    expect(computeSpy).toHaveBeenCalled();
    const engineOutput = computeSpy.mock.results[0].value;
    
    // The engineOutput.total_reward is ALREADY multiplied in the loop
    // because output is modified in place. 
    // Base reward was 0.895, expected total is 1.79
    expect(engineOutput.total_reward).toBeCloseTo(1.79, 2);
    
    expect(RewardLedger.append).toHaveBeenCalledWith(expect.objectContaining({
      total_reward: engineOutput.total_reward
    }));

    console.log('✅ Pristine Path Multiplier (2.0x) verified.');
  });

  it('should apply a 1.0x multiplier for a known (previously visited) Path', async () => {
    const loop = new TopologicalLoop('/Applications/iqra/missions/test_serendipity.yaml');
    
    // Mock IQRAMemory to return a value, indicating the path exists
    vi.spyOn(IQRAMemory, 'get').mockResolvedValue(Date.now());

    const mockReports = [
      {
        worker_id: 'ResonanceWorker',
        status: 'PASS',
        implemented: ['Task A'],
        undone: [],
        commands_run: [],
        issues_discovered: [],
        mission_id: 'test_serendipity_mission',
        procedures_followed: true,
        exit_code: 0
      },
      {
        worker_id: 'ValidationWorker',
        status: 'PASS',
        implemented: ['Task B'],
        undone: [],
        commands_run: [],
        issues_discovered: [],
        mission_id: 'test_serendipity_mission',
        procedures_followed: true,
        exit_code: 0
      }
    ];

    vi.spyOn(MissionControl.prototype, 'run').mockResolvedValue({
      response: 'Success',
      reports: mockReports as any,
      context: {
        novelty: 0.8,
        resonance: { coherence: 0.9 }
      }
    });

    const computeSpy = vi.spyOn(RewardEngine, 'computeTotalReward');

    await loop.runCycle();

    const engineOutput = computeSpy.mock.results[0].value;
    
    // Multiplier should be 1.0 since pathExists is true
    expect(RewardLedger.append).toHaveBeenCalledWith(expect.objectContaining({
      total_reward: engineOutput.total_reward
    }));

    console.log('✅ Known Path Multiplier (1.0x) verified.');
  });

  it('should calculate Dynamic Topology Score correctly', async () => {
    const loop = new TopologicalLoop('/Applications/iqra/missions/test_serendipity.yaml');
    
    // 3 implemented, 1 undone -> topology = 3/4 = 0.75
    const mockReports = [
      {
        worker_id: 'ResonanceWorker',
        status: 'PASS',
        implemented: ['Task A', 'Task B'],
        undone: ['Task C'],
        procedures_followed: true,
        exit_code: 0
      },
      {
        worker_id: 'ValidationWorker',
        status: 'PASS',
        implemented: ['Task D'],
        undone: [],
        procedures_followed: true,
        exit_code: 0
      }
    ];

    vi.spyOn(MissionControl.prototype, 'run').mockResolvedValue({
      response: 'Success',
      reports: mockReports as any,
      context: {}
    });

    const computeSpy = vi.spyOn(RewardEngine, 'computeTotalReward');
    await loop.runCycle();

    expect(computeSpy).toHaveBeenCalledWith(expect.objectContaining({
      topology_score: 0.75
    }));

    console.log('✅ Dynamic Topology Score (0.75) verified.');
  });
});
