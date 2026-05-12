import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * 🛠️ IQRA DevOops Integrity Check
 * 
 * النية: التأكد من نزاهة الكود وعدم وجود بيانات وهمية (mocks) أو أنماط غير سيادية.
 * المرجع: !IQRA_SUPREME.md - "لا كذب، لا Mock، لا اختراع".
 */

const TARGET_DIRS = ['src/lib/iqra', 'src/scripts_v2', 'runtime', 'src/worker.ts'];
const FORBIDDEN_STRINGS = ['mock', '<<<<<<<', '=======', '>>>>>>>'];

async function runIntegrityCheck() {
  console.log('🚀 [DevOops] Starting Integrity Check...');
  let totalViolations = 0;

  for (const dir of TARGET_DIRS) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) continue;

    console.log(`🔍 [DevOops] Scanning ${dir}...`);
    
    FORBIDDEN_STRINGS.forEach(forbidden => {
      try {
        const result = execSync(`grep -rn "${forbidden}" ${fullPath} | grep -v ".test.ts" | grep -v ".spec.ts" || true`).toString();
        if (result.trim()) {
          console.error(`❌ [DevOops] Found forbidden string "${forbidden}" in ${dir}:\n${result}`);
          totalViolations += result.trim().split('\n').length;
        }
      } catch (e) {
        // grep returns non-zero if no match, handled by || true
      }
    });

    // Check for 'any' usage in TypeScript files
    try {
      const anyResult = execSync(`grep -rn ": any" ${fullPath} | grep -v ".test.ts" | grep -v "node_modules" || true`).toString();
      if (anyResult.trim()) {
        console.warn(`⚠️ [DevOops] Found "any" type usage in ${dir} (Try to use specific types):\n${anyResult}`);
        // We don't count 'any' as a critical violation yet, but we log it.
      }
    } catch (e) {}
  }

  if (totalViolations > 0) {
    console.error(`🛑 [DevOops] Integrity Check FAILED with ${totalViolations} violations.`);
    process.exit(1);
  } else {
    console.log('✅ [DevOops] Integrity Check PASSED. Code is sovereign.');
  }
}

runIntegrityCheck();
