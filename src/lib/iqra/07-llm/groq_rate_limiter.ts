// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🛡️ Groq Rate Limiter — محكم معدل الطلبات
 * 
 * Based on arxiv:2510.04516v1 "Rethinking HTTP API Rate Limiting: A Client-Side Approach"
 * Implements Adaptive Token Bucket (ATB) with exponential backoff
 */

import { IQRALogger } from '#infra/logger';

interface RateLimitError {
  message?: string;
  status?: number;
}

export class GroqRateLimiter {
  private static readonly RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,      // 1 ثانية
    maxDelay: 30000,      // 30 ثانية كحد أقصى
    backoffMultiplier: 2,  // يضاعف كل مرة
    windowSize: 60000,    // 60 ثانية نافذة
    maxRequestsPerWindow: 20 // أقصى 20 طلب في الدقيقة
  };

  private static requestCount = 0;
  private static windowStart = Date.now();

  /**
   * ينفذ عملية مع إعادة محاولة ذكية
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.RETRY_CONFIG.maxRetries; attempt++) {
      try {
        // Check window-based rate limiting
        this.checkWindowLimit();
        
        const result = await operation();
        
        // Success: reset counters
        this.requestCount = 0;
        this.windowStart = Date.now();
        
        return result;
      } catch (error: any) {
        lastError = error;

        if (attempt >= this.RETRY_CONFIG.maxRetries) {
          IQRALogger.error(`❌ [GROQ] All retries exhausted. Final error: ${error.message}`);
          throw error;
        }

        // Extract wait time from error message or use exponential backoff
        const waitTime = this.parseRetryAfter(error) ??
          Math.min(
            this.RETRY_CONFIG.baseDelay *
            Math.pow(this.RETRY_CONFIG.backoffMultiplier, attempt),
            this.RETRY_CONFIG.maxDelay
          );

        IQRALogger.warn(
          `⏳ [GROQ] Rate limited. Retry ${attempt+1}/${this.RETRY_CONFIG.maxRetries} after ${waitTime}ms. Error: ${error.message}`
        );
        
        await this.sleep(waitTime);
      }
    }
    throw lastError;
  }

  /**
   * يتحقق من حدود النافذة الزمنية
   */
  private static checkWindowLimit(): void {
    const now = Date.now();
    const windowElapsed = now - this.windowStart;
    
    if (windowElapsed > this.RETRY_CONFIG.windowSize) {
      // Reset window
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.RETRY_CONFIG.maxRequestsPerWindow) {
      const waitTime = this.RETRY_CONFIG.windowSize - windowElapsed;
      if (waitTime > 0) {
        IQRALogger.warn(`⏳ [GROQ] Window limit reached. Waiting ${waitTime}ms`);
        throw new Error(`Rate limit window exceeded. Wait ${waitTime}ms`);
      }
    }

    this.requestCount++;
  }

  /**
   * يستخرج وقت الانتظار من رسالة الخطأ
   */
  private static parseRetryAfter(error: RateLimitError): number | null {
    // Groq يقول "try again in 2.5s" في رسالة الخطأ
    const match = error?.message?.match(/try again in ([\d.]+)s/);
    return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
  }

  /**
   * انتظار بسيط
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
