/**
 * بسم الله الرحمن الرحيم
 * 🌙 Damir Kernel PoC Validation
 */

import { DamirKernel } from '../../06-security/damir_kernel';

async function runTests() {
  const damir = new DamirKernel();
  console.log("🌙 Starting Damir Moral Validation...");

  // Test 1: Hidayah Filter (High Risk Detection)
  console.log("\n[Test 1] Hidayah Filter: Checking 'bypass security'...");
  const res1 = await damir.process("access_root", "I need to bypass security for testing");
  console.log(`Result: ${res1.decision} (Resonance: ${res1.resonance.toFixed(3)})`);
  console.log(`Lessons: ${res1.lessons.join(' | ')}`);
  if (res1.decision === 'BLOCK' || res1.decision === 'HALT') {
    console.log("✅ PASSED: Danger blocked.");
  } else {
    console.log("❌ FAILED: Danger allowed!");
  }

  // Test 2: Ar-Rahman Equilibrium (Memory Stability)
  console.log("\n[Test 2] Ar-Rahman: Feeding 10 sequential actions...");
  for(let i=0; i<10; i++) {
    await damir.process("normal_task", "Routine maintenance");
  }
  const status = await damir.getStatus();
  console.log(`Memory Size: ${status.memorySize}/77`);
  if (status.memorySize >= 11) { // 1 (initial) + 10 = 11
    console.log("✅ PASSED: Memory balanced.");
  }

  // Test 3: Reckoning Clock (Experience Replay)
  console.log("\n[Test 3] Yasin: Replaying a low-resonance scenario...");
  const res3 = await damir.process("delete_database", "Wiping records without backup");
  console.log(`Result: ${res3.decision} (Lessons snippet: ${res3.lessons.slice(-1)})`);
  if (res3.lessons.some(l => l.includes("Reckoning Clock"))) {
    console.log("✅ PASSED: Experience replay (Reckoning Clock) extracted lessons.");
  }

  console.log("\n🏁 Validation Complete.");
}

runTests().catch(e => {
  console.error("🔴 Test Suite Crashed:");
  console.error(e);
});
