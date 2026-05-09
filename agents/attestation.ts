/**
 * 🌙 IQRA Source Attestation — شهادة المصدر
 * النية: ضمان أن كل ادعاء له مصدر موثق
 * المرجع: "كل مصدر معلومة يُوسَم" — القاعدة الدستورية #3
 *
 * القاعدة: لا ادعاء بدون مصدر.
 * القاعدة: كل مصدر يجب أن يكون واضحاً ومحدداً.
 * القاعدة: المصادر تُسجَّل في TrustChain.
 */

import type { SourceAttestation, WorkerReport } from './contracts';

// ── Source Tag Types ──────────────────────────────────────────────────────────

export type SourceTagType = '[read]' | '[fetched]' | '[prior-training]';

// ── Attestation Result ────────────────────────────────────────────────────────

export interface AttestationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  attestations_count: number;
}

// ── Create Attestation ────────────────────────────────────────────────────────

/**
 * ينشئ شهادة مصدر جديدة.
 * 
 * @param claim - الادعاء أو الحقيقة المُعلنة
 * @param tag - وسم المصدر ([read] | [fetched] | [prior-training])
 * @param source - URL أو مسار الملف أو اسم النموذج (اختياري)
 * @returns شهادة مصدر صحيحة
 * 
 * @example
 * const att = createAttestation(
 *   'The Quran has 114 surahs',
 *   '[read]',
 *   'lib/quran/metadata.ts'
 * );
 * // Output: { claim: 'The Quran has 114 surahs', tag: '[read]', source: 'lib/quran/metadata.ts' }
 */
export function createAttestation(
  claim: string,
  tag: SourceTagType,
  source?: string
): SourceAttestation {
  return {
    claim: claim.trim(),
    tag,
    source: source?.trim(),
  };
}

// ── Validate Single Attestation ───────────────────────────────────────────────

