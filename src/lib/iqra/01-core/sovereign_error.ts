/**
 * 🛑 SovereignError — Structured Error Handling for IQRA
 * النية: توفير معلومات تشخيصية كاملة عند فشل المهمة
 * المرجع: "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 *
 * ══════════════════════════════════════════════════════════════
 * ERROR TAXONOMY — تصنيف الأخطاء
 * ══════════════════════════════════════════════════════════════
 * - MISSION_ABORTED: فشل في Validation Gate
 * - DAMIR_BLOCK: الضمير رفض التنفيذ
 * - MOCK_FORBIDDEN: استخدام simulated provider في production
 * - INTEGRITY_ERR: فشل في التحقق من البيانات
 * - MAX_CYCLES_REACHED: تجاوز عدد الدورات المسموح
 * - RETRY_EXHAUSTED: استنفدت جميع محاولات إعادة المحاولة
 * ══════════════════════════════════════════════════════════════
 */

export enum SovereignErrorCode {
  MISSION_ABORTED = 'MISSION_ABORTED',
  DAMIR_BLOCK = 'DAMIR_BLOCK',
  MITHAQ_VIOLATION = 'MITHAQ_VIOLATION',
  MOCK_FORBIDDEN = 'MOCK_FORBIDDEN',
  INTEGRITY_ERR = 'INTEGRITY_ERR',
  MAX_CYCLES_REACHED = 'MAX_CYCLES_REACHED',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  WORKER_FAILURE = 'WORKER_FAILURE',
  RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE'
}

export interface SovereignErrorContext {
  mission_id?: string;
  phase?: string;
  worker_id?: string;
  reason?: string;
  partialResults?: Record<string, unknown>;
  retryHistory?: RetryAttempt[];
  diagnostics?: Record<string, unknown>;
}

export interface RetryAttempt {
  attempt: number;
  timestamp: number;
  strategy: string;
  result: 'success' | 'failure';
  error?: string;
}

export class SovereignError extends Error {
  public readonly code: SovereignErrorCode;
  public readonly context: SovereignErrorContext;
  public readonly timestamp: number;
  public readonly isRecoverable: boolean;

  constructor(
    code: SovereignErrorCode,
    context: SovereignErrorContext = {},
    isRecoverable: boolean = false
  ) {
    const message = SovereignError._formatMessage(code, context);
    super(message);
    
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
    this.isRecoverable = isRecoverable;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, SovereignError);
  }

  private static _formatMessage(code: SovereignErrorCode, context: SovereignErrorContext): string {
    const parts = [`[${code}]`];
    
    if (context.mission_id) parts.push(`Mission: ${context.mission_id}`);
    if (context.phase) parts.push(`Phase: ${context.phase}`);
    if (context.worker_id) parts.push(`Worker: ${context.worker_id}`);
    if (context.reason) parts.push(`Reason: ${context.reason}`);
    
    return parts.join(' | ');
  }

  /**
   * Convert to structured JSON for logging and debugging
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
        isRecoverable: this.isRecoverable,
        context: this.context,
        stack: this.stack?.split('\n').slice(1, 5), // First 5 lines of stack
      }
    };
  }

  /**
   * Log to TAWBAH.md (repentance log) with full context
   */
  async logToTawbah(): Promise<void> {
    const { logToIQRAFile } = await import('#security/security');
    
    const entry = `
### 🛑 [SOVEREIGN_ERROR] ${new Date(this.timestamp).toISOString()}
- **Code**: ${this.code}
- **Message**: ${this.message}
- **Recoverable**: ${this.isRecoverable}
- **Mission**: ${this.context.mission_id || 'N/A'}
- **Phase**: ${this.context.phase || 'N/A'}
- **Worker**: ${this.context.worker_id || 'N/A'}
- **Reason**: ${this.context.reason || 'N/A'}
${this.context.retryHistory ? `- **Retry History**: ${JSON.stringify(this.context.retryHistory)}` : ''}
${this.context.partialResults ? `- **Partial Results**: ${JSON.stringify(this.context.partialResults, null, 2)}` : ''}
---`;
    
    await logToIQRAFile('TAWBAH.md', entry);
  }
}

/**
 * Helper to check if an error is a SovereignError
 */
export function isSovereignError(error: unknown): error is SovereignError {
  return error instanceof SovereignError;
}

/**
 * Helper to extract partial results from any error
 */
export function extractPartialResults(error: unknown): Record<string, unknown> | undefined {
  if (isSovereignError(error)) {
    return error.context.partialResults;
  }
  return undefined;
}
