import { AgentCore } from '../lib/iqra/core';
import { IQRABrainMode } from '../lib/iqra/brain';
import { IQRACommands } from '../lib/iqra/commands';

async function verify() {
  console.log('--- 1. Testing Commands ---');
  console.log('Status Command Output:');
  console.log(IQRACommands.getStatus());

  console.log('\n--- 2. Testing AgentCore Observability ---');
  try {
    // We mock the brain call if it requires API keys we don't have,
    // but the logic of pulses should still run until the first LLM call or rejection.
    await AgentCore.execute('Say Salam', IQRABrainMode.FAST_RESPONSE, (pulse) => {
      console.log(`[PULSE] ${pulse.type} | ${pulse.status} | ${pulse.message}`);
    });
  } catch (e) {
    console.log(`Caught expected/actual error: ${e.message}`);
  }
}

verify();
