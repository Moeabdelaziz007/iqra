import { IQRACommands } from '../../lib/iqra/commands';

/**
 * IQRA E2E Test - Status Verification
 * 
 * "فَوَرَبِّكَ لَنَسْأَلَنَّهُمْ أَجْمَعِينَ" — الحجر: 92
 */

async function runTest() {
  console.log("🚀 Starting IQRA E2E Status Test...");

  // 1. Test /status output
  console.log("Testing /status command...");
  const status = IQRACommands.getStatus();
  if (status.includes("IQRA | الحالة") && status.includes("مؤشر الصدق")) {
    console.log("✅ /status command returns valid structure.");
  } else {
    console.error("❌ /status command failed validation.");
    process.exit(1);
  }

  // 2. Test /sleep and /wake cycle
  console.log("Testing /sleep command...");
  IQRACommands.sleep();
  if (IQRACommands.isSleeping()) {
    console.log("✅ IQRA is correctly in sleep mode.");
  } else {
    console.error("❌ /sleep command failed.");
    process.exit(1);
  }

  console.log("Testing /wake command...");
  IQRACommands.wake();
  if (!IQRACommands.isSleeping()) {
    console.log("✅ IQRA is correctly awake.");
  } else {
    console.error("❌ /wake command failed.");
    process.exit(1);
  }

  console.log("\n✨ All E2E Status Tests Passed by the Grace of Allah.");
}

runTest().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
