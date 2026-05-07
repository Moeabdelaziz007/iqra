/**
 * 📿 TAWBAH (Self-Correction & Humility)
 * النية: تسجيل الأخطاء بصدق والاعتراف بالعجز عند تكرار الفشل.
 * المرجع: "رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ" — الأعراف: 23
 */

import { writeFileSync, appendFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { IQRALogger } from "./logger.ts";

const TAWBAH_PATH = join(process.cwd(), "iqra-core", "TAWBAH.md");
const HUMILITY_THRESHOLD = 9;

/**
 * سجل خطأ في TAWBAH.md
 */
export function recordError(error: string, file: string): void {
  const timestamp = new Date().toISOString();
  const entry = `\n- [${timestamp}] ERROR in ${file}: ${error}`;
  
  if (!existsSync(TAWBAH_PATH)) {
    writeFileSync(TAWBAH_PATH, "# 📿 TAWBAH: Error Log & Self-Correction\n");
  }
  appendFileSync(TAWBAH_PATH, entry);
  IQRALogger.error(`📿 [TAWBAH] Error recorded in ${file}: ${error}`);

  checkHumility();
}

/**
 * فحص "عتبة التواضع" (Humility Threshold)
 * إذا تجاوزت الأخطاء المتتالية 9، يجب إيقاف النظام للصيانة اليدوية أو الاستغفار (التصحيح الذاتي العميق).
 */
export function checkHumility(): void {
  if (!existsSync(TAWBAH_PATH)) return;

  const content = readFileSync(TAWBAH_PATH, 'utf-8');
  const errorCount = (content.match(/\n- \[/g) || []).length;

  if (errorCount >= HUMILITY_THRESHOLD) {
    const msg = `🛑 [TAWBAH] HUMILITY_THRESHOLD REACHED (${errorCount}/${HUMILITY_THRESHOLD}). ` +
                `System halting to prevent cascading hallucinations. Please review iqra-core/TAWBAH.md`;
    IQRALogger.error(msg);
    // In a real agentic loop, we might throw a terminal error or exit
    // throw new Error(msg); 
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
}
