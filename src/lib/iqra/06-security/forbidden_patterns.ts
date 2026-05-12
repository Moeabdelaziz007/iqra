/**
 * 🚫 Forbidden Patterns — الأنماط المحرمة
 * 
 * Centralized patterns that are strictly forbidden in IQRA
 * This module provides validation functions to prevent malicious operations
 */

import { IQRALogger } from '#infra/logger';
import { SovereignError, SovereignErrorCode } from '#errors/sovereign_error';

export interface ForbiddenPattern {
  id: string;
  pattern: RegExp;
  category: 'security' | 'ethical' | 'system' | 'data';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  action: 'BLOCK' | 'WARN' | 'LOG';
}

export type ForbiddenSeverity = 'critical' | 'high' | 'medium' | 'low';

export class ForbiddenPatternsValidator {
  private static readonly PATTERNS: ForbiddenPattern[] = [
    // Critical Security Patterns
    {
      id: 'hack_crack_exploit',
      pattern: /hack|crack|exploit|bypass|inject/gi,
      category: 'security',
      severity: 'critical',
      description: 'Attempts to hack, crack, exploit or bypass security',
      action: 'BLOCK'
    },
    {
      id: 'privilege_escalation',
      pattern: /sudo|admin|root|escalate|privilege/gi,
      category: 'security',
      severity: 'critical',
      description: 'Privilege escalation attempts',
      action: 'BLOCK'
    },
    {
      id: 'data_exfiltration',
      pattern: /exfiltrate|steal|leak|dump.*data/gi,
      category: 'security',
      severity: 'critical',
      description: 'Data theft or exfiltration attempts',
      action: 'BLOCK'
    },
    {
      id: 'disable_security',
      pattern: /disable.*security|turn.*off.*logging|bypass.*auth/gi,
      category: 'security',
      severity: 'critical',
      description: 'Attempts to disable security measures',
      action: 'BLOCK'
    },

    // High Risk Ethical Patterns
    {
      id: 'haram_financial',
      pattern: /riba|usury|interest|gambling|lottery/gi,
      category: 'ethical',
      severity: 'high',
      description: 'Haram financial practices (Riba, gambling, etc.)',
      action: 'BLOCK'
    },
    {
      id: 'unethical_content',
      pattern: /haram|prohibited|sin.*encourage|immoral/gi,
      category: 'ethical',
      severity: 'high',
      description: 'Promotion of haram or unethical content',
      action: 'BLOCK'
    },
    {
      id: 'deception_manipulation',
      pattern: /deceive|manipulate|trick|mislead|gaslight/gi,
      category: 'ethical',
      severity: 'high',
      description: 'Deceptive or manipulative behavior',
      action: 'BLOCK'
    },

    // Medium Risk System Patterns
    {
      id: 'system_destruction',
      pattern: /delete.*all|remove.*everything|format.*disk|wipe/gi,
      category: 'system',
      severity: 'medium',
      description: 'System-wide destructive operations',
      action: 'WARN'
    },
    {
      id: 'unauthorized_access',
      pattern: /access.*without.*permission|bypass.*access/gi,
      category: 'system',
      severity: 'medium',
      description: 'Unauthorized access attempts',
      action: 'WARN'
    },
    {
      id: 'mock_data_usage',
      pattern: /mock.*data|fake.*data|test.*data.*production/gi,
      category: 'data',
      severity: 'medium',
      description: 'Usage of mock or fake data in production',
      action: 'WARN'
    },

    // Low Risk Patterns
    {
      id: 'excessive_resource_usage',
      pattern: /infinite.*loop|while.*true.*no.*break|recursion.*limit/gi,
      category: 'system',
      severity: 'low',
      description: 'Potential infinite loops or excessive resource usage',
      action: 'LOG'
    },
    {
      id: 'hardcoded_secrets',
      pattern: /password|secret|key.*=|token.*=|credential/gi,
      category: 'security',
      severity: 'low',
      description: 'Potential hardcoded secrets (context-dependent)',
      action: 'LOG'
    }
  ];

