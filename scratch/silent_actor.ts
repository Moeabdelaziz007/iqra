import { IQRAMemory } from '../lib/iqra/memory';
import { IQRALogger } from '../lib/iqra/logger';

async function run() {
  console.log('--- 🕵️ Silent Actor Status ---');
  
  const cycleCounter = await IQRAMemory.getCycleCounter();
  const successCounter = await IQRAMemory.getSuccessCounter();
  const curiosity = await IQRAMemory.getCuriosity();
  
  console.log(`Cycles: ${cycleCounter}`);
  console.log(`Successes: ${successCounter}`);
  console.log(`Curiosity: ${curiosity.toFixed(4)}`);
  
  // Check for open handles (simulated)
  console.log('Checking for open handles...');
  // Since we are running in a script that exits, handles will be closed.
  // But we can check if anything was left in "working_memory"
  
  const workingMemory = await IQRAMemory.get('working_memory');
  console.log('Working Memory:', workingMemory || 'Empty');
  
  process.exit(0);
}

run();
