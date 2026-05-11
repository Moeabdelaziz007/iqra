import { AgentCore } from '../lib/iqra/core';
import { IQRABrainMode } from '../lib/iqra/brain';

async function test() {
  console.log('Testing Observability...');
  try {
    await AgentCore.execute('What is the meaning of life?', IQRABrainMode.FAST_RESPONSE, (pulse) => {
      console.log(`[PULSE] ${pulse.type} | ${pulse.status} | ${pulse.message || ''}`);
    });
  } catch (e) {
    console.error('Test failed as expected or unexpected:', e.message);
  }
}

test();
