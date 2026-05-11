/**
 * 🔄 Mission State Transition Analyzer — محلل انتقالات حالة المهمة
 * 
 * "وَكُلَّ شَيْءٍ عِندَهُ بِمِقْدَارٍ" - الرعد: 8
 * 
 * Analyzes and tracks state transitions across the mission lifecycle
 * to identify patterns, bottlenecks, and optimization opportunities.
 */

import { MissionState, WorkerReport, MissionHandoff } from './protocol';
import { IQRALogger } from '../logger';

export interface StateTransition {
  from_state: string;
  to_state: string;
  worker_id: string;
  phase: string;
  timestamp: number;
  duration_ms: number;
  success: boolean;
  error?: string;
  context_delta: Record<string, any>;
}

export interface TransitionPattern {
  sequence: string[];
  frequency: number;
  avg_duration: number;
  success_rate: number;
  common_errors: Array<{ error: string; count: number }>;
}

export interface StateAnalysis {
  total_transitions: number;
  avg_transition_time: number;
  bottleneck_phases: string[];
  success_rates: Record<string, number>;
  patterns: TransitionPattern[];
  recommendations: string[];
}

export class StateTransitionAnalyzer {
  private static instance: StateTransitionAnalyzer;
  private transitions: StateTransition[] = [];
  private stateSnapshots: Map<string, MissionState> = new Map();

  private constructor() {}

  static getInstance(): StateTransitionAnalyzer {
    if (!StateTransitionAnalyzer.instance) {
      StateTransitionAnalyzer.instance = new StateTransitionAnalyzer();
    }
    return StateTransitionAnalyzer.instance;
  }

  /**
   * Record a state transition
   */
  recordTransition(
    workerId: string,
    phase: string,
    fromState: MissionState,
    toState: MissionState,
    success: boolean,
    error?: string
  ): void {
    const transition: StateTransition = {
      from_state: this.generateStateHash(fromState),
      to_state: this.generateStateHash(toState),
      worker_id: workerId,
      phase,
      timestamp: Date.now(),
      duration_ms: toState.metadata.start_time - fromState.metadata.start_time,
      success,
      error,
      context_delta: this.calculateContextDelta(fromState.context, toState.context)
    };

    this.transitions.push(transition);
    this.stateSnapshots.set(transition.to_state, toState);

    IQRALogger.info(`🔄 [STATE_ANALYZER] Recorded transition: ${phase} by ${workerId} (${success ? 'SUCCESS' : 'FAILURE'})`);
  }

  /**
   * Analyze transition patterns
   */
  analyzeTransitions(): StateAnalysis {
    const totalTransitions = this.transitions.length;
    const avgTransitionTime = this.calculateAverageTransitionTime();
    const bottleneckPhases = this.identifyBottlenecks();
    const successRates = this.calculateSuccessRates();
    const patterns = this.identifyPatterns();
    const recommendations = this.generateRecommendations(bottleneckPhases, successRates, patterns);

    return {
      total_transitions: totalTransitions,
      avg_transition_time: avgTransitionTime,
      bottleneck_phases: bottleneckPhases,
      success_rates: successRates,
      patterns,
      recommendations
    };
  }

  /**
   * Get real-time transition metrics
   */
  getRealTimeMetrics(): {
    active_missions: number;
    recent_failures: number;
    avg_phase_duration: Record<string, number>;
    error_rate: number;
  } {
    const recentTransitions = this.transitions.slice(-50); // Last 50 transitions
    const recentFailures = recentTransitions.filter(t => !t.success).length;
    const avgPhaseDuration = this.calculateAveragePhaseDuration(recentTransitions);
    const errorRate = recentTransitions.length > 0 ? recentFailures / recentTransitions.length : 0;

    return {
      active_missions: this.stateSnapshots.size,
      recent_failures: recentFailures,
      avg_phase_duration: avgPhaseDuration,
      error_rate: errorRate
    };
  }

