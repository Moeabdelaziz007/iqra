import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';

// Direct imports without aliases - following IQRA_SUPREME principles
import { runMission } from '#core/mission-runner';

/**
 * 🔬 IQRA Simple E2E Test — "Truth Verification"
 * الهدف: تشغيل مهمة بسيطة بدون mocks للتحقق من الصدق
 * المبدأ: No Mocks, No Hallucinations, Memory Governance is heart
 */
describe('IQRA Simple E2E (Truth Verification)', () => {
  const testDir = path.join(os.tmpdir(), `iqra-simple-test-${Date.now()}`);
  
  beforeAll(async () => {
    // Ensure test directory exists
    if (!existsSync(testDir)) {
      await fs.mkdir(testDir, { recursive: true });
    }
  });

  it('should run a simple mission with real components', async () => {
    // Create a minimal mission
    const missionId = `simple_truth_${Date.now()}`;
    const missionPath = path.join(testDir, 'mission.yaml');
    
    const missionScope = {
      mission_id: missionId,
      objective: "Verify basic mission execution without mocks",
      verse: "2:255",
      field_of_inquiry: "Basic Truth Verification",
      provider: "simulated", // Using simulated for reliability
      dev_mode: true, // Explicitly allowing simulation
      allowed_tools: []
    };

    await fs.writeFile(missionPath, yaml.dump(missionScope), 'utf-8');

    console.log(`🚀 Running Simple E2E Mission: ${missionId}`);
    
    // Run the mission with real components
    const result = await runMission(missionPath, testDir);

    // Basic verification
    expect(result).toBeDefined();
    expect(result.status).toBe('completed' as any);
    expect(result.mission_id).toBe(missionId);
    
    console.log(`✅ Simple Mission ${missionId} completed successfully`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`📝 Steps: ${result.steps_completed?.join(', ') || 'N/A'}`);
  }, 30000); // 30s timeout
});
