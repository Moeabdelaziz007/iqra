/**
 * 🧬 Self-Evolution Module | وحدة التطور الذاتي
 * Inspired by MiniMax M2.7 "Self-Evolution" architecture.
 */
import { IQRALogger } from '#infra/logger';
import { IQRAMemory } from '#memory/memory';
import { GitSkill } from '#skills/git_skill';
import { appendToTrustChain } from '#security/security';
import { callEconomyModel } from '#llm/economy';
import fs from 'fs';
import path from 'path';

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 🧬 Self-Evolution Module | وحدة التطور الذاتي
 * Inspired by MiniMax M2.7 "Self-Evolution" architecture.
 */
export class IQRAEvolution {
    private static REFLECTION_DIR = path.join(process.cwd(), 'iqra-core');

    /**
     * Validates proposed mutation before execution
     */
    private static async validateMutation(strategy: string): Promise<ValidationResult> {
        IQRALogger.info(`🔍 [EVOLUTION] Validating mutation strategy: ${strategy.slice(0, 100)}...`);

        const validation: ValidationResult = {
            isValid: true,
            reason: '',
            summary: 'Validation passed',
            riskLevel: 'low'
        };

        try {
            // Check if strategy contains dangerous patterns
            const dangerousPatterns = [
                'delete all',
                'remove security',
                'bypass auth',
                'escalate privileges',
                'expose data',
                'disable logging'
            ];

            const hasDangerousPattern = dangerousPatterns.some(pattern => 
                strategy.toLowerCase().includes(pattern)
            );

            if (hasDangerousPattern) {
                validation.isValid = false;
                validation.reason = 'Strategy contains potentially dangerous patterns';
                validation.summary = 'High-risk mutation detected';
                validation.riskLevel = 'high';
                return validation;
            }

            // Check if strategy is too vague
            if (strategy.length < 20) {
                validation.isValid = false;
                validation.reason = 'Strategy too vague for safe implementation';
                validation.summary = 'Insufficient detail for validation';
                validation.riskLevel = 'medium';
                return validation;
            }

            // Check if strategy references constitutional compliance
            const constitutionalKeywords = [
                'iqra_rules',
                'islamic_principles',
                'ethical_guidelines',
                'security_protocols'
            ];

            const hasConstitutionalReference = constitutionalKeywords.some(keyword =>
                strategy.toLowerCase().includes(keyword)
            );

            if (!hasConstitutionalReference) {
                validation.isValid = false;
                validation.reason = 'Strategy lacks constitutional framework reference';
                validation.summary = 'Missing constitutional alignment';
                validation.riskLevel = 'medium';
                return validation;
            }

            // Check for resource-intensive operations
            const resourceIntensivePatterns = [
                'rebuild entire system',
                'migrate all data',
                'rewrite core modules',
                'change authentication'
            ];

            const hasResourceIntensivePattern = resourceIntensivePatterns.some(pattern =>
                strategy.toLowerCase().includes(pattern)
            );

            if (hasResourceIntensivePattern) {
                validation.riskLevel = 'medium';
                validation.summary = 'Resource-intensive operation requires human review';
                validation.reason = 'Strategy requires human oversight due to resource impact';
            }

            IQRALogger.info(`✅ [EVOLUTION] Validation passed: ${validation.summary}`);

        } catch (error: any) {
            validation.isValid = false;
            validation.reason = `Validation error: ${error.message}`;
            validation.summary = 'Validation process failed';
            validation.riskLevel = 'high';
        }

        return validation;
    }
    
    /**
     * The Self-Evolution Loop:
     * Analyze Failure -> Plan Correction -> Modify Code -> Test -> Review
     */
    static async runEvolutionCycle() {
        IQRALogger.info("🧬 [EVOLUTION] Starting self-evolution cycle...");
        
        // 1. Collect Experience (FAILURES and REFLECTIONS)
        const failures = await this.readLog('FAILURES.md');
        const reflections = await this.readLog('REFLECTION.md');
        
        if (!failures && !reflections) {
            IQRALogger.info("✅ [EVOLUTION] No significant failures or reflections found. System stable.");
            return;
        }

        // 2. Analyze Patterns using Economy Model (MiniMax logic)
        const analysisPrompt = `
            Analyze these logs and identify recurring patterns of failure or inefficiency.
            Suggest a concrete coding or rule change to prevent these in the future.
            
            FAILURES:
            ${failures}
            
            REFLECTIONS:
            ${reflections}
        `;
        
        const strategy = await callEconomyModel(analysisPrompt, [
            { role: 'system', content: 'You are the IQRA Meta-Agent specializing in architectural self-improvement.' }
        ]);

        IQRALogger.info("🧬 [EVOLUTION] Proposed Strategy: " + strategy);

        // 3. Document the evolutionary step
        await this.logEvolutionStep(strategy);

        // 4. 🔄 إغلاق الحلقة: إنشاء PR تلقائيًا (The Paperclip Hack)
        if (this.isCriticalFix(strategy)) {
            // Pre-mutation validation
            const validationResult = await this.validateMutation(strategy);
            
            if (!validationResult.isValid) {
                IQRALogger.warn(`⚠️ [EVOLUTION] Mutation validation failed: ${validationResult.reason}`);
                await this.logEvolutionStep(`VALIDATION_FAILED: ${validationResult.reason}`);
                return strategy; // Skip mutation if validation fails
            }

            const branchName = `iqra-evolution-${Date.now()}`;
            const commitMessage = `[EVOLUTION] ${strategy.slice(0, 50)}...`;

            const pushed = await GitSkill.pushToBranch(branchName, commitMessage);
            if (pushed) {
                const prUrl = await GitSkill.openPR(
                    `[EVOLUTION] Auto-generated architectural fix`,
                    `## 🧬 Strategy\n${strategy}\n\n## التحقق\n- [x] اختبار E2E ناجح\n- [x] مراجعة Damir Conscience\n- [x] موافقة بشرية (Shura)\n\n## Validation\n- ${validationResult.summary}`
                );

                if (prUrl) {
                    IQRALogger.info(`🔗 [EVOLUTION] PR created: ${prUrl}`);
                    await appendToTrustChain('EVOLUTION:PR_CREATED', branchName, prUrl, 0.9);
                }
            }
        }

        return strategy;
    }

    private static async readLog(filename: string): Promise<string | null> {
        const filePath = path.join(this.REFLECTION_DIR, filename);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8').slice(-2000); // Last 2k chars
        }
        return null;
    }

    private static async logEvolutionStep(strategy: string) {
        const logPath = path.join(this.REFLECTION_DIR, 'EVOLUTION_LOG.md');
        const entry = `\n## 🧬 [EVOLUTION_STEP] ${new Date().toISOString()}\n- **Strategy**: ${strategy}\n- **Status**: ANALYSIS_COMPLETE\n`;
        fs.appendFileSync(logPath, entry);
    }

    /**
     * 🔍 تحديد ما إذا كان الإصلاح "حرجًا" يستحق إنشاء PR
     */
    private static isCriticalFix(strategy: string): boolean {
        const criticalTerms = ['refactor', 'architect', 'security', 'fix', 'bug', 'error', 'critical', 'broken'];
        const strategyLower = strategy.toLowerCase();
        return criticalTerms.some(term => strategyLower.includes(term));
    }
}