  /**
   * Detect anomalies in transition patterns
   */
  detectAnomalies(): Array<{
    type: 'slow_transition' | 'high_failure_rate' | 'unusual_pattern';
    description: string;
    severity: 'low' | 'medium' | 'high';
    data: any;
  }> {
    const anomalies: Array<{
      type: 'slow_transition' | 'high_failure_rate' | 'unusual_pattern';
      description: string;
      severity: 'low' | 'medium' | 'high';
      data: any;
    }> = [];

    // Detect slow transitions
    const avgTime = this.calculateAverageTransitionTime();
    const slowTransitions = this.transitions.filter(t => t.duration_ms > avgTime * 2);
    
    if (slowTransitions.length > 0) {
      anomalies.push({
        type: 'slow_transition',
        description: `Found ${slowTransitions.length} transitions slower than 2x average`,
        severity: 'medium',
        data: { slow_transitions: slowTransitions, avg_time: avgTime }
      });
    }

    // Detect high failure rates
    const recentTransitions = this.transitions.slice(-20);
    const failureRate = recentTransitions.filter(t => !t.success).length / recentTransitions.length;
    
    if (failureRate > 0.3) {
      anomalies.push({
        type: 'high_failure_rate',
        description: `Recent failure rate: ${(failureRate * 100).toFixed(1)}%`,
        severity: 'high',
        data: { failure_rate: failureRate, recent_failures: recentTransitions.filter(t => !t.success) }
      });
    }

    // Detect unusual patterns
    const patterns = this.identifyPatterns();
    const unusualPatterns = patterns.filter(p => p.frequency < 2 && p.success_rate < 0.5);
    
    if (unusualPatterns.length > 0) {
      anomalies.push({
        type: 'unusual_pattern',
        description: `Found ${unusualPatterns.length} rare patterns with low success`,
        severity: 'low',
        data: { unusual_patterns: unusualPatterns }
      });
    }

    return anomalies;
  }

