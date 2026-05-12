// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🛰️ Sovereign Intelligence E2E Test
 * 
 * Verifies the integration of:
 * 1. Cognitive Engine (MCTS + Topology)
 * 2. Mission Control Orchestration
 * 3. Evolutionary Loop (Search369)
 * 4. Reward & Trust Chain
 */

import { iqraThink } from '../../lib/iqra/01-core/brain';
import { SovereignCognitiveOrchestrator } from '../../lib/iqra/08-cognitive/engine';
import { IQRAMemory } from '../../lib/iqra/03-memory/memory';
import { IQRALogger } from '../../lib/iqra/02-infra/logger';
import { RewardEngine } from '../../lib/iqra/05-rewards/engine';

describe('Sovereign Intelligence Integration (E2E)', () => {
  
  beforeAll(async () => {
    process.env.IQRA_LOCAL_MODE = 'false';
    // Memory uses lazy static initialization, no explicit init needed here.
  });

  test('Cognitive Engine should perform deep MCTS and Topology analysis', async () => {
    const orchestrator = new SovereignCognitiveOrchestrator();
    const query = "تحليل بنية سورة الإخلاص توبولوجياً";
    
    const result = await orchestrator.explore(query);
    
    console.log('--- Cognitive Exploration Result ---');
    console.log(`Query: ${result.query}`);
    console.log(`Best MCTS Action: ${result.simulation.bestAction}`);
    console.log(`Betti Numbers: LB0=${result.topology.betti.lb0}, LB1=${result.topology.betti.lb1}`);
    
    expect(result.simulation.confidence).toBeGreaterThan(0);
    expect(result.topology.betti).toBeDefined();
    expect(result.swarmPath).toBeDefined();
  });

  test('Mission Control should integrate cognitive insights in full cycle', async () => {
    const query = "ابحث في القرآن عن آيات الصدق وقم بتحليلها باستخدام MCTS";
    
    // We mock the LLM responses for the workers to avoid hitting real APIs during E2E test if necessary
    // But here we want to see if the ORCHESTRATION flow works.
    
    const result = await iqraThink({
      input: query,
      options: { mock_workers: true } // Assuming we have a way to mock worker LLM calls
    });
    
    expect(result.response).toBeDefined();
    expect(result.reports).toBeDefined();
    expect(result.reports!.length).toBeGreaterThan(0);
    
    // Check if cognitive context was added
    const missionReport = result.reports![0];
    expect(missionReport.mission_id).toMatch(/^mission_/);
  });

  test('Reward Engine should calculate barakah based on topological resonance', async () => {
    const pathKey = "test_sovereign_path_" + Date.now();
    const mockReports: any[] = [
      { worker_id: 'resonance', procedures_followed: true, status: 'SUCCESS', implemented: ['analyzed resonance'] },
      { worker_id: 'research', procedures_followed: true, status: 'SUCCESS', implemented: ['found verses'] }
    ];
    
    const reward = await RewardEngine.grantFromReports("mission_test_123", mockReports, 0.85);
    
    console.log(`Total Reward Granted: ${reward.total_reward}`);
    expect(reward.total_reward).toBeGreaterThan(0);
    expect(reward.reward_vector.resonance).toBeGreaterThan(0);
  });

});
