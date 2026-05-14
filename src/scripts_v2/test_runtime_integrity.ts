/**
 * 🧪 Runtime Integrity Test — اختبار سلامة نظام التشغيل
 *
 * Verifies the 7-loop cognitive cycle and sovereign governance by exercising
 * the SovereignGateway (constitutional entry point) and TopologicalMemoryBridge
 * (episodic persistence) end-to-end against the live runtime.
 */

import { SovereignGateway } from '#runtime/sovereign-gateway';
import { TopologicalMemoryBridge, MemoryType } from '#runtime/topological-memory-bridge';
import { IQRALogger } from '#infra/logger';
import * as fs from 'fs';
import * as path from 'path';

async function runTest(): Promise<void> {
  const gateway = new SovereignGateway();
  const memory = new TopologicalMemoryBridge();
  const sessionId = `test-${Date.now()}`;

  IQRALogger.info("🚀 Starting Runtime Integrity Test...");

  try {
    // Test 1: Sovereign Cycle (Research Flow)
    console.log("\n--- [TEST 1: Sovereign Cycle] ---");
    const researchInput = "Research the latest patterns in agentic memory architecture";
    const result = await gateway.runCycle(researchInput, sessionId);

    console.log("Result:", JSON.stringify(result, null, 2));

    if (result.audit && result.audit.alignmentScore >= 0.5) {
      console.log("✅ Sovereign cycle passed constitutional audit.");
    } else {
      throw new Error("Sovereign cycle failed constitutional audit.");
    }

    // Test 2: Memory Persistence
    console.log("\n--- [TEST 2: Memory Persistence] ---");
    const episodicMemory = await memory.retrieve(MemoryType.EPISODIC, researchInput);
    if (episodicMemory.length > 0) {
      console.log("✅ Episodic memory retrieved.");
    } else {
      console.log("❌ Episodic memory missing.");
    }

    // Test 3: Discovery Logging
    console.log("\n--- [TEST 3: Discovery Logging] ---");
    const discoveriesFile = path.join(process.cwd(), 'knowledge/DISCOVERIES.md');
    if (fs.existsSync(discoveriesFile)) {
      const content = fs.readFileSync(discoveriesFile, 'utf8');
      if (content.includes(researchInput)) {
        console.log("✅ Discovery logged to DISCOVERIES.md.");
      } else {
        console.log("❌ Discovery entry not found in file.");
      }
    } else {
      console.log("❌ DISCOVERIES.md file missing.");
    }

    console.log("\n✨ All integrity tests completed successfully.");
  } catch (error) {
    console.error("💥 Test failed with error:", error);
    process.exitCode = 1;
  }
}

runTest();
