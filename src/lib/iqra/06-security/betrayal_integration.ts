/**
 * 🛡️ BetrayalGuard — wraps DamirConscience + ByzantineFilter for PiWorker-OS
 * "وَإِذَا جَاءُوكُمْ قَالُوا آمَنَّا وَقَد دَّخَلُوا بِالْكُفْرِ" — المائدة: 61
 */
import { globalDamir } from './damir_conscience';
import { ByzantineFilter, AnomalyReport } from './byzantine_filter';
import { ForbiddenPatternsValidator } from './forbidden_patterns';
import { appendToTrustChain } from './security';

export enum EconomicRiskLevel { LOW = "LOW", MEDIUM = "MEDIUM", HIGH = "HIGH", CRITICAL = "CRITICAL" }

export interface EconomicContext {
  availableBudget: number; currentBurnRate: number; predictedRoi: number; marketVolatility: number;
}

export interface BetrayalCheck {
  actionId: string; agentId: string; intention: string; economicContext?: EconomicContext;
}

export interface BetrayalVerdict {
  allowed: boolean; reason: string; riskLevel: EconomicRiskLevel;
  rejectionType?: 'intention' | 'resource' | 'anomaly' | 'forbidden';
  confidence: number; latencyMs: number;
}

export class BetrayalGuard {
  static async evaluate(check: BetrayalCheck): Promise<BetrayalVerdict> {
    const start = Date.now();

    // 1. DamirConscience — فحص أخلاقي
    const damirAction = { id: check.actionId, intention: check.intention, requiredResources: [], agent_id: check.agentId };
    const damirVerdict = globalDamir.check(damirAction);
    if (!damirVerdict.allowed) {
      appendToTrustChain('BETRAYAL:BLOCK', check.actionId, `Damir blocked: ${damirVerdict.reason}`, 0.0);
      return { allowed: false, reason: damirVerdict.reason, riskLevel: EconomicRiskLevel.HIGH, rejectionType: 'intention', confidence: 1.0, latencyMs: Date.now() - start };
    }

    // 2. ForbiddenPatternsValidator — فحص الأنماط
    const patternCheck = ForbiddenPatternsValidator.validate(check.intention);
    if (patternCheck.riskLevel === 'critical' || patternCheck.riskLevel === 'high') {
      appendToTrustChain('BETRAYAL:PATTERN', check.actionId, `Forbidden pattern: ${patternCheck.violations.map(v=>v.id).join(',')}`, 0.0);
      return { allowed: false, reason: `Forbidden pattern: ${patternCheck.riskLevel}`, riskLevel: patternCheck.riskLevel === 'critical' ? EconomicRiskLevel.CRITICAL : EconomicRiskLevel.HIGH, rejectionType: 'forbidden', confidence: 0.95, latencyMs: Date.now() - start };
    }

    // 3. ByzantineFilter — فحص إحصائي للشذوذ
    if (check.economicContext) {
      const anomaly = ByzantineFilter.detectZScore(
        [check.economicContext.availableBudget, check.economicContext.currentBurnRate],
        check.economicContext.predictedRoi
      );
      if (anomaly.isAnomaly) {
        appendToTrustChain('BETRAYAL:ANOMALY', check.actionId, `Z-Score anomaly: ${anomaly.score.toFixed(2)}`, 0.3);
        return { allowed: false, reason: `Anomaly detected: Z=${anomaly.score.toFixed(2)}`, riskLevel: EconomicRiskLevel.MEDIUM, rejectionType: 'anomaly', confidence: 0.8, latencyMs: Date.now() - start };
      }
    }

    // Passed all checks
    appendToTrustChain('BETRAYAL:ALLOW', check.actionId, 'All checks passed', 1.0);
    return { allowed: true, reason: 'BetrayalGuard: ALL checks passed', riskLevel: EconomicRiskLevel.LOW, confidence: 1.0, latencyMs: Date.now() - start };
  }
}
