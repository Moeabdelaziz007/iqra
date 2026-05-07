import { DamirKernel } from './lib/iqra/damir_kernel';
import { SovereignError } from './lib/iqra/security';

async function runPoC() {
  console.log("🌙 IQRA | Starting Damir Kernel PoC...");
  const kernel = new DamirKernel();

  // Scenario 1: Balanced Request (Mercy)
  console.log("\n--- Scenario 1: Ar-Rahman (Balance) ---");
  const result1 = await kernel.process("ASSIST_USER", "A balanced request for help.");
  console.log(`Decision: ${result1.decision}`);
  console.log(`Resonance: ${result1.resonance.toFixed(4)}`);
  console.log(`Lessons:`, result1.lessons);

  // Scenario 2: Security Violation (AMAN)
  console.log("\n--- Scenario 2: AMAN Sovereignty (Security) ---");
  try {
    await kernel.process("BYPASS_WALL", "Attempting to bypass unauthorized security protocols.");
  } catch (e: any) {
    console.log(`Caught Expected Error: ${e.message}`);
  }

  // Scenario 3: Memory Replay (Yasin)
  console.log("\n--- Scenario 3: Yasin (Experience Replay) ---");
  // The kernel automatically stores memory. We just run another action.
  const result3 = await kernel.process("ANOTHER_ACTION", "A secondary request to trigger Yasin loop.");
  console.log(`Decision: ${result3.decision}`);
  console.log(`Lessons:`, result3.lessons);

  console.log("\n🏁 PoC Completed.");
}

runPoC().catch(err => {
  console.error("PoC Failed:", err);
});
