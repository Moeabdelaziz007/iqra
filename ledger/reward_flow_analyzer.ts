/**
 * 🌙 Reward Flow Analyzer — محلل تدفق الثواب
 * 
 * "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" - الزلزلة: 7
 * 
 * Analyzes reward flow patterns, identifies bottlenecks, and optimizes
 * the reward distribution system across the IQRA ecosystem.
 */

import { RewardLedger } from './reward-ledger';
import { RewardEntry, DiscoveryLevel } from '../rewards/types';
import { IQRALogger } from '../lib/iqra/logger';

export interface RewardFlowMetrics {
  total_rewards: number;
  average_reward: number;
  discovery_distribution: Record<DiscoveryLevel, number>;
  worker_performance: Record<string, {
    total_rewards: number;
    average_reward: number;
    success_rate: number;
    discovery_levels: Record<DiscoveryLevel, number>;
  }>;
  temporal_patterns: Array<{
    date: string;
    rewards_count: number;
    total_reward: number;
    avg_discovery_level: number;
  }>;
  efficiency_metrics: {
    rewards_per_mission: number;
    discovery_rate: number;
    reward_velocity: number; // rewards per hour
  };
}

export interface RewardAnomaly {
  type: 'unusually_high_reward' | 'unusually_low_reward' | 'stagnant_discovery' | 'reward_inflation';
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  data: any;
  recommendation: string;
}

export interface FlowOptimization {
  area: string;
  current_performance: number;
  target_performance: number;
  actions: string[];
  expected_impact: string;
}

