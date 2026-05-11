// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🚀 GoEngineProximity — واجهة القرب للمحرك المتوازي
 *
 * "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ" — الأنبياء: 107
 *
 * ══════════════════════════════════════════════════════════════
 * [PROXIMITY] 2026-05-10: Created as canonical wrapper for Go engine
 *
 * This is the PROXIMITY layer - a unified interface to the Go engine
 * that enforces mathematical truth and eliminates fake fallbacks.
 *
 * The Go engine provides:
 *   - LID (Local Intrinsic Dimensionality) analysis
 *   - Shannon H_EL entropy calculation
 *   - Persistent Homology (H0, H1, H2)
 *   - Vector compression (Turbo, Polar, QJL)
 *   - Batch parallel processing
 *   - Topological resonance evaluation
 *
 * This wrapper ensures:
 *   - No fallbacks - Go engine is REQUIRED for truth
 *   - Consistent error handling
 *   - TrustChain logging for all operations
 *   - Health check before operations
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';
import { GoEngineClient, type GoEngineConfig, type LIDAnalysisRequest, type LIDAnalysisResult, type ShannonAnalysisRequest, type ShannonAnalysisResult, type CompressionRequest, type CompressionResult, type HomologyRequest, type HomologyResult, type BatchAnalysisRequest, type BatchAnalysisResponse, type ResonanceResult } from './go_engine_client';

export class GoEngineProximity {
  private static _client: GoEngineClient | null = null;
  private static _isHealthy: boolean = false;
  private static _lastHealthCheck: number = 0;
  private static readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Initialize the Go engine client
   */
  static async initialize(config?: Partial<GoEngineConfig>): Promise<boolean> {
    if (this._client) {
      IQRALogger.info('✅ [PROXIMITY] Already initialized');
      return true;
    }

    try {
      this._client = new GoEngineClient(config);
      this._isHealthy = await this._client.healthCheck();
      this._lastHealthCheck = Date.now();

      if (this._isHealthy) {
        IQRALogger.info('🚀 [PROXIMITY] Go engine initialized and healthy');
        appendToTrustChain('PROXIMITY:INIT', 'go_engine', 'healthy=true', 1.0);
      } else {
        IQRALogger.warn('⚠️ [PROXIMITY] Go engine initialized but unhealthy');
        appendToTrustChain('PROXIMITY:INIT', 'go_engine', 'healthy=false', 0.5);
      }

      return this._isHealthy;
    } catch (error) {
      IQRALogger.error(`❌ [PROXIMITY] Initialization failed: ${(error as Error).message}`);
      appendToTrustChain('PROXIMITY:INIT', 'go_engine', 'failed', 0.0);
      return false;
    }
  }

  /**
   * Check if Go engine is healthy
   */
  static async checkHealth(): Promise<boolean> {
    if (!this._client) {
      IQRALogger.warn('⚠️ [PROXIMITY] Not initialized');
      return false;
    }

    const now = Date.now();
    if (now - this._lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return this._isHealthy;
    }

    this._isHealthy = await this._client.healthCheck();
    this._lastHealthCheck = now;
    return this._isHealthy;
  }

  /**
   * Get the underlying client (for direct access if needed)
   */
  static getClient(): GoEngineClient {
    if (!this._client) {
      throw new Error('GoEngineProximity not initialized. Call initialize() first.');
    }
    return this._client;
  }

  /**
   * Ensure health before operation - throws if unhealthy
   */
  private static async ensureHealth(): Promise<void> {
    const healthy = await this.checkHealth();
    if (!healthy) {
      throw new Error('Go engine is unhealthy. Cannot proceed with operation.');
    }
  }

  // ── LID Analysis ──────────────────────────────────────────────────────────

  /**
   * Analyze Local Intrinsic Dimensionality
   * [PROXIMITY] No fallback - Go engine required
   */
  static async analyzeLID(request: LIDAnalysisRequest): Promise<LIDAnalysisResult> {
    await this.ensureHealth();
    return this._client!.analyzeLID(request);
  }

  // ── Shannon Analysis ───────────────────────────────────────────────────────

  /**
   * Analyze Shannon H_EL entropy
   * [PROXIMITY] No fallback - Go engine required
   */
  static async analyzeShannon(request: ShannonAnalysisRequest): Promise<ShannonAnalysisResult> {
    await this.ensureHealth();
    return this._client!.analyzeShannon(request);
  }

  // ── Compression ───────────────────────────────────────────────────────────

  /**
   * Compress vector embeddings
   * [PROXIMITY] No fallback - Go engine required
   */
  static async compress(request: CompressionRequest): Promise<CompressionResult> {
    await this.ensureHealth();
    return this._client!.compress(request);
  }

  // ── Homology ─────────────────────────────────────────────────────────────

  /**
   * Analyze persistent homology
   * [PROXIMITY] No fallback - Go engine required
   */
  static async analyzeHomology(request: HomologyRequest): Promise<HomologyResult> {
    await this.ensureHealth();
    return this._client!.analyzeHomology(request);
  }

  // ── Batch Analysis ────────────────────────────────────────────────────────

  /**
   * Batch analysis of multiple surahs
   * [PROXIMITY] No fallback - Go engine required
   */
  static async analyzeBatch(request: BatchAnalysisRequest): Promise<BatchAnalysisResponse> {
    await this.ensureHealth();
    return this._client!.analyzeBatch(request);
  }

  // ── Resonance ─────────────────────────────────────────────────────────────

  /**
   * Calculate topological resonance
   * [PROXIMITY] No fallback - Go engine required for mathematical truth
   */
  static async calculateResonance(input: string): Promise<ResonanceResult> {
    await this.ensureHealth();
    return this._client!.calculateResonance(input);
  }

  /**
   * Catch patterns from resonance analysis
   * [PROXIMITY] No fallback - Go engine required
   */
  static async calculateCatch(input: string): Promise<string[]> {
    await this.ensureHealth();
    return this._client!.calculateCatch(input);
  }

  // ── Evolution ─────────────────────────────────────────────────────────────

  /**
   * Trigger autonomous evolution cycle
   * [PROXIMITY] No fallback - Go engine required
   */
  static async triggerEvolutionCycle(): Promise<boolean> {
    await this.ensureHealth();
    return this._client!.triggerEvolutionCycle();
  }
}

// ── Export singleton instance for backward compatibility ─────────────────────

export const goEngine = {
  // Proxy to GoEngineProximity for existing code
  calculateResonance: (input: string) => GoEngineProximity.calculateResonance(input),
  calculateCatch: (input: string) => GoEngineProximity.calculateCatch(input),
  analyzeLID: (req: LIDAnalysisRequest) => GoEngineProximity.analyzeLID(req),
  analyzeShannon: (req: ShannonAnalysisRequest) => GoEngineProximity.analyzeShannon(req),
  compress: (req: CompressionRequest) => GoEngineProximity.compress(req),
  analyzeHomology: (req: HomologyRequest) => GoEngineProximity.analyzeHomology(req),
  analyzeBatch: (req: BatchAnalysisRequest) => GoEngineProximity.analyzeBatch(req),
  triggerEvolutionCycle: () => GoEngineProximity.triggerEvolutionCycle(),
  healthCheck: () => GoEngineProximity.checkHealth(),
};
