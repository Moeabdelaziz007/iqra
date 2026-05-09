/**
 * Evolution Runner — محرك التطور
 * 
 * Orchestrates the 20-minute autonomous evolution cycle.
 */

import { DamirKernel } from '../06-security/damir_kernel';
import * as fs from 'fs';
import * as path from 'path';

import { TadabburLoop } from '../quran/discovery_loop';

const damir = new DamirKernel();

async function logProgress(message: string) {
  const logPath = path.join(process.cwd(), 'iqra-core', 'EVOLUTION_LOG.md');
  const timestamp = new Date().toLocaleTimeString();
  fs.appendFileSync(logPath, `\n- [${timestamp}] ${message}`);
  console.log(`[DAMIR] ${message}`);
}

async function cycle() {
  await logProgress("🌀 DAMIR Cycle — 7 Meta Loops Initiated...");
  
  try {
    // 1. Process Sovereign Consciousness
    const result = await damir.process(
      "EVOLUTIONARY_RESEARCH",
      "Context: Building the Sovereign Conscience (Damir) L7-Spirit."
    );
    
    await logProgress(`[L1-L7 Result] Decision: ${result.decision} | Resonance: ${result.resonance} | Reward: ${result.reward}`);
    
    // 2. Initiate Tadabbur Discovery Loop (Surah Yasin)
    await logProgress("📖 Initiating Tadabbur Loop...");
    await TadabburLoop.run(36); // Surah Yasin
    
    if (result.decision === 'HALT' || result.decision === 'BLOCK') {
      await logProgress("⚠️ Critical Non-Resonance! Initiating Tawbah Protocol Revert.");
    }
  } catch (e) {
    await logProgress(`❌ FATAL SOVEREIGN ERROR: ${e.message}`);
    // In real scenario: halt process or restart kernel
  }
}

// Start the 20-minute loop
const startTime = Date.now();
const TWENTY_MINUTES = 20 * 60 * 1000;

async function run() {
  await logProgress("🕋 DAMIR | Autonomous Evolution 20-min Cycle INITIATED");
  
  while (Date.now() - startTime < TWENTY_MINUTES) {
    await cycle();
    await logProgress("Waiting for next resonance (60s)...");
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
  
  await logProgress("🏁 20-minute Sovereign Cycle COMPLETED.");
}

run();
