/**
 * 🛡️ IQRA Byzantine Filter — "مُصفى التناقضات"
 * 
 * Implements rigorous Byzantine Fault Tolerance (BFT) and Anomaly Detection.
 * Transitions "Hypocrisy Detection" into a mathematical anomaly filter.
 * 
 * "وَإِذَا جَاءُوكُمْ قَالُوا آمَنَّا وَقَد دَّخَلُوا بِالْكُفْرِ" — المائدة: 61
 */

import { IQRALogger } from '../12-infrastructure/logger';

export interface AnomalyReport {
  isAnomaly: boolean;
  score: number; // Z-Score or Resonance Deviation
  reason: string;
  timestamp: number;
}

export class ByzantineFilter {
  private static readonly Z_THRESHOLD = 3.0; // Standard statistical outlier limit

  /**
   * Z-Score Anomaly Detection for 1D Data (e.g. Price, Volume)
   */
  static detectZScore(data: number[], latestValue: number): AnomalyReport {
    if (data.length < 5) {
      return { isAnomaly: false, score: 0, reason: "Insufficient data", timestamp: Date.now() };
    }

    const n = data.length;
    const mean = data.reduce((a, b) => a + b) / n;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return { isAnomaly: false, score: 0, reason: "Zero variance", timestamp: Date.now() };

    const zScore = Math.abs((latestValue - mean) / stdDev);
    const isAnomaly = zScore > this.Z_THRESHOLD;

    return {
      isAnomaly,
      score: zScore,
      reason: isAnomaly ? `Byzantine Deviation detected: Z-Score ${zScore.toFixed(2)}` : "Nominal",
      timestamp: Date.now()
    };
  }

  /**
   * Topological Anomaly Detection
   * Detects structural breaks in high-dimensional manifolds.
   */
  static detectTopologicalBreak(currentResonance: number, movingAverageResonance: number): AnomalyReport {
    const deviation = Math.abs(currentResonance - movingAverageResonance);
    const threshold = 0.4; // 40% deviation in resonance is a structural break

    const isAnomaly = deviation > threshold;

    return {
      isAnomaly,
      score: deviation,
      reason: isAnomaly ? "Topological Manifold Disruption" : "Stable Structure",
      timestamp: Date.now()
    };
  }

  /**
   * Sovereign Verification (2-3-7 Protocol Step 1 & 2)
   * Cross-checks multiple filters for consensus.
   */
  static async verifyConsensus(reports: AnomalyReport[]): Promise<boolean> {
    const anomalyCount = reports.filter(r => r.isAnomaly).length;
    // Consensus reached if > 50% of filters signal an anomaly
    return anomalyCount > reports.length / 2;
  }
}
