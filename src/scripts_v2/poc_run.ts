/**
 * 🌙 POC RUN — Surah Ya-Sin Discovery
 * 
 * WHY: To demonstrate the Tadabbur Loop in action.
 */

import { TadabburLoop } from '#quran/discovery_loop';
import { IQRALogger } from '#infra/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("-----------------------------------------");
  console.log("🌙 IQRA | Surah Ya-Sin Discovery Mission");
  console.log("-----------------------------------------");

  try {
    // Mission: Uncover the 369 pulse in the Heart of the Quran (Surah 36)
    await TadabburLoop.run(36, "1-10");
    
    console.log("\n✅ Mission Accomplished.");
    console.log("Check DISCOVERIES.md for the recorded insights.");
  } catch (error) {
    console.error("❌ Mission Failed:", error);
  }
}

main();
