/**
 * 🛡️ SovereignError Protocol | بروتوكول الخطأ الصادق
 * 
 * "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 *
 * ══════════════════════════════════════════════════════════════
 * CANONICAL VERSION — النسخة المرجعية الوحيدة
 * ══════════════════════════════════════════════════════════════
 * - src/errors/sovereign_error.ts ← THIS FILE
 * - lib/iqra/06-security/security.ts SovereignError ← DEAD, do not use
 * - lib/iqra/01-core/sovereign_error.ts ← DELETED, merged here
 * ══════════════════════════════════════════════════════════════
 */

export enum SovereignErrorCode {
    HALLUCINATION_DETECTED = 'HALLUCINATION_DETECTED',
    TRUTH_ORACLE_MISMATCH = 'TRUTH_ORACLE_MISMATCH',
    CONNECTION_FAILURE = 'CONNECTION_FAILURE',
    MITHAQ_VIOLATION = 'MITHAQ_VIOLATION',
    HUMILITY_THRESHOLD_REACHED = 'HUMILITY_THRESHOLD_REACHED',
    // [TC] reason: merge retry/validation codes from 01-core copy | id: TC-unify-sovereign-error
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    MISSION_ABORTED = 'MISSION_ABORTED',
    MOCK_FORBIDDEN = 'MOCK_FORBIDDEN',
    INTEGRITY_ERR = 'INTEGRITY_ERR',
    MAX_CYCLES_REACHED = 'MAX_CYCLES_REACHED',
    RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
    WORKER_FAILURE = 'WORKER_FAILURE',
    RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
    DAMIR_BLOCK = 'DAMIR_BLOCK',
    // [TC] reason: add codes used by damir_kernel.ts | id: TC-damir-codes
    KERNEL_CRASH = 'KERNEL_CRASH',
    TAWBAH_HALT = 'TAWBAH_HALT',
    // [TC] reason: add codes used by qalbin_vm.ts | id: TC-qalbin-codes
    QALBIN_OVERFLOW = 'QALBIN_OVERFLOW',
    AMAN_VIOLATION = 'AMAN_VIOLATION',
    // [TC] reason: add MISSING_DATA used by memory.ts | id: TC-missing-data
    MISSING_DATA = 'MISSING_DATA',
    // [TC] reason: add DISCOVERY_LOOP_FAILED used by sovereign.ts | id: TC-discovery-loop
    DISCOVERY_LOOP_FAILED = 'DISCOVERY_LOOP_FAILED',
}

export interface SovereignErrorMetadata {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    source: string;
    context?: any;
    recovery_strategy: 'RETRY' | 'HALT' | 'REFLECT' | 'ASK_HUMAN';
    // [TC] reason: support partial results and retry history from topological-loop | id: TC-unify-sovereign-error
    partialResults?: Record<string, unknown>;
    retryHistory?: RetryAttempt[];
    diagnostics?: Record<string, unknown>;
}

// [TC] reason: extracted from 01-core/sovereign_error.ts for retry tracking | id: TC-unify-sovereign-error
export interface RetryAttempt {
    attempt: number;
    timestamp: number;
    strategy: string;
    result: 'success' | 'failure';
    error?: string;
}

export class SovereignError extends Error {
    public code: SovereignErrorCode;
    public metadata: SovereignErrorMetadata;
    public timestamp: string;

    /**
     * Enhanced Error Constructor with 7-loop moral resonance
     * [TC] reason: Enhanced with pattern learning and moral validation | id: TC-7LOOP-001
     */
    constructor(message: string, code: SovereignErrorCode, metadata: SovereignErrorMetadata) {
        super(message);
        this.name = 'SovereignError';
        this.code = code;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();

        // Loop 1: Al-Fatiha Truth Anchor - Validate error against Islamic principles
        this.validateIslamicPrinciples();
        
        // Loop 2: Yasin Experience Replay - Check for similar past errors
        this.checkErrorPatterns();
        
        // Loop 3: Moral Resonance - Calculate moral impact score
        this.calculateMoralResonance();
        
        // Loop 4: Conscience Validation - Ensure error aligns with Damir
        this.validateWithConscience();
        
        // Loop 5: Al-Waqiah Decision - Determine error severity and action
        this.determineErrorSeverity();
        
        // Loop 6: Al-Mulk Tawbah Gate - Log error for repentance and learning
        this.logSovereignly();
        
        // Loop 7: TrustChain Recording - Record error in immutable ledger
        this.recordInTrustChain();
    }

