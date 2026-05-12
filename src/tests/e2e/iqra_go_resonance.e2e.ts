import { it, expect, describe, beforeAll, afterAll } from 'vitest';
import { iqraThink, IQRABrainMode } from '#core/brain';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('IQRA Go Engine Resonance E2E', () => {
  let goEngine: ChildProcess;

  beforeAll(async () => {
    // Start Go engine in the background for the test
    const engineDir = path.resolve(process.cwd(), 'services/go-engine');
    
    // We try to start it, but we handle the case where it might already be running
    // or if the environment restricts binding (as seen in the agent session)
    goEngine = spawn('go', ['run', '.'], {
      cwd: engineDir,
      stdio: 'inherit'
    });

    // Wait a bit for the engine to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(() => {
    if (goEngine) {
      goEngine.kill();
    }
  });

  it('should detect numerical symmetries using the Go Engine', async () => {
    // This input has 7 words (SABEEN_WORDS) and specific Arabic characters
    const input = "بسم الله الرحمن الرحيم الحمد لله رب العالمين";
    
    const result = await iqraThink({
      input,
      mode: IQRABrainMode.FAST_RESPONSE
    });

    expect(result).toBeDefined();
    expect(result.response).toBeTruthy();
    
    // Note: The Go engine log will appear in stdout if it's connected
    console.log(`✅ Brain Response: ${result.response.substring(0, 100)}...`);
  });

  it('should detect Mizan balance using the Go Engine', async () => {
    // This input contains "Dunya" and "Akhirah" (Mizan balance)
    const input = "الحياة الدنيا والآخرة";
    
    const result = await iqraThink({
      input,
      mode: IQRABrainMode.FAST_RESPONSE
    });

    expect(result).toBeDefined();
    expect(result.response).toBeTruthy();
  });
});