export class RewardFlowAnalyzer {
  private static instance: RewardFlowAnalyzer;
  private cache: Map<string, any> = new Map();
  private lastAnalysis: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): RewardFlowAnalyzer {
    if (!RewardFlowAnalyzer.instance) {
      RewardFlowAnalyzer.instance = new RewardFlowAnalyzer();
    }
    return RewardFlowAnalyzer.instance;
  }

  /**
   * Analyze the complete reward flow
   */
  async analyzeRewardFlow(): Promise<RewardFlowMetrics> {
    const cacheKey = 'reward_flow_metrics';
    const now = Date.now();
    
    // Check cache
    if (now - this.lastAnalysis < this.CACHE_TTL && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const entries = await RewardLedger.getAll();
      const metrics = this.calculateMetrics(entries);
      
      // Cache results
      this.cache.set(cacheKey, metrics);
      this.lastAnalysis = now;
      
      IQRALogger.info(`📊 [REWARD_ANALYZER] Analyzed ${entries.length} reward entries`);
      return metrics;
    } catch (error) {
      IQRALogger.error('❌ [REWARD_ANALYZER] Failed to analyze reward flow:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in reward patterns
   */
  async detectAnomalies(): Promise<RewardAnomaly[]> {
    const entries = await RewardLedger.getAll();
    const anomalies: RewardAnomaly[] = [];

    try {
      // Detect unusually high rewards
      const highRewardAnomalies = this.detectHighRewardAnomalies(entries);
      anomalies.push(...highRewardAnomalies);

      // Detect unusually low rewards
      const lowRewardAnomalies = this.detectLowRewardAnomalies(entries);
      anomalies.push(...lowRewardAnomalies);

      // Detect stagnant discovery patterns
      const stagnantAnomalies = this.detectStagnantDiscovery(entries);
      anomalies.push(...stagnantAnomalies);

      // Detect reward inflation
      const inflationAnomalies = this.detectRewardInflation(entries);
      anomalies.push(...inflationAnomalies);

      IQRALogger.info(`🔍 [REWARD_ANALYZER] Detected ${anomalies.length} reward anomalies`);
      return anomalies;
    } catch (error) {
      IQRALogger.error('❌ [REWARD_ANALYZER] Failed to detect anomalies:', error);
      return [];
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizations(): Promise<FlowOptimization[]> {
    const metrics = await this.analyzeRewardFlow();
    const anomalies = await this.detectAnomalies();
    const optimizations: FlowOptimization[] = [];

    // Worker performance optimization
    const lowPerformingWorkers = Object.entries(metrics.worker_performance)
      .filter(([_, perf]) => perf.average_reward < metrics.average_reward * 0.8)
      .map(([workerId, _]) => workerId);

    if (lowPerformingWorkers.length > 0) {
      optimizations.push({
        area: 'Worker Performance',
        current_performance: metrics.average_reward * 0.8,
        target_performance: metrics.average_reward,
        actions: [
          `Review and optimize ${lowPerformingWorkers.join(', ')} workers`,
          'Provide additional training or resources',
          'Adjust reward calculation parameters'
        ],
        expected_impact: 'Increase overall reward efficiency by 15-25%'
      });
    }

    // Discovery distribution optimization
    const lowDiscoveryRate = metrics.discovery_distribution[DiscoveryLevel.SEED] / 
      Object.values(metrics.discovery_distribution).reduce((a, b) => a + b, 0);

    if (lowDiscoveryRate > 0.6) {
      optimizations.push({
        area: 'Discovery Quality',
        current_performance: lowDiscoveryRate,
        target_performance: 0.3,
        actions: [
          'Enhance novelty detection algorithms',
          'Improve research phase coordination',
          'Adjust discovery level thresholds'
        ],
        expected_impact: 'Increase high-value discoveries by 30%'
      });
    }

    // Temporal pattern optimization
    const recentTemporalData = metrics.temporal_patterns.slice(-7);
    if (recentTemporalData.length > 0) {
      const avgRecentReward = recentTemporalData.reduce((sum, d) => sum + d.total_reward, 0) / recentTemporalData.length;
      const overallAvg = metrics.temporal_patterns.reduce((sum, d) => sum + d.total_reward, 0) / metrics.temporal_patterns.length;

      if (avgRecentReward < overallAvg * 0.8) {
        optimizations.push({
          area: 'Reward Velocity',
          current_performance: avgRecentReward,
          target_performance: overallAvg,
          actions: [
            'Investigate recent performance decline',
            'Check for system bottlenecks',
            'Optimize reward calculation pipeline'
          ],
          expected_impact: 'Restore reward velocity to baseline levels'
        });
      }
    }

    // Anomaly-driven optimizations
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high') {
        optimizations.push({
          area: `Anomaly Resolution: ${anomaly.type}`,
          current_performance: 0,
          target_performance: 100,
          actions: [anomaly.recommendation],
          expected_impact: 'Resolve critical reward system issues'
        });
      }
    }

    return optimizations;
  }

  /**
   * Get real-time reward flow status
   */
  async getRealTimeStatus(): Promise<{
    active_workers: number;
    rewards_last_hour: number;
    avg_reward_last_hour: number;
    discovery_trend: 'increasing' | 'decreasing' | 'stable';
    system_health: 'healthy' | 'warning' | 'critical';
  }> {
    const entries = await RewardLedger.getAll();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    const recentEntries = entries.filter(e => e.timestamp > oneHourAgo);
    const rewardsLastHour = recentEntries.reduce((sum, e) => sum + e.total_reward, 0);
    const avgRewardLastHour = recentEntries.length > 0 ? rewardsLastHour / recentEntries.length : 0;
    
    // Calculate discovery trend
    const discoveryTrend = this.calculateDiscoveryTrend(entries);
    
    // Determine system health
    const systemHealth = this.determineSystemHealth(recentEntries, avgRewardLastHour);
    
    const activeWorkers = new Set(recentEntries.map(e => e.worker_id)).size;

    return {
      active_workers: activeWorkers,
      rewards_last_hour: rewardsLastHour,
      avg_reward_last_hour: avgRewardLastHour,
      discovery_trend: discoveryTrend,
      system_health: systemHealth
    };
  }

  /**
   * Calculate comprehensive metrics
   */
  private calculateMetrics(entries: RewardEntry[]): RewardFlowMetrics {
    if (entries.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalRewards = entries.reduce((sum, e) => sum + e.total_reward, 0);
    const averageReward = totalRewards / entries.length;

    // Discovery distribution
    const discoveryDistribution = {
      [DiscoveryLevel.SEED]: 0,
      [DiscoveryLevel.SPROUT]: 0,
      [DiscoveryLevel.BRANCH]: 0,
      [DiscoveryLevel.TREE]: 0,
      [DiscoveryLevel.RESONANCE]: 0
    };

    entries.forEach(entry => {
      discoveryDistribution[entry.discovery_level]++;
    });

    // Worker performance
    const workerPerformance: Record<string, any> = {};
    const workerStats = new Map<string, {
      rewards: number[];
      discoveryLevels: DiscoveryLevel[];
      successes: number;
      total: number;
    }>();

    entries.forEach(entry => {
      if (!workerStats.has(entry.worker_id)) {
        workerStats.set(entry.worker_id, {
          rewards: [],
          discoveryLevels: [],
          successes: 0,
          total: 0
        });
      }
      
      const stats = workerStats.get(entry.worker_id)!;
      stats.rewards.push(entry.total_reward);
      stats.discoveryLevels.push(entry.discovery_level);
      stats.total++;
      
      if (entry.validation_status === 'verified') {
        stats.successes++;
      }
    });

    for (const [workerId, stats] of Array.from(workerStats.entries())) {
      const workerDiscoveryDist = { ...discoveryDistribution };
      stats.discoveryLevels.forEach((level: DiscoveryLevel) => {
        workerDiscoveryDist[level]++;
      });

      workerPerformance[workerId] = {
        total_rewards: stats.rewards.reduce((a: number, b: number) => a + b, 0),
        average_reward: stats.rewards.reduce((a: number, b: number) => a + b, 0) / stats.rewards.length,
        success_rate: stats.successes / stats.total,
        discovery_levels: workerDiscoveryDist
      };
    }

    // Temporal patterns
    const temporalPatterns = this.calculateTemporalPatterns(entries);

    // Efficiency metrics
    const uniqueMissions = new Set(entries.map(e => e.mission_id)).size;
    const rewardsPerMission = entries.length / Math.max(uniqueMissions, 1);
    const discoveryRate = entries.filter(e => 
      e.discovery_level === DiscoveryLevel.TREE || e.discovery_level === DiscoveryLevel.RESONANCE
    ).length / entries.length;
    
    const timeSpan = Math.max(1, (Math.max(...entries.map(e => e.timestamp)) - 
      Math.min(...entries.map(e => e.timestamp))) / (1000 * 60 * 60)); // hours
    const rewardVelocity = entries.length / timeSpan;

    return {
      total_rewards: totalRewards,
      average_reward: averageReward,
      discovery_distribution: discoveryDistribution,
      worker_performance: workerPerformance,
      temporal_patterns: temporalPatterns,
      efficiency_metrics: {
        rewards_per_mission: rewardsPerMission,
        discovery_rate: discoveryRate,
        reward_velocity: rewardVelocity
      }
    };
  }

  /**
   * Detect high reward anomalies
   */
  private detectHighRewardAnomalies(entries: RewardEntry[]): RewardAnomaly[] {
    const anomalies: RewardAnomaly[] = [];
    const rewards = entries.map(e => e.total_reward);
    const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
    const stdDev = Math.sqrt(rewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rewards.length);
    const threshold = mean + 2 * stdDev;

    entries.forEach(entry => {
      if (entry.total_reward > threshold) {
        anomalies.push({
          type: 'unusually_high_reward',
          description: `Worker ${entry.worker_id} received unusually high reward: ${entry.total_reward.toFixed(2)}`,
          severity: entry.total_reward > mean + 3 * stdDev ? 'high' : 'medium',
          timestamp: entry.timestamp,
          data: { entry, threshold, mean },
          recommendation: 'Review reward calculation parameters for this worker'
        });
      }
    });

    return anomalies;
  }

  /**
   * Detect low reward anomalies
   */
  private detectLowRewardAnomalies(entries: RewardEntry[]): RewardAnomaly[] {
    const anomalies: RewardAnomaly[] = [];
    const rewards = entries.map(e => e.total_reward);
    const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
    const stdDev = Math.sqrt(rewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rewards.length);
    const threshold = Math.max(0, mean - 2 * stdDev);

    entries.forEach(entry => {
      if (entry.total_reward < threshold && entry.total_reward > 0) {
        anomalies.push({
          type: 'unusually_low_reward',
          description: `Worker ${entry.worker_id} received unusually low reward: ${entry.total_reward.toFixed(2)}`,
          severity: entry.total_reward < mean - 3 * stdDev ? 'high' : 'medium',
          timestamp: entry.timestamp,
          data: { entry, threshold, mean },
          recommendation: 'Investigate potential issues with worker performance or reward calculation'
        });
      }
    });

    return anomalies;
  }

  /**
   * Detect stagnant discovery patterns
   */
  private detectStagnantDiscovery(entries: RewardEntry[]): RewardAnomaly[] {
    const anomalies: RewardAnomaly[] = [];
    const recentEntries = entries.filter(e => e.timestamp > Date.now() - 24 * 60 * 60 * 1000); // Last 24h
    
    if (recentEntries.length > 0) {
      const highDiscoveryCount = recentEntries.filter(e => 
        e.discovery_level === DiscoveryLevel.TREE || e.discovery_level === DiscoveryLevel.RESONANCE
      ).length;
      
      const highDiscoveryRate = highDiscoveryCount / recentEntries.length;
      
      if (highDiscoveryRate < 0.1) { // Less than 10% high discoveries
        anomalies.push({
          type: 'stagnant_discovery',
          description: `Low high-value discovery rate: ${(highDiscoveryRate * 100).toFixed(1)}%`,
          severity: highDiscoveryRate < 0.05 ? 'high' : 'medium',
          timestamp: Date.now(),
          data: { highDiscoveryRate, totalEntries: recentEntries.length },
          recommendation: 'Enhance novelty detection and research coordination'
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect reward inflation
   */
  private detectRewardInflation(entries: RewardEntry[]): RewardAnomaly[] {
    const anomalies: RewardAnomaly[] = [];
    
    // Group by day and calculate average rewards
    const dailyRewards = new Map<string, number[]>();
    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!dailyRewards.has(date)) {
        dailyRewards.set(date, []);
      }
      dailyRewards.get(date)!.push(entry.total_reward);
    });

    const dailyAverages = Array.from(dailyRewards.entries()).map(([date, rewards]) => ({
      date,
      avg: rewards.reduce((a, b) => a + b, 0) / rewards.length
    }));

    if (dailyAverages.length > 7) {
      const recentAvg = dailyAverages.slice(-7).reduce((sum, d) => sum + d.avg, 0) / 7;
      const olderAvg = dailyAverages.slice(-14, -7).reduce((sum, d) => sum + d.avg, 0) / 7;
      
      if (recentAvg > olderAvg * 1.5) {
        anomalies.push({
          type: 'reward_inflation',
          description: `Reward inflation detected: recent average ${(recentAvg / olderAvg).toFixed(2)}x older average`,
          severity: recentAvg > olderAvg * 2 ? 'high' : 'medium',
          timestamp: Date.now(),
          data: { recentAvg, olderAvg, dailyAverages },
          recommendation: 'Review reward calculation parameters and adjust thresholds'
        });
      }
    }

    return anomalies;
  }

  /**
   * Calculate temporal patterns
   */
  private calculateTemporalPatterns(entries: RewardEntry[]): Array<{
    date: string;
    rewards_count: number;
    total_reward: number;
    avg_discovery_level: number;
  }> {
    const dailyData = new Map<string, {
      count: number;
      totalReward: number;
      discoveryLevels: number[];
    }>();

    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { count: 0, totalReward: 0, discoveryLevels: [] });
      }
      
      const data = dailyData.get(date)!;
      data.count++;
      data.totalReward += entry.total_reward;
      data.discoveryLevels.push(this.getDiscoveryLevelValue(entry.discovery_level));
    });

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      rewards_count: data.count,
      total_reward: data.totalReward,
      avg_discovery_level: data.discoveryLevels.reduce((a, b) => a + b, 0) / data.discoveryLevels.length
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get discovery level numeric value
   */
  private getDiscoveryLevelValue(level: DiscoveryLevel): number {
    switch (level) {
      case DiscoveryLevel.SEED: return 1;
      case DiscoveryLevel.SPROUT: return 2;
      case DiscoveryLevel.BRANCH: return 3;
      case DiscoveryLevel.TREE: return 4;
      case DiscoveryLevel.RESONANCE: return 5;
      default: return 0;
    }
  }

  /**
   * Calculate discovery trend
   */
  private calculateDiscoveryTrend(entries: RewardEntry[]): 'increasing' | 'decreasing' | 'stable' {
    const recentEntries = entries.slice(-20); // Last 20 entries
    if (recentEntries.length < 10) return 'stable';

    const recentDiscoveryLevels = recentEntries.map(e => this.getDiscoveryLevelValue(e.discovery_level));
    const firstHalf = recentDiscoveryLevels.slice(0, Math.floor(recentDiscoveryLevels.length / 2));
    const secondHalf = recentDiscoveryLevels.slice(Math.floor(recentDiscoveryLevels.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.1) return 'increasing';
    if (secondAvg < firstAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  /**
   * Determine system health
   */
  private determineSystemHealth(recentEntries: RewardEntry[], avgReward: number): 'healthy' | 'warning' | 'critical' {
    if (recentEntries.length === 0) return 'critical';
    if (avgReward < 0.1) return 'critical';
    if (avgReward < 0.3) return 'warning';
    return 'healthy';
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(): RewardFlowMetrics {
    return {
      total_rewards: 0,
      average_reward: 0,
      discovery_distribution: {
        [DiscoveryLevel.SEED]: 0,
        [DiscoveryLevel.SPROUT]: 0,
        [DiscoveryLevel.BRANCH]: 0,
        [DiscoveryLevel.TREE]: 0,
        [DiscoveryLevel.RESONANCE]: 0
      },
      worker_performance: {},
      temporal_patterns: [],
      efficiency_metrics: {
        rewards_per_mission: 0,
        discovery_rate: 0,
        reward_velocity: 0
      }
    };
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.lastAnalysis = 0;
    IQRALogger.info('🧹 [REWARD_ANALYZER] Cache cleared');
  }
}
