import { IQRAMemory } from './lib/iqra/memory';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const counter = await IQRAMemory.getCycleCounter();
  console.log(`Current IQRA Cycle Counter: ${counter}`);
}

main().catch(console.error);
