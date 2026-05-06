import { IQRAEvolution } from './lib/iqra/evolution/self_evolve.ts';
import { IQRALogger } from './lib/iqra/logger.ts';
import fs from 'fs';
import path from 'path';

/**
 * 🧪 Failure Injection Test | اختبار حقن الفشل
 * Purpose: Force a failure, record it, and trigger the evolution cycle.
 * NO MOCKS - Testing actual logic flow.
 */
async function testFailureAndEvolution() {
    IQRALogger.info("🧪 [TEST] Starting real-world failure/evolution test...");

    const failureLogPath = path.join(process.cwd(), 'iqra-core/FAILURES.md');
    
    // 1. Manually inject a "Real" failure scenario to the log
    const mockFailure = `\n### 🛡️ [SIMULATED_FAILURE] ${new Date().toISOString()}
- **Type**: AsyncTimeout
- **Reason**: Qwen-2.5 API timed out during deep topological analysis.
- **Context**: The system attempted to map Surah Al-Kahf without enough memory allocation.
`;
    fs.appendFileSync(failureLogPath, mockFailure);
    IQRALogger.info("✅ [TEST] Failure injected into FAILURES.md");

    // 2. Trigger the Evolution Cycle
    // This will read the log, call the LLM (Real API if keys present, or fail if not)
    const strategy = await IQRAEvolution.runEvolutionCycle();
    
    if (strategy) {
        IQRALogger.info("✨ [TEST] Evolution strategy generated: " + strategy);
        
        // 3. Verify EVOLUTION_LOG.md
        const evolutionLog = fs.readFileSync(path.join(process.cwd(), 'iqra-core/EVOLUTION_LOG.md'), 'utf-8');
        if (evolutionLog.includes(strategy)) {
            IQRALogger.info("✅ [TEST] Evolution log updated correctly.");
        }
    } else {
        IQRALogger.error("❌ [TEST] Evolution failed to generate strategy.");
    }
}

testFailureAndEvolution().catch(console.error);
