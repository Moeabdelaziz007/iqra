import { IQRAExecutionLoop } from './loop';
import { IQRATopology } from '#topology/topology';
import { IQRACommands } from '#utils/commands';
import fs from 'fs';
import path from 'path';
import { sovereignSync } from '#utils/git-ops';
import { execSync } from 'child_process';
import { IQRALogger } from '#infra/logger';

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
    IQRALogger.error('❌ [ITQAN BLOCK] Uncommitted changes detected; E2E aborted to preserve integrity', { status });
    return;
  }

  const topology = new IQRATopology();

  // 0. INITIAL SYNC: Ensure we are operating on the latest sovereign state
  await sovereignSync();
  await topology.syncStateWithReality();

  IQRALogger.info('🌀 [TOPOLOGY] Starting workflow', {
    state: topology.getCurrentState(),
    curvature: topology.calculateCurvature(),
  });

  return IQRAExecutionLoop.runTask(async () => {
    // 1. REAL EXECUTION: Verify project structure
    IQRALogger.info('🛠️ [ITQAN] Verifying project integrity');
    const files = fs.readdirSync(process.cwd());
    if (!files.includes('FITRAH.md')) throw new Error("Critical File Missing: FITRAH.md");

    // 2. REAL LEARNING: Update Reflection
    const reflectionPath = path.join(process.cwd(), 'REFLECTION_7.md');
    const timestamp = new Date().toISOString();
    const entry = `\n### E2E Workflow: ${taskDescription}\n- Time: ${timestamp}\n- Curvature: ${topology.calculateCurvature()}\n- Result: Success (Real structural verification)\n`;
    fs.appendFileSync(reflectionPath, entry);

    IQRALogger.info('🌀 [TOPOLOGY] Transition', { transition: topology.transition(true) });
    IQRALogger.info('✅ [SUCCESS] Real E2E workflow completed');

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
    .then(() => IQRALogger.info('Status', { status: IQRACommands.getStatus() }))
    .catch(err => IQRALogger.error('runRealWorkflow failed', { err }));
}