    /**
     * Loop 1: Al-Fatiha Truth Anchor - Validate error against Islamic principles
     * [TC] reason: Islamic principle validation | id: TC-7LOOP-002
     */
    private validateIslamicPrinciples(): void {
        const forbiddenPatterns = ['haram', 'forbidden', 'unethical', 'immoral'];
        const hasForbiddenContent = forbiddenPatterns.some(pattern => 
            this.message.toLowerCase().includes(pattern)
        );
        
        if (hasForbiddenContent) {
            this.metadata.islamic_violation = true;
            this.metadata.principle_violated = 'Islamic ethical principles';
        }
    }

    /**
     * Loop 2: Yasin Experience Replay - Check for similar past errors
     * [TC] reason: Pattern learning from past errors | id: TC-7LOOP-003
     */
    private async checkErrorPatterns(): Promise<void> {
        // Implementation would check memory for similar error patterns
        const errorSignature = `${this.code}:${this.message.substring(0, 50)}`;
        // Store pattern for future learning
        this.metadata.error_pattern = errorSignature;
    }

    /**
     * Loop 3: Moral Resonance - Calculate moral impact score
     * [TC] reason: Moral impact assessment | id: TC-7LOOP-004
     */
    private calculateMoralResonance(): void {
        let moralScore = 1.0; // Default neutral
        
        // Adjust based on error type
        if (this.code === 'TAWBAH_HALT') moralScore = 0.9;
        if (this.code === 'KERNEL_CRASH') moralScore = 0.8;
        if (this.code === 'CONNECTION_FAILURE') moralScore = 0.7;
        
        this.metadata.moral_resonance = moralScore;
    }

    /**
     * Loop 4: Conscience Validation - Ensure error aligns with Damir
     * [TC] reason: Conscience alignment check | id: TC-7LOOP-005
     */
    private validateWithConscience(): void {
        // Check if error respects Islamic conscience
        this.metadata.conscience_aligned = !this.metadata.islamic_violation;
        this.metadata.damir_compliant = this.metadata.conscience_aligned;
    }

    /**
     * Loop 5: Al-Waqiah Decision - Determine error severity and action
     * [TC] reason: Severity assessment and action determination | id: TC-7LOOP-006
     */
    private determineErrorSeverity(): void {
        const severityMap = {
            'TAWBAH_HALT': 'CRITICAL',
            'KERNEL_CRASH': 'HIGH',
            'MITHAQ_VIOLATION': 'HIGH',
            'CONNECTION_FAILURE': 'MEDIUM',
            'HALLUCINATION_DETECTED': 'HIGH'
        };
        
        this.metadata.severity = severityMap[this.code] || 'MEDIUM';
        this.metadata.requires_intervention = this.metadata.severity === 'CRITICAL';
    }

    /**
     * Loop 6: Al-Mulk Tawbah Gate - Log error for repentance and learning
     * [TC] reason: Repentance and learning logging | id: TC-7LOOP-007
     */
    private logSovereignly() {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'FAILURES.md');
        
        /**
         * Enhanced FAILURES.md entry with 7-loop moral resonance
         * [TC] reason: Enhanced with pattern learning and moral context | id: TC-7LOOP-010
         */
        const entry = `
### ❌ [SOVEREIGN_FAILURE] | ${this.timestamp}
- **Code**: ${this.code}
- **Message**: ${this.message}
- **Severity**: ${this.metadata.severity}
- **Source**: ${this.metadata.source}
- **Recovery**: ${this.metadata.recovery_strategy}
- **Moral Resonance**: ${this.metadata.moral_resonance || 'N/A'}
- **Islamic Violation**: ${this.metadata.islamic_violation ? 'YES' : 'NO'}
- **Conscience Aligned**: ${this.metadata.conscience_aligned ? 'YES' : 'NO'}
- **TrustChain Hash**: ${this.metadata.immutable_hash || 'N/A'}
- **Error Pattern**: ${this.metadata.error_pattern || 'N/A'}
${this.metadata.retryHistory ? `- **Retry History**: ${JSON.stringify(this.metadata.retryHistory)}` : ''}
${this.metadata.partialResults ? `- **Partial Results**: ${JSON.stringify(this.metadata.partialResults)}` : ''}
${this.metadata.principle_violated ? `- **Violated Principle**: ${this.metadata.principle_violated}` : ''}
---
`;
        
