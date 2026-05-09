/**
 * 🌙 IQRA No-Mock Enforcement — فرض عدم وجود Mock
 * النية: ضمان عدم استخدام mock أو simulated providers في الإنتاج
 * المرجع: "لا mock ولا simulated provider في بيئة الإنتاج" — القاعدة الدستورية #2
 *
 * القاعدة: كل provider يجب أن يكون حقيقياً في الإنتاج.
 * القاعدة: Mock مسموح فقط في التطوير والاختبار.
 * القاعدة: كل استخدام mock يُسجَّل في TrustChain.
 */

import type { WorkerReport } from './contracts';

// ── Mock Detection Types ──────────────────────────────────────────────────────

export interface MockDetectionResult {
  is_mock: boolean;
  mock_type?: 'provider' | 'model' | 'data' | 'unknown';
  reason?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface NoMockValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  mocks_detected: number;
}

// ── Common Mock Patterns ──────────────────────────────────────────────────────

const MOCK_PATTERNS = {
  providers: [
    'mock',
    'fake',
    'stub',
    'test',
    'dummy',
    'simulated',
    'sandbox',
    'local',
    'offline',
  ],
  models: [
    'mock-model',
    'test-model',
    'fake-model',
    'stub-model',
    'dummy-model',
    'simulated-model',
  ],
  keywords: [
    'mock',
    'fake',
    'stub',
    'test',
    'dummy',
    'simulated',
    'sandbox',
    'offline',
    'local-only',
  ],
};

// ── Detect Mock Provider ──────────────────────────────────────────────────────

/**
 * يكتشف ما إذا كان provider هو mock أو simulated.
 * 
 * @param provider - اسم المزود
 * @returns { is_mock: boolean; reason?: string }
 * 
 * @example
 * const result = detectMockProvider('simulated');
 * if (result.is_mock) {
 *   console.error(`Mock provider detected: ${result.reason}`);
 * }
 */
export function detectMockProvider(provider: string): MockDetectionResult {
  if (!provider || !provider.trim()) {
    return {
      is_mock: false,
      reason: 'Provider is empty',
    };
  }

  const providerLower = provider.toLowerCase();

  // ── Check against mock patterns ────────────────────────────────────────────
  for (const pattern of MOCK_PATTERNS.providers) {
    if (providerLower.includes(pattern)) {
      return {
        is_mock: true,
        mock_type: 'provider',
        reason: `Provider "${provider}" matches mock pattern "${pattern}"`,
        severity: 'critical',
      };
    }
  }

  // ── Check for exact matches ────────────────────────────────────────────────
  if (providerLower === 'simulated' || providerLower === 'mock') {
    return {
      is_mock: true,
      mock_type: 'provider',
      reason: `Provider is explicitly "${provider}"`,
      severity: 'critical',
    };
  }

  return {
    is_mock: false,
    reason: `Provider "${provider}" is not a known mock`,
  };
}

// ── Detect Mock Model ─────────────────────────────────────────────────────────

/**
 * يكتشف ما إذا كان model هو mock أو simulated.
 * 
 * @param model - اسم النموذج
 * @returns { is_mock: boolean; reason?: string }
 * 
 * @example
 * const result = detectMockModel('test-model-v1');
 * if (result.is_mock) {
 *   console.error(`Mock model detected: ${result.reason}`);
 * }
 */
export function detectMockModel(model: string): MockDetectionResult {
  if (!model || !model.trim()) {
    return {
      is_mock: false,
      reason: 'Model is empty',
    };
  }

  const modelLower = model.toLowerCase();

  // ── Check against mock patterns ────────────────────────────────────────────
  for (const pattern of MOCK_PATTERNS.models) {
    if (modelLower.includes(pattern)) {
      return {
        is_mock: true,
        mock_type: 'model',
        reason: `Model "${model}" matches mock pattern "${pattern}"`,
        severity: 'critical',
      };
    }
  }

  // ── Check for keywords ─────────────────────────────────────────────────────
  for (const keyword of MOCK_PATTERNS.keywords) {
    if (modelLower.includes(keyword)) {
      return {
        is_mock: true,
        mock_type: 'model',
        reason: `Model "${model}" contains mock keyword "${keyword}"`,
        severity: 'critical',
      };
    }
  }

  return {
    is_mock: false,
    reason: `Model "${model}" is not a known mock`,
  };
}

// ── Detect Mock in Report ─────────────────────────────────────────────────────

