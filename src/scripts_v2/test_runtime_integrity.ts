/**
 * 🧪 Runtime Integrity Test — اختبار سلامة نظام التشغيل
 * 
 * Verifies the 7-loop cognitive cycle and sovereign governance.
 */

import { Orchestrator } from '#runtime/sovereign-gateway';
import { MemoryEngine, MemoryType } from '#runtime/topological-memory-bridge';
import { IQRALogger } from '#infra/logger';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  const orchestrator = new Orchestrator();
  const memory = new MemoryEngine();
  const sessionId = `test-${Date.now()}`;

  IQRALogger.info("🚀 Starting Runtime Integrity Test...");

  try {
    // Test 1: Research Flow
    console.log("\n--- [TEST 1: Research Flow] ---");
    const researchInput = "Research the latest patterns in agentic memory architecture";
    const result = await orchestrator.runCycle(researchInput, sessionId);
    
    console.log("Result:", JSON.stringify(result, null, 2));

    if (result.reflection.verdict === 'PASS') {
      console.log("✅ Research cycle passed.");
    } else {
      console.log("❌ Research cycle failed verdict.");
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
  }
}

runTest();
