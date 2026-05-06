import { iqraThink, IQRABrainMode } from './lib/iqra/brain';
import { IQRALogger } from './lib/iqra/logger';

async function testMissionControl() {
  console.log("🌙 IQRA | Mission Control E2E Test");
  console.log("-----------------------------------");

  const input = "Explain the concept of Tawakkul (reliance on God) and its resonance with modern psychological resilience.";
  
  try {
    const result = await iqraThink({
      input,
      mode: IQRABrainMode.DEEP_THINKING
    });

    console.log("\n[FINAL RESPONSE]:\n");
    console.log(result.response);
    console.log("\n[PROVIDER]:", result.provider);
  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

testMissionControl();