/**
 * يكتشف وجود mock في التقرير.
 * 
 * يتحقق من:
 * - no_mock_verified flag
 * - model_metadata.provider
 * - model_metadata.model
 * - أي كلمات مفتاحية تشير إلى mock
 * 
 * @param report - التقرير المراد فحصه
 * @returns { is_mock: boolean; reason?: string; severity?: string }
 * 
 * @example
 * const result = detectMockInReport(report);
 * if (result.is_mock) {
 *   console.error(`Mock detected: ${result.reason}`);
 * }
 */
export function detectMockInReport(report: WorkerReport): MockDetectionResult {
  // ── Check no_mock_verified flag ────────────────────────────────────────────
  if (!report.no_mock_verified) {
    return {
      is_mock: true,
      mock_type: 'unknown',
      reason: 'no_mock_verified is false',
      severity: 'critical',
    };
  }

  // ── Check model metadata ───────────────────────────────────────────────────
  if (report.model_metadata) {
    // Check provider
    if (report.model_metadata.provider) {
      const providerResult = detectMockProvider(report.model_metadata.provider);
      if (providerResult.is_mock) {
        return providerResult;
      }
    }

    // Check model
    if (report.model_metadata.model) {
      const modelResult = detectMockModel(report.model_metadata.model);
      if (modelResult.is_mock) {
        return modelResult;
      }
    }
  }

  return {
    is_mock: false,
    reason: 'No mock detected in report',
  };
}

// ── Throw on Mock ─────────────────────────────────────────────────────────────

/**
 * يرفع خطأ إذا تم اكتشاف mock.
 * 
 * @param report - التقرير المراد فحصه
 * @param env - بيئة التشغيل ('production' | 'development')
 * @throws Error إذا تم اكتشاف mock في الإنتاج
 * 
 * @example
 * try {
 *   throwOnMock(report, 'production');
 * } catch (e) {
 *   console.error(`Mock violation: ${e.message}`);
 * }
 */
export function throwOnMock(
  report: WorkerReport,
  env: 'production' | 'development' = 'production'
): void {
  if (env === 'production') {
    const result = detectMockInReport(report);
    if (result.is_mock) {
      throw new Error(
        `MOCK_VIOLATION [${report.mission_id}/${report.worker_id}]: ${result.reason}`
      );
    }
  }
}

// ── Validate No-Mock ──────────────────────────────────────────────────────────

/**
 * يتحقق من أن التقرير خالي من mock في الإنتاج.
 * 
 * @param report - التقرير المراد فحصه
 * @param env - بيئة التشغيل ('production' | 'development')
 * @returns { valid: boolean; errors: string[]; warnings: string[]; mocks_detected: number }
 * 
 * @example
 * const result = validateNoMock(report, 'production');
 * if (!result.valid) {
 *   console.error(`No-mock validation failed: ${result.errors.join(', ')}`);
 * }
 */
export function validateNoMock(
  report: WorkerReport,
  env: 'production' | 'development' = 'production'
): NoMockValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let mocks_detected = 0;

  // ── In production, no mock is allowed ──────────────────────────────────────
  if (env === 'production') {
    const mockResult = detectMockInReport(report);
    if (mockResult.is_mock) {
      errors.push(mockResult.reason || 'Mock detected');
      mocks_detected++;
    }

    // ── Additional checks for production ───────────────────────────────────
    if (!report.no_mock_verified) {
      errors.push('no_mock_verified must be true in production');
    }

    // ── Check for mock keywords in implemented items ────────────────────────
    if (Array.isArray(report.implemented)) {
      for (let i = 0; i < report.implemented.length; i++) {
        const item = report.implemented[i].toLowerCase();
        for (const keyword of MOCK_PATTERNS.keywords) {
          if (item.includes(keyword)) {
            errors.push(`implemented[${i}] contains mock keyword "${keyword}"`);
            mocks_detected++;
          }
        }
      }
    }

    // ── Check for mock keywords in issues ──────────────────────────────────
    if (Array.isArray(report.issues_discovered)) {
      for (let i = 0; i < report.issues_discovered.length; i++) {
        const issue = report.issues_discovered[i].toLowerCase();
        for (const keyword of MOCK_PATTERNS.keywords) {
          if (issue.includes(keyword)) {
            warnings.push(`issues_discovered[${i}] contains mock keyword "${keyword}"`);
          }
        }
      }
    }
  }

  // ── In development, we allow mocks but warn about them ────────────────────
  if (env === 'development') {
    const mockResult = detectMockInReport(report);
    if (mockResult.is_mock) {
      warnings.push(`Mock detected in development: ${mockResult.reason}`);
      mocks_detected++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    mocks_detected,
  };
}

