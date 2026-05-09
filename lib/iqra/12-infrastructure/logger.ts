/**
 * IQRA Logger — المسجل
 * 
 * "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 * 
 * Powered by BetterStack (Logtail) for global visibility.
 */

// Placeholder for Logtail (will be enabled when token is provided)
const BETTER_STACK_TOKEN = process.env.BETTER_STACK_TOKEN;

export class IQRALogger {
  /**
   * Log information
   */
  static info(message: string, meta: any = {}) {
    this.log('info', message, meta);
  }

  /**
   * Log errors
   */
  static error(message: string, error: any = {}, meta: any = {}) {
    this.log('error', message, { ...meta, error: error.message || error });
  }

  /**
   * Log warnings
   */
  static warn(message: string, meta: any = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Internal logging logic
   */
  private static log(level: 'info' | 'error' | 'warn', message: string, meta: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
      identity: 'IQRA',
    };

    // Console output for local dev
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}] ${message}`, meta);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, meta);
    }

    // BetterStack Integration (External call)
    if (BETTER_STACK_TOKEN) {
      // In a real environment, we'd use @logtail/js or a fetch call to their ingest API
      // fetch('https://in.logs.betterstack.com', { method: 'POST', body: JSON.stringify(logEntry) })
    }
  }
}