  /**
   * Generate state hash for comparison
   */
  private generateStateHash(state: MissionState): string {
    const key = `${state.metadata.mission_id}_${state.reports.length}_${Object.keys(state.context).length}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  /**
   * Calculate context delta between states
   */
  private calculateContextDelta(fromContext: Record<string, any>, toContext: Record<string, any>): Record<string, any> {
    const delta: Record<string, any> = {};
    
    // Find new or modified keys
    for (const key of Object.keys(toContext)) {
      if (!(key in fromContext) || JSON.stringify(fromContext[key]) !== JSON.stringify(toContext[key])) {
        delta[key] = {
          from: fromContext[key],
          to: toContext[key]
        };
      }
    }
    
    return delta;
  }

  /**
   * Calculate average transition time
   */
  private calculateAverageTransitionTime(): number {
    if (this.transitions.length === 0) return 0;
    
    const totalTime = this.transitions.reduce((sum, t) => sum + t.duration_ms, 0);
    return totalTime / this.transitions.length;
  }

  /**
   * Identify bottleneck phases
   */
  private identifyBottlenecks(): string[] {
    const phaseDurations = new Map<string, number[]>();
    
    for (const transition of this.transitions) {
      if (!phaseDurations.has(transition.phase)) {
        phaseDurations.set(transition.phase, []);
      }
      phaseDurations.get(transition.phase)!.push(transition.duration_ms);
    }
    
    const avgTime = this.calculateAverageTransitionTime();
    const bottlenecks: string[] = [];
    
    for (const [phase, durations] of Array.from(phaseDurations.entries())) {
      const avgPhaseTime = durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length;
      if (avgPhaseTime > avgTime * 1.5) {
        bottlenecks.push(phase);
      }
    }
    
    return bottlenecks;
  }

  /**
   * Calculate success rates by phase
   */
  private calculateSuccessRates(): Record<string, number> {
    const phaseStats = new Map<string, { success: number; total: number }>();
    
    for (const transition of this.transitions) {
      if (!phaseStats.has(transition.phase)) {
        phaseStats.set(transition.phase, { success: 0, total: 0 });
      }
      const stats = phaseStats.get(transition.phase)!;
      stats.total++;
      if (transition.success) stats.success++;
    }
    
    const successRates: Record<string, number> = {};
    for (const [phase, stats] of Array.from(phaseStats.entries())) {
      successRates[phase] = stats.total > 0 ? stats.success / stats.total : 0;
    }
    
    return successRates;
  }

  /**
   * Identify common patterns in transitions
   */
  private identifyPatterns(): TransitionPattern[] {
    const patterns = new Map<string, StateTransition[]>();
    
    // Group transitions by sequence
    for (let i = 0; i < this.transitions.length - 2; i++) {
      const sequence = [
        this.transitions[i].phase,
        this.transitions[i + 1].phase,
        this.transitions[i + 2].phase
      ].join(' → ');
      
      if (!patterns.has(sequence)) {
        patterns.set(sequence, []);
      }
      patterns.get(sequence)!.push(this.transitions[i]);
    }
    
    // Calculate pattern statistics
    const result: TransitionPattern[] = [];
    for (const [sequence, transitions] of Array.from(patterns.entries())) {
      const frequency = transitions.length;
      const avgDuration = transitions.reduce((sum: number, t: StateTransition) => sum + t.duration_ms, 0) / transitions.length;
      const successRate = transitions.filter((t: StateTransition) => t.success).length / transitions.length;
      
      // Analyze common errors
      const errorCounts = new Map<string, number>();
      for (const transition of transitions) {
        if (transition.error) {
          errorCounts.set(transition.error, (errorCounts.get(transition.error) || 0) + 1);
        }
      }
      
      const commonErrors = Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      result.push({
        sequence: sequence.split(' → '),
        frequency,
        avg_duration: avgDuration,
        success_rate: successRate,
        common_errors: commonErrors
      });
    }
    
    return result.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Calculate average phase duration
   */
  private calculateAveragePhaseDuration(transitions: StateTransition[]): Record<string, number> {
    const phaseDurations = new Map<string, number[]>();
    
    for (const transition of transitions) {
      if (!phaseDurations.has(transition.phase)) {
        phaseDurations.set(transition.phase, []);
      }
      phaseDurations.get(transition.phase)!.push(transition.duration_ms);
    }
    
    const result: Record<string, number> = {};
    for (const [phase, durations] of Array.from(phaseDurations.entries())) {
      result[phase] = durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length;
    }
    
    return result;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    bottlenecks: string[],
    successRates: Record<string, number>,
    patterns: TransitionPattern[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Bottleneck recommendations
    if (bottlenecks.length > 0) {
      recommendations.push(`Consider optimizing ${bottlenecks.join(', ')} phases - they're 50% slower than average`);
    }
    
    // Success rate recommendations
    const lowSuccessPhases = Object.entries(successRates)
      .filter(([_, rate]) => rate < 0.8)
      .map(([phase, _]) => phase);
    
    if (lowSuccessPhases.length > 0) {
      recommendations.push(`Review ${lowSuccessPhases.join(', ')} phases - success rate below 80%`);
    }
    
    // Pattern recommendations
    const successfulPatterns = patterns.filter(p => p.success_rate > 0.9 && p.frequency > 3);
    if (successfulPatterns.length > 0) {
      recommendations.push(`Leverage successful patterns: ${successfulPatterns.map(p => p.sequence.join(' → ')).join(', ')}`);
    }
    
    // Error pattern recommendations
    const errorPronePatterns = patterns.filter(p => p.common_errors.length > 0);
    if (errorPronePatterns.length > 0) {
      recommendations.push(`Address common errors in: ${errorPronePatterns.map(p => p.sequence.join(' → ')).join(', ')}`);
    }
    
    return recommendations;
  }

  /**
   * Clear all transition data (for testing)
   */
  clear(): void {
    this.transitions = [];
    this.stateSnapshots.clear();
    IQRALogger.info('🧹 [STATE_ANALYZER] Transition data cleared');
  }
}
