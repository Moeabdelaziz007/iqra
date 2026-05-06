/**
 * 🛡️ SovereignError Protocol | بروتوكول الخطأ الصادق
 * 
 * "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 */

export enum SovereignErrorCode {
    HALLUCINATION_DETECTED = 'HALLUCINATION_DETECTED',
    TRUTH_ORACLE_MISMATCH = 'TRUTH_ORACLE_MISMATCH',
    CONNECTION_FAILURE = 'CONNECTION_FAILURE',
    MITHAQ_VIOLATION = 'MITHAQ_VIOLATION',
    HUMILITY_THRESHOLD_REACHED = 'HUMILITY_THRESHOLD_REACHED'
}

export interface SovereignErrorMetadata {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    source: string;
    context?: any;
    recovery_strategy: 'RETRY' | 'HALT' | 'REFLECT' | 'ASK_HUMAN';
}

export class SovereignError extends Error {
    public code: SovereignErrorCode;
    public metadata: SovereignErrorMetadata;
    public timestamp: string;

    constructor(message: string, code: SovereignErrorCode, metadata: SovereignErrorMetadata) {
        super(message);
        this.name = 'SovereignError';
        this.code = code;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();

        // Ensure this error is logged to the IQRA log system
        this.logSovereignly();
    }

    private logSovereignly() {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'FAILURES.md');
        
        const entry = `
### ❌ [SOVEREIGN_FAILURE] | ${this.timestamp}
- **Code**: ${this.code}
- **Message**: ${this.message}
- **Severity**: ${this.metadata.severity}
- **Source**: ${this.metadata.source}
- **Recovery**: ${this.metadata.recovery_strategy}
---
`;
        try {
            fs.appendFileSync(logPath, entry);
        } catch (e) {
            console.error('Failed to log to FAILURES.md:', e);
        }
        
        console.error(`🕋 [SOVEREIGN_ERROR] | ${this.code} | ${this.message}`);
    }
}