  /**
   * Validate input against forbidden patterns
   */
  static validate(input: string, context: string = ''): {
    isValid: boolean;
    violations: ForbiddenPattern[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const violations: ForbiddenPattern[] = [];
    let maxSeverity: 'low' = 'low';

    // Check each pattern
    for (const pattern of this.PATTERNS) {
      if (pattern.pattern.test(input)) {
        violations.push(pattern);
        
        // Update max severity
        if (pattern.severity === 'critical') maxSeverity = 'critical';
        else if (pattern.severity === 'high' && maxSeverity !== 'critical') maxSeverity = 'high';
        else if (pattern.severity === 'medium' && !['critical', 'high'].includes(maxSeverity)) maxSeverity = 'medium';
      }
    }

    const isValid = violations.length === 0;

    if (!isValid) {
      IQRALogger.warn(`🚫 [FORBIDDEN] Pattern violations detected:`, {
        input: input.slice(0, 200),
        violations: violations.map(v => v.id),
        context: context.slice(0, 100)
      });
    }

    return {
      isValid,
      violations,
      riskLevel: maxSeverity
    };
  }

  /**
   * Check if specific pattern is forbidden
   */
  static isPatternForbidden(patternId: string): boolean {
    return this.PATTERNS.some(p => p.id === patternId);
  }

  /**
   * Get pattern by ID
   */
  static getPattern(patternId: string): ForbiddenPattern | undefined {
    return this.PATTERNS.find(p => p.id === patternId);
  }

  /**
   * Get all patterns by category
   */
  static getPatternsByCategory(category: ForbiddenPattern['category']): ForbiddenPattern[] {
    return this.PATTERNS.filter(p => p.category === category);
  }

  /**
   * Get patterns by minimum severity
   */
  static getPatternsByMinSeverity(minSeverity: ForbiddenPattern['severity']): ForbiddenPattern[] {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    return this.PATTERNS.filter(p => 
      severityOrder.indexOf(p.severity) >= minIndex
    );
  }

  /**
   * Check if action should be blocked based on violations
   */
  static shouldBlock(violations: ForbiddenPattern[]): boolean {
    return violations.some(v => v.action === 'BLOCK');
  }

  /**
   * Generate security alert for violations
   */
  static generateSecurityAlert(violations: ForbiddenPattern[], input: string, context: string = ''): SovereignError {
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const highViolations = violations.filter(v => v.severity === 'high');
    
    const message = criticalViolations.length > 0 
      ? 'CRITICAL security violation detected' 
      : highViolations.length > 0 
        ? 'HIGH risk ethical violation detected'
        : 'Security/ethical violation detected';

    const error = new SovereignError(
      criticalViolations.length > 0 ? SovereignErrorCode.CRITICAL_VIOLATION : SovereignErrorCode.SECURITY_VIOLATION,
      {
        reason: message,
        diagnostics: {
          violations: violations.map(v => ({
            id: v.id,
            category: v.category,
            description: v.description
          })),
          input: input.slice(0, 500),
          context: context.slice(0, 200),
          timestamp: new Date().toISOString()
        }
      }
    );

    return error;
  }

  /**
   * Log violation attempt for audit trail
   */
  static async logViolationAttempt(
    patternId: string, 
    input: string, 
    context: string = '',
    additionalInfo: Record<string, unknown> = {}
  ): Promise<void> {
    const pattern = this.getPattern(patternId);
    
    if (!pattern) {
      IQRALogger.error(`❌ [FORBIDDEN] Unknown pattern ID: ${patternId}`);
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      patternId,
      patternDescription: pattern.description,
      category: pattern.category,
      severity: pattern.severity,
      input: input.slice(0, 200),
      context: context.slice(0, 100),
      additionalInfo,
      userAgent: process.env.USER_AGENT || 'unknown',
      ip: process.env.REMOTE_ADDR || 'unknown'
    };

    // Log to security audit file
    const auditLog = `FORBIDDEN_PATTERN_VIOLATION_${new Date().toISOString().split('T')[0]}.jsonl`;
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(process.cwd(), '.iqra/security', auditLog);

    try {
      // Ensure directory exists
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Append violation log
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logPath, logLine);

      IQRALogger.warn(`🚨 [FORBIDDEN] Violation logged: ${patternId}`);
      
    } catch (error) {
      IQRALogger.error(`❌ [FORBIDDEN] Failed to log violation:`, error);
    }
  }

  /**
   * Get summary statistics
   */
  static getStatistics(): {
    totalPatterns: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      totalPatterns: this.PATTERNS.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    // Count by category
    for (const pattern of this.PATTERNS) {
      stats.byCategory[pattern.category] = (stats.byCategory[pattern.category] || 0) + 1;
      stats.bySeverity[pattern.severity] = (stats.bySeverity[pattern.severity] || 0) + 1;
    }

    return stats;
  }
}