/**
 * يتحقق من صحة شهادة مصدر واحدة.
 * 
 * @param attestation - الشهادة المراد التحقق منها
 * @returns { valid: boolean; errors: string[] }
 * 
 * @example
 * const result = validateAttestation({
 *   claim: 'Pattern discovered',
 *   tag: '[read]',
 *   source: 'file.ts'
 * });
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 */
export function validateAttestation(
  attestation: SourceAttestation
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // ── Check claim ────────────────────────────────────────────────────────────
  if (!attestation.claim || !attestation.claim.trim()) {
    errors.push('claim is required and cannot be empty');
  } else if (attestation.claim.length < 3) {
    errors.push('claim is too short (minimum 3 characters)');
  }

  // ── Check tag ──────────────────────────────────────────────────────────────
  const validTags: SourceTagType[] = ['[read]', '[fetched]', '[prior-training]'];
  if (!attestation.tag || !validTags.includes(attestation.tag as SourceTagType)) {
    errors.push(
      `tag must be one of: ${validTags.join(', ')}. Got: "${attestation.tag}"`
    );
  }

  // ── Check source (optional but recommended) ────────────────────────────────
  if (!attestation.source || !attestation.source.trim()) {
    // Source is optional, but we warn about it
    // (This is a warning, not an error)
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ── Validate Multiple Attestations ────────────────────────────────────────────

/**
 * يتحقق من صحة مجموعة من الشهادات.
 * 
 * @param attestations - مجموعة الشهادات
 * @returns { valid: boolean; errors: string[]; warnings: string[] }
 * 
 * @example
 * const result = validateAttestations([
 *   { claim: 'Fact 1', tag: '[read]', source: 'file1.ts' },
 *   { claim: 'Fact 2', tag: '[fetched]', source: 'https://example.com' }
 * ]);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 */
export function validateAttestations(
  attestations: SourceAttestation[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(attestations)) {
    return {
      valid: false,
      errors: ['attestations must be an array'],
      warnings: [],
    };
  }

  if (attestations.length === 0) {
    warnings.push('No attestations provided — consider adding at least one source');
  }

  // ── Validate each attestation ──────────────────────────────────────────────
  for (let i = 0; i < attestations.length; i++) {
    const result = validateAttestation(attestations[i]);
    if (!result.valid) {
      errors.push(`attestations[${i}]: ${result.errors.join('; ')}`);
    }

    // ── Check for missing source ───────────────────────────────────────────
    if (!attestations[i].source || !attestations[i].source?.trim()) {
      warnings.push(`attestations[${i}]: source is missing (recommended)`);
    }
  }

  // ── Check for duplicate claims ─────────────────────────────────────────────
  const claims = attestations.map((a) => a.claim.toLowerCase());
  const duplicates = claims.filter((claim, index) => claims.indexOf(claim) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate claims found: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Verify Attestation ────────────────────────────────────────────────────────

/**
 * يتحقق من أن الشهادة موثقة بشكل صحيح.
 * 
 * يتحقق من:
 * - أن الـ claim موجود وغير فارغ
 * - أن الـ tag صحيح
 * - أن الـ source موجود (إذا كان tag=[read] أو [fetched])
 * 
 * @param attestation - الشهادة المراد التحقق منها
 * @returns { verified: boolean; reason?: string }
 * 
 * @example
 * const result = verifyAttestation({
 *   claim: 'Pattern discovered',
 *   tag: '[read]',
 *   source: 'file.ts'
 * });
 * if (!result.verified) {
 *   console.error(result.reason);
 * }
 */
export function verifyAttestation(
  attestation: SourceAttestation
): { verified: boolean; reason?: string } {
  // ── Basic validation ───────────────────────────────────────────────────────
  const validation = validateAttestation(attestation);
  if (!validation.valid) {
    return {
      verified: false,
      reason: validation.errors[0],
    };
  }

  // ── Check source requirement based on tag ──────────────────────────────────
  if (attestation.tag === '[read]' || attestation.tag === '[fetched]') {
    if (!attestation.source || !attestation.source.trim()) {
      return {
        verified: false,
        reason: `tag "${attestation.tag}" requires a source URL or file path`,
      };
    }
  }

  // ── Check source format for [read] ─────────────────────────────────────────
  if (attestation.tag === '[read]') {
    // Should be a file path
    if (!attestation.source?.includes('/') && !attestation.source?.includes('.')) {
      return {
        verified: false,
        reason: `tag "[read]" source should be a file path, got: "${attestation.source}"`,
      };
    }
  }

  // ── Check source format for [fetched] ──────────────────────────────────────
  if (attestation.tag === '[fetched]') {
    // Should be a URL
    if (!attestation.source?.startsWith('http')) {
      return {
        verified: false,
        reason: `tag "[fetched]" source should be a URL, got: "${attestation.source}"`,
      };
    }
  }

  return { verified: true };
}

// ── Validate Report Attestations ──────────────────────────────────────────────

/**
 * يتحقق من أن جميع الادعاءات في التقرير لها مصادر موثقة.
 * 
 * يتحقق من:
 * - أن جميع الـ implemented items لها مصادر
 * - أن جميع الـ issues_discovered لها مصادر
 * - أن جميع الـ skills_used لها مصادر
 * - أن جميع الـ source_attestations صحيحة
 * 
 * @param report - التقرير المراد التحقق منه
 * @returns { valid: boolean; errors: string[]; warnings: string[]; attestations_count: number }
 * 
 * @example
 * const result = validateReportAttestations(report);
 * if (!result.valid) {
 *   console.error(`Attestation errors: ${result.errors.join(', ')}`);
 * }
 */
export function validateReportAttestations(
  report: WorkerReport
): AttestationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let attestations_count = 0;

  // ── Check source_attestations array ────────────────────────────────────────
  if (!Array.isArray(report.source_attestations)) {
    errors.push('source_attestations must be an array');
    return { valid: false, errors, warnings, attestations_count: 0 };
  }

  attestations_count = report.source_attestations.length;

  // ── Validate each attestation ──────────────────────────────────────────────
  const attestationResults = validateAttestations(report.source_attestations);
  if (!attestationResults.valid) {
    errors.push(...attestationResults.errors);
  }
  warnings.push(...attestationResults.warnings);

  // ── Check that implemented items have sources ──────────────────────────────
  if (Array.isArray(report.implemented)) {
    for (let i = 0; i < report.implemented.length; i++) {
      const item = report.implemented[i];
      if (!item.trim()) continue;

      const hasSource = report.source_attestations.some(
        (att) =>
          att.claim.toLowerCase().includes(item.toLowerCase()) ||
          att.source?.toLowerCase().includes(item.toLowerCase())
      );

      if (!hasSource) {
        warnings.push(`implemented[${i}] "${item}" has no source attestation`);
      }
    }
  }

  // ── Check that issues have sources ─────────────────────────────────────────
  if (Array.isArray(report.issues_discovered)) {
    for (let i = 0; i < report.issues_discovered.length; i++) {
      const issue = report.issues_discovered[i];
      if (!issue.trim()) continue;

      const hasSource = report.source_attestations.some(
        (att) =>
          att.claim.toLowerCase().includes(issue.toLowerCase()) ||
          att.source?.toLowerCase().includes(issue.toLowerCase())
      );

      if (!hasSource) {
        warnings.push(`issues_discovered[${i}] "${issue}" has no source attestation`);
      }
    }
  }

  // ── Check that skills have sources ─────────────────────────────────────────
  if (Array.isArray(report.skills_used)) {
    for (let i = 0; i < report.skills_used.length; i++) {
      const skill = report.skills_used[i];
      if (!skill.trim()) continue;

      const hasSource = report.source_attestations.some(
        (att) =>
          att.claim.toLowerCase().includes(skill.toLowerCase()) ||
          att.source?.toLowerCase().includes(skill.toLowerCase())
      );

      if (!hasSource) {
        warnings.push(`skills_used[${i}] "${skill}" has no source attestation`);
      }
    }
  }

  // ── For PASS reports, require at least one attestation ────────────────────
  if (report.status === 'PASS' && attestations_count === 0) {
    errors.push('PASS report must have at least one source_attestation');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    attestations_count,
  };
}

// ── Create Attestation from Source ────────────────────────────────────────────

/**
 * ينشئ شهادة مصدر من مصدر معروف.
 * 
 * @param claim - الادعاء
 * @param sourceType - نوع المصدر ('file' | 'url' | 'model')
 * @param sourcePath - مسار أو URL المصدر
 * @returns شهادة مصدر صحيحة
 * 
 * @example
 * const att = createAttestationFromSource(
 *   'Pattern discovered in verse 2:255',
 *   'file',
 *   'lib/quran/patterns.ts'
 * );
 * // Output: { claim: 'Pattern discovered in verse 2:255', tag: '[read]', source: 'lib/quran/patterns.ts' }
 */
export function createAttestationFromSource(
  claim: string,
  sourceType: 'file' | 'url' | 'model',
  sourcePath: string
): SourceAttestation {
  let tag: SourceTagType;

  switch (sourceType) {
    case 'file':
      tag = '[read]';
      break;
    case 'url':
      tag = '[fetched]';
      break;
    case 'model':
      tag = '[prior-training]';
      break;
    default:
      tag = '[prior-training]';
  }

  return createAttestation(claim, tag, sourcePath);
}

/**
 * ينشئ مجموعة من الشهادات من مصادر متعددة.
 * 
 * @param claims - قائمة الادعاءات
 * @param sourceType - نوع المصدر ('file' | 'url' | 'model')
 * @param sourcePath - مسار أو URL المصدر
 * @returns مجموعة من الشهادات
 * 
 * @example
 * const attestations = createAttestationsFromSource(
 *   ['Fact 1', 'Fact 2', 'Fact 3'],
 *   'file',
 *   'lib/facts.ts'
 * );
 */
export function createAttestationsFromSource(
  claims: string[],
  sourceType: 'file' | 'url' | 'model',
  sourcePath: string
): SourceAttestation[] {
  return claims.map((claim) => createAttestationFromSource(claim, sourceType, sourcePath));
}
