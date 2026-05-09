import { IQRAExecutionLoop } from './loop';
import { IQRATopology } from '../10-topology/topology';
import { IQRACommands } from '../13-utils/commands';
import fs from 'fs';
import path from 'path';
import { sovereignSync } from '../13-utils/git-ops';
import { execSync } from 'child_process';

/**
 * 🚀 IQRA E2E Runner (Pure Reality - No Mocks)
 * 
 * This runner executes a real workflow:
 * 1. Synchronize topological state with Git/Filesystem.
 * 2. Execute a real system task (e.g., integrity check).
 * 3. Log a REAL reflection in REFLECTION_7.md.
 * 4. Update the global PLAN.md with progress.
 */

export async function runRealWorkflow(taskDescription: string) {
  // PRE-FLIGHT CHECK: Block if the working tree is dirty
  const status = execSync('git status --porcelain').toString().trim();
  if (status) {
    console.error('❌ [ITQAN BLOCK] | Uncommitted changes detected. E2E aborted to preserve integrity.');
    console.log('Status:\n', status);
    return;
  }

  const topology = new IQRATopology();

  // 0. INITIAL SYNC: Ensure we are operating on the latest sovereign state
  await sovereignSync();
  await topology.syncStateWithReality();

  console.log(`🌀 [TOPOLOGY] Starting from state: ${topology.getCurrentState()} with Curvature: ${topology.calculateCurvature()}`);

  return IQRAExecutionLoop.runTask(async () => {
    // 1. REAL EXECUTION: Verify project structure
    console.log("🛠️ [ITQAN] Verifying project integrity...");
    const files = fs.readdirSync(process.cwd());
    if (!files.includes('FITRAH.md')) throw new Error("Critical File Missing: FITRAH.md");

    // 2. REAL LEARNING: Update Reflection
    const reflectionPath = path.join(process.cwd(), 'REFLECTION_7.md');
    const timestamp = new Date().toISOString();
    const entry = `\n### E2E Workflow: ${taskDescription}\n- Time: ${timestamp}\n- Curvature: ${topology.calculateCurvature()}\n- Result: Success (Real structural verification)\n`;
    fs.appendFileSync(reflectionPath, entry);

    console.log(topology.transition(true));
    console.log("✅ [SUCCESS] Real E2E Workflow Completed.");

    // 3. FINAL SYNC: Push the new reflection and state to the repository
    await sovereignSync();

  }, {
    id: `E2E_${Date.now()}`,
    intention: taskDescription
  });
}

// Auto-run if executed directly
if (require.main === module) {
  runRealWorkflow("Verification of Project Sovereign Integrity")
    .then(() => console.log(IQRACommands.getStatus()))
    .catch(console.error);
}