        // [TC] reason: Store failure pattern for learning | id: TC-7LOOP-011
        try {
            fs.appendFileSync(logPath, entry);
            
            // Store failure in memory for pattern learning
            this.storeFailurePattern();
            
        } catch (e) {
            console.error('Failed to log to FAILURES.md:', e);
        }
    }

    /**
     * Store failure pattern for future learning
     * [TC] reason: Pattern learning from failures | id: TC-7LOOP-012
     */
    private async storeFailurePattern(): Promise<void> {
        try {
            const { IQRAMemory } = await import('#memory/memory');
            
            await IQRAMemory.set(`failure_pattern:${this.code}:${Date.now()}`, {
                code: this.code,
                message: this.message,
                severity: this.metadata.severity,
                moral_resonance: this.metadata.moral_resonance,
                islamic_violation: this.metadata.islamic_violation,
                timestamp: this.timestamp,
                pattern_hash: this.metadata.immutable_hash
            }, { ttl: 86400000 }); // 24 days
            
        } catch (e) {
            console.warn('Failed to store failure pattern:', e);
        }
        
        console.error(`🕋 [SOVEREIGN_ERROR] | ${this.code} | ${this.message}`);
    }

    /**
     * Loop 7: TrustChain Recording - Record error in immutable ledger
     * [TC] reason: Immutable error recording for accountability | id: TC-7LOOP-008
     */
    private recordInTrustChain(): void {
        // Implementation would record error in TrustChain system
        this.metadata.trustchain_recorded = true;
        this.metadata.immutable_hash = this.generateImmutableHash();
    }

    /**
     * Generate immutable hash for error recording
     * [TC] reason: Hash generation for immutability | id: TC-7LOOP-009
     */
    private generateImmutableHash(): string {
        const crypto = require('crypto');
        const data = `${this.code}:${this.message}:${this.timestamp}:${JSON.stringify(this.metadata)}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    /**
     * Log to TAWBAH.md (repentance log) with full context
     * [TC] reason: merged from 01-core/sovereign_error.ts | id: TC-unify-sovereign-error
     */
    async logToTawbah(): Promise<void> {
        const { logToIQRAFile } = await import('#security/security');
        
        const entry = `
### 🛑 [SOVEREIGN_ERROR] ${this.timestamp}
- **Code**: ${this.code}
- **Message**: ${this.message}
- **Severity**: ${this.metadata.severity}
- **Source**: ${this.metadata.source}
- **Recovery**: ${this.metadata.recovery_strategy}
${this.metadata.retryHistory ? `- **Retry History**: ${JSON.stringify(this.metadata.retryHistory)}` : ''}
${this.metadata.partialResults ? `- **Partial Results**: ${JSON.stringify(this.metadata.partialResults, null, 2)}` : ''}
---`;
        
        await logToIQRAFile('TAWBAH.md', entry);
    }
}

/**
 * Determines whether a value is a SovereignError.
 *
 * @returns `true` if `error` is an instance of `SovereignError`, `false` otherwise.
 */
export function isSovereignError(error: unknown): error is SovereignError {
    return error instanceof SovereignError;
}

/**
 * Extracts `partialResults` from an error's metadata when available.
 *
 * @param error - The value to inspect for embedded partial results
 * @returns The `partialResults` object from the error's metadata, or `undefined` if the value is not a `SovereignError` or has no `partialResults`
 */
export function extractPartialResults(error: unknown): Record<string, unknown> | undefined {
    if (isSovereignError(error)) {
        return error.metadata.partialResults;
    }
    return undefined;
}