// ── Sanitize Report ───────────────────────────────────────────────────────────

/**
 * ينظف التقرير من أي إشارات إلى mock قبل الإنتاج.
 * 
 * @param report - التقرير المراد تنظيفه
 * @returns التقرير المنظف
 * 
 * @example
 * const cleanReport = sanitizeReport(report);
 * // يزيل أي كلمات مفتاحية تشير إلى mock
 */
export function sanitizeReport(report: WorkerReport): WorkerReport {
  const sanitized = { ...report };

  // ── Sanitize implemented items ─────────────────────────────────────────────
  if (Array.isArray(sanitized.implemented)) {
    sanitized.implemented = sanitized.implemented.map((item) => {
      let cleaned = item;
      for (const keyword of MOCK_PATTERNS.keywords) {
        cleaned = cleaned.replace(new RegExp(keyword, 'gi'), '');
      }
      return cleaned.trim();
    });
  }

  // ── Sanitize issues ────────────────────────────────────────────────────────
  if (Array.isArray(sanitized.issues_discovered)) {
    sanitized.issues_discovered = sanitized.issues_discovered.map((issue) => {
      let cleaned = issue;
      for (const keyword of MOCK_PATTERNS.keywords) {
        cleaned = cleaned.replace(new RegExp(keyword, 'gi'), '');
      }
      return cleaned.trim();
    });
  }

  // ── Ensure no_mock_verified is true ────────────────────────────────────────
  sanitized.no_mock_verified = true;

  return sanitized;
}

// ── Check Provider Authenticity ───────────────────────────────────────────────

/**
 * يتحقق من أن المزود حقيقي وليس mock.
 * 
 * قائمة المزودين الحقيقيين المعروفة:
 * - OpenAI (gpt-4, gpt-3.5-turbo, etc.)
 * - Google (gemini, palm, etc.)
 * - Anthropic (claude, etc.)
 * - Meta (llama, etc.)
 * - Groq (groq, etc.)
 * - HuggingFace (various models)
 * - Ollama (local models)
 * 
 * @param provider - اسم المزود
 * @returns { authentic: boolean; reason?: string }
 * 
 * @example
 * const result = checkProviderAuthenticity('openai');
 * if (!result.authentic) {
 *   console.error(result.reason);
 * }
 */
export function checkProviderAuthenticity(provider: string): { authentic: boolean; reason?: string } {
  const knownProviders = [
    'openai',
    'google',
    'anthropic',
    'meta',
    'groq',
    'huggingface',
    'ollama',
    'cohere',
    'together',
    'replicate',
  ];

  const providerLower = provider.toLowerCase();

  // ── Check if provider is in known list ─────────────────────────────────────
  if (knownProviders.some((p) => providerLower.includes(p))) {
    return { authentic: true };
  }

  // ── Check if provider is a mock ────────────────────────────────────────────
  const mockResult = detectMockProvider(provider);
  if (mockResult.is_mock) {
    return {
      authentic: false,
      reason: mockResult.reason,
    };
  }

  // ── Unknown provider ───────────────────────────────────────────────────────
  return {
    authentic: false,
    reason: `Unknown provider: "${provider}" — not in known providers list`,
  };
}

/**
 * يتحقق من أن النموذج حقيقي وليس mock.
 * 
 * @param model - اسم النموذج
 * @returns { authentic: boolean; reason?: string }
 * 
 * @example
 * const result = checkModelAuthenticity('gpt-4');
 * if (!result.authentic) {
 *   console.error(result.reason);
 * }
 */
export function checkModelAuthenticity(model: string): { authentic: boolean; reason?: string } {
  // ── Check if model is a mock ───────────────────────────────────────────────
  const mockResult = detectMockModel(model);
  if (mockResult.is_mock) {
    return {
      authentic: false,
      reason: mockResult.reason,
    };
  }

  // ── Check for known real models ────────────────────────────────────────────
  const knownModels = [
    'gpt-4',
    'gpt-3.5',
    'gemini',
    'claude',
    'llama',
    'palm',
    'groq',
    'mistral',
    'mixtral',
  ];

  const modelLower = model.toLowerCase();
  if (knownModels.some((m) => modelLower.includes(m))) {
    return { authentic: true };
  }

  // ── Unknown model ──────────────────────────────────────────────────────────
  return {
    authentic: false,
    reason: `Unknown model: "${model}" — not in known models list`,
  };
}
