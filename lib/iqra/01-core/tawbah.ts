// ============================================
// lib/iqra/tawbah.ts — بروتوكول التوبة البرمجية (مُحدَّث)
// ============================================
import { writeFileSync, appendFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { IQRALogger } from "#infra/logger.js";

const TAWBAH_PATH = join(process.cwd(), "iqra-core", "TAWBAH.md");
const TRAINING_PATH = join(process.cwd(), ".iqra", "training_data.json");
const HUMILITY_THRESHOLD = 9;

interface ErrorRecord {
  error: string;
  timestamp: number;
  file: string;
  count: number;
}

const errorLog: Map<string, ErrorRecord> = new Map();

export function recordError(error: string, file: string): void {
  const key = `${file}:${error}`;
  const existing = errorLog.get(key);
  
  if (existing) {
    existing.count++;
    existing.timestamp = Date.now();
    if (existing.count >= 3) {
      executeTawbah(error, file, existing.count);
    }
  } else {
    errorLog.set(key, { error, timestamp: Date.now(), file, count: 1 });
  }
}

function executeTawbah(error: string, file: string, count: number): void {
  // 1. HALT — Log the repentance
  const tawbahEntry = `## Tawbah Entry — ${new Date().toISOString()}
**File:** ${file}
**Error:** ${error}
**Occurrences:** ${count}
**Action:** Halted and reverted to last known good state.
**Lesson:** This error must not recur. Added to training data.

---
`;
  
  if (!existsSync(TAWBAH_PATH)) {
    const dir = join(process.cwd(), "iqra-core");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(TAWBAH_PATH, "# 📿 TAWBAH: Error Log & Self-Correction\n\n");
  }
  appendFileSync(TAWBAH_PATH, tawbahEntry);

  // 2. LEARN — Add to training data
  const training = existsSync(TRAINING_PATH) 
    ? JSON.parse(readFileSync(TRAINING_PATH, "utf-8") || "[]")
    : [];
    
  training.push({
    type: "error_lesson",
    error,
    file,
    timestamp: Date.now(),
    prevention: "Verify signatures before calling functions. Read source first."
  });
  
  const trainingDir = join(process.cwd(), ".iqra");
  if (!existsSync(trainingDir)) {
    mkdirSync(trainingDir, { recursive: true });
  }
  writeFileSync(TRAINING_PATH, JSON.stringify(training, null, 2));

  // 3. ASK — If humility threshold reached
  if (count >= HUMILITY_THRESHOLD) {
    const askPath = join(process.cwd(), "ASK_HUMAN.md");
    writeFileSync(askPath, `# ASK_HUMAN — Humility Threshold Reached

**Error:** ${error}
**File:** ${file}
**Count:** ${count}

**Request:** Human intervention required. The same error has occurred ${count} times.
`);
  }

  // 4. THROW — Stop execution
  throw new Error(`TAWBAH PROTOCOL ACTIVATED: ${error} in ${file} (${count} occurrences)`);
}

/**
 * فحص "عتبة التواضع" (Humility Threshold)
 */
export function checkHumility(): void {
  if (!existsSync(TAWBAH_PATH)) return;

  const content = readFileSync(TAWBAH_PATH, 'utf-8');
  const errorCount = (content.match(/## Tawbah Entry/g) || []).length;

  if (errorCount >= HUMILITY_THRESHOLD) {
    const msg = `🛑 [TAWBAH] HUMILITY_THRESHOLD REACHED (${errorCount}/${HUMILITY_THRESHOLD}). ` +
                `System halting to prevent cascading hallucinations. Please review iqra-core/TAWBAH.md`;
    IQRALogger.error(msg);
  }
}

/**
 * مسح السجل عند "التوبة النصوحة" (إصلاح حقيقي للأخطاء)
 */
export function clearTawbah(): void {
  if (existsSync(TAWBAH_PATH)) {
    writeFileSync(TAWBAH_PATH, "# 📿 TAWBAH: Error Log & Self-Correction\n- [CLEARED] " + new Date().toISOString() + "\n");
    IQRALogger.info("✨ [TAWBAH] Ledger cleared. Humility restored.");
  }
  errorLog.clear();
}
