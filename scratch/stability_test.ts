import { IQRAMemory } from '../lib/iqra/memory';
import { iqraThink, IQRABrainMode } from '../lib/iqra/brain';

async function runStabilityTest() {
  console.log('🧪 Starting IQRA Stability Test...');

  try {
    // 1. Test Memory Connection (Partial)
    console.log('--- Step 1: Memory Check ---');
    const cycle = await IQRAMemory.getCycleCounter();
    console.log('✅ Cycle Counter:', cycle);

    // 2. Test Brain Reasoning (Simulated Query)
    console.log('--- Step 2: Brain Reasoning ---');
    const query = "What is the significance of number 7 in the Quran?";
    // Note: This will actually call the LLM if keys are present
    const response = await iqraThink({
      input: query,
      mode: IQRABrainMode.FAST_RESPONSE
    });
    console.log('✅ Brain Response Received (truncated):', response.substring(0, 100));

    // 3. Test Semantic Memory Search
    console.log('--- Step 3: Semantic Search ---');
    const echoes = await IQRAMemory.searchSemantic(query, 1);
    console.log('✅ Semantic Echoes Found:', echoes.length);

    console.log('🚀 Stability Test Passed Successfully.');
  } catch (error) {
    console.error('❌ Stability Test Failed:', error);
    process.exit(1);
  }
}

// runStabilityTest(); // Uncomment to run manually in a node env
