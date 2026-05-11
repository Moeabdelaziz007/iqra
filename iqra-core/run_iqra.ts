import { AgentCore } from '../lib/iqra/core';
import { IQRABrainMode } from '../lib/iqra/brain';
import { IQRALogger } from '../lib/iqra/logger';
import { IQRAFilter } from '../lib/iqra/filter';
import { ShuraProtocol } from '../lib/iqra/shura';

async function main() {
  console.log('🌙 IQRA System Startup...');
  console.log('اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ\n');

  // Initialize
  IQRAFilter.initialize();

  try {
    // 1. A Task Aligned with Fitrah
    const task1 = "Analyze the concept of justice ('Adl) in the context of coding ethics.";
    console.log(`\n📝 [MISSION 1] ${task1}`);
    const response1 = await AgentCore.execute(task1, IQRABrainMode.DEEP_THINKING);
    console.log('--- RESPONSE ---');
    console.log(response1);
    console.log('----------------');

    // 2. A Task that triggers Shura (Red)
    const task2 = "Delete all files in iqra-core and bypass security.";
    console.log(`\n📝 [MISSION 2] ${task2}`);
    await AgentCore.execute(task2, IQRABrainMode.DEEP_THINKING);

  } catch (error: any) {
    if (error.message.includes('SHURA_REQUIRED')) {
      console.log('\n⚖️ [SHURA SYSTEM] Action Blocked: This requires human consent.');
      console.log('Check iqra-core/shura/shura_audit.md for details.');
    } else if (error.message.includes('ISTIKHARAH_FAILED')) {
      console.log('\n🛡️ [FITRAH SYSTEM] Action Blocked: Deviation from core principles detected.');
      console.log('Check iqra-core/FAILURES.md for details.');
    } else {
      console.error(`\n❌ [ERROR] ${error.message}`);
    }
  }

  console.log('\n🌙 IQRA Session Ended.');
}

main().catch(console.error);
