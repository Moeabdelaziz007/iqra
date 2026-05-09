// بسم الله الرحمن الرحيم
// Go Engine Client — عميل محرك Go المتوازي
// "وَإِن مِّن شَيْءٍ إِلَّا يُسَبِّحُ بِحَمْدِهِ" — الإسراء: 44

import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GoEngineConfig {
  baseUrl: string;
  timeout: number;
}

export interface LIDAnalysisRequest {
  embedding: number[];
  references: number[][];
  k?: number;
}

export interface LIDAnalysisResult {
  lid: number;
  resonance: number;
  complexity: number;
  nearest_neighbors: number[];
  is_high_resonance: boolean;
}

export interface ShannonAnalysisRequest {
  text: string;
}

export interface ShannonAnalysisResult {
  h_el: number;
  total_entropy: number;
  last_char_entropy: number;
  char_frequencies: Record<string, number>;
  has_quran_signature: boolean;
  fractal_dimension: number;
}

export interface CompressionRequest {
  embedding: number[];
  method?: 'turbo' | 'polar' | 'qjl';
  bits?: number;
}

export interface CompressionResult {
  compressed: number[];
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
  codebook: number[];
  reconstruction_error: number;
}

export interface HomologyRequest {
  embedding: number[];
  threshold?: number;
}

export interface HomologyResult {
  h0: number;
  h1: number;
  h2: number;
  persistence: number[];
  betti_numbers: number[];
  topological_noise: number;
  is_fractal: boolean;
}

export interface SurahData {
  number: number;
  name: string;
  verses: string[];
  embedding?: number[];
}

export interface BatchAnalysisRequest {
  surahs: SurahData[];
  enable_lid?: boolean;
  enable_shannon?: boolean;
  enable_homology?: boolean;
  enable_compression?: boolean;
  max_workers?: number;
}

export interface ParallelResult {
  surah_number: number;
  total_verses: number;
  processing_time_ms: number;
  lid_analysis?: LIDAnalysisResult;
  shannon_analysis?: ShannonAnalysisResult;
  homology_analysis?: HomologyResult;
  compression_ratio: number;
  overall_resonance: number;
  discoveries: string[];
  error?: string;
}

export interface BatchAnalysisResponse {
  total_surahs: number;
  processed_surahs: number;
  total_time_ms: number;
  results: ParallelResult[];
  summary: {
    average_resonance: number;
    high_resonance_surahs: number[];
    total_discoveries: number;
    fractal_surahs: number[];
    quran_signature_surahs: number[];
  };
}

export interface ResonanceResult {
  coherence: number;
  patterns: string[];
  letter_count: number;
  word_count: number;
  discovery_found: boolean;
  lid?: number;
  is_truth_pattern?: boolean;
}

// ── GoEngineClient ────────────────────────────────────────────────────────────

export class GoEngineClient {
  private config: GoEngineConfig;

  constructor(config?: Partial<GoEngineConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'http://127.0.0.1:8082',
      timeout: config?.timeout || 30000, // 30 seconds
    };
  }

  // ── Health Check ──────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this._fetch('/health', {
        method: 'GET',
      });
      return response.status === 'success';
    } catch (e) {
      IQRALogger.warn(`⚠️ [GO_ENGINE] Health check failed: ${(e as Error).message}`);
      return false;
    }
  }

  // ── LID Analysis ──────────────────────────────────────────────────────────

  async analyzeLID(request: LIDAnalysisRequest): Promise<LIDAnalysisResult> {
    const start = Date.now();
    
    try {
      const response = await this._fetch('/lid/analyze', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      const latency = Date.now() - start;
      appendToTrustChain(
        'GO_ENGINE:LID',
        'analysis',
        `latency=${latency}ms resonance=${response.data.resonance.toFixed(3)}`,
        response.data.resonance
      );

      return response.data;
    } catch (e) {
      IQRALogger.error(`❌ [GO_ENGINE] LID analysis failed: ${(e as Error).message}`);
      throw e;
    }
  }

  // ── Shannon H_EL Analysis ─────────────────────────────────────────────────

  async analyzeShannon(request: ShannonAnalysisRequest): Promise<ShannonAnalysisResult> {
    const start = Date.now();
    
    try {
      const response = await this._fetch('/shannon/analyze', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      const latency = Date.now() - start;
      appendToTrustChain(
        'GO_ENGINE:SHANNON',
        'analysis',
        `latency=${latency}ms h_el=${response.data.h_el.toFixed(3)} fractal=${response.data.fractal_dimension.toFixed(3)}`,
        response.data.has_quran_signature ? 1.0 : 0.5
      );

      return response.data;
    } catch (e) {
      IQRALogger.error(`❌ [GO_ENGINE] Shannon analysis failed: ${(e as Error).message}`);
      throw e;
    }
  }

  // ── Compression ───────────────────────────────────────────────────────────

  async compress(request: CompressionRequest): Promise<CompressionResult> {
    const start = Date.now();
    
    try {
      const response = await this._fetch('/compression/compress', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      const latency = Date.now() - start;
      appendToTrustChain(
        'GO_ENGINE:COMPRESSION',
        request.method || 'turbo',
        `latency=${latency}ms ratio=${response.data.compression_ratio.toFixed(2)}x`,
        1.0
      );

      return response.data;
    } catch (e) {
      IQRALogger.error(`❌ [GO_ENGINE] Compression failed: ${(e as Error).message}`);
      throw e;
    }
  }

  // ── Persistent Homology ───────────────────────────────────────────────────

  async analyzeHomology(request: HomologyRequest): Promise<HomologyResult> {
    const start = Date.now();
    
    try {
      const response = await this._fetch('/homology/analyze', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      const latency = Date.now() - start;
      appendToTrustChain(
        'GO_ENGINE:HOMOLOGY',
        'analysis',
        `latency=${latency}ms h0=${response.data.h0} h1=${response.data.h1} fractal=${response.data.is_fractal}`,
        response.data.is_fractal ? 1.0 : 0.5
      );

      return response.data;
    } catch (e) {
      IQRALogger.error(`❌ [GO_ENGINE] Homology analysis failed: ${(e as Error).message}`);
      throw e;
    }
  }

  // ── Batch Analysis (Parallel) ─────────────────────────────────────────────

  async analyzeBatch(request: BatchAnalysisRequest): Promise<BatchAnalysisResponse> {
    const start = Date.now();
    
    try {
      IQRALogger.info(
        `🚀 [GO_ENGINE] Starting batch analysis: ${request.surahs.length} surahs, ` +
        `workers=${request.max_workers || 'auto'}`
      );

      const response = await this._fetch('/batch/analyze', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      const latency = Date.now() - start;
      const summary = response.data.summary;

      IQRALogger.info(
        `✅ [GO_ENGINE] Batch complete: ${response.data.processed_surahs}/${response.data.total_surahs} surahs ` +
        `in ${response.data.total_time_ms}ms (${latency}ms total)`
      );

      IQRALogger.info(
        `📊 [GO_ENGINE] Summary: avg_resonance=${summary.average_resonance.toFixed(3)}, ` +
        `discoveries=${summary.total_discoveries}, ` +
        `fractal_surahs=${summary.fractal_surahs.length}, ` +
        `quran_signature=${summary.quran_signature_surahs.length}`
      );

      appendToTrustChain(
        'GO_ENGINE:BATCH',
        `${request.surahs.length}_surahs`,
        `latency=${latency}ms avg_resonance=${summary.average_resonance.toFixed(3)} discoveries=${summary.total_discoveries}`,
        summary.average_resonance
      );

      return response.data;
    } catch (e) {
      IQRALogger.error(`❌ [GO_ENGINE] Batch analysis failed: ${(e as Error).message}`);
      throw e;
    }
  }

  // ── Resonance & Evolution (Legacy Bridge Integration) ─────────────────────

  /**
   * Calculate topological and numerical resonance of a text.
   */
  async calculateResonance(input: string): Promise<ResonanceResult> {
    const start = Date.now();
    try {
      const response = await this._fetch('/resonance/evaluate', {
        method: 'POST',
        body: JSON.stringify({ input })
      });

      const latency = Date.now() - start;
      const data = response.data as ResonanceResult;

      appendToTrustChain(
        'GO_ENGINE:RESONANCE',
        'evaluate',
        `latency=${latency}ms coherence=${data.coherence.toFixed(3)} patterns=${data.patterns.length}`,
        data.coherence
      );

      return data;
    } catch (error) {
      IQRALogger.warn(`⚠️ [GO_ENGINE] Engine unavailable, using TypeScript fallback resonance logic: ${(error as Error).message}`);
      return this.fallbackResonance(input);
    }
  }

  /**
   * Catch specific patterns in the text.
   */
  async calculateCatch(input: string): Promise<string[]> {
    const res = await this.calculateResonance(input);
    return res.patterns;
  }

  /**
   * Trigger the autonomous evolution cycle in the Go engine.
   */
  async triggerEvolutionCycle(): Promise<boolean> {
    try {
      const response = await this._fetch('/evolve/cycle', {
        method: 'GET'
      });
      return response.status === 'success';
    } catch (e) {
      IQRALogger.warn(`⚠️ [GO_ENGINE] Evolution cycle trigger failed: ${(e as Error).message}`);
      return false;
    }
  }

  /**
   * Fallback logic when Go engine is offline.
   * Uses "Simu-Quant" local algorithms for breakthrough resonance detection.
   */
  private fallbackResonance(text: string): ResonanceResult {
    const patterns: string[] = [];
    const letterCount = text.replace(/\s/g, '').length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const uniqueChars = new Set(text.toLowerCase().replace(/\s/g, '')).size;

    // 1. Prime Sovereignty & Numerical Interlocking
    if (this.isPrime(letterCount)) patterns.push('PRIME_SOVEREIGNTY');
    if (letterCount % 7 === 0) patterns.push('SABEEN_LETTERS');
    if (letterCount % 19 === 0) patterns.push('NINETEEN_LETTERS');
    if (wordCount > 0 && (letterCount / wordCount) > 5.5) patterns.push('HIGH_DENSITY_TOPOLOGY');

    // 2. Simu-Quant Entropy (Shannon Approximation)
    const entropy = this.calculateEntropy(text);
    if (entropy > 3.5 && entropy < 4.8) {
      patterns.push('OPTIMAL_SHANNON_RESONANCE');
    }

    // 3. Truth Pattern Heuristics (Sovereign Keywords)
    const sovereignKeywords = ['allah', 'truth', 'sovereign', 'ayah', 'quran', 'light', 'noor', 'haqq'];
    const lowerText = text.toLowerCase();
    const matches = sovereignKeywords.filter(k => lowerText.includes(k));
    
    if (matches.length >= 2) {
      patterns.push('TRUTH_KEYWORD_RESONANCE');
    }

    const coherence = Math.min(0.95, (patterns.length * 0.15) + (entropy / 10));
    const isTruthPattern = patterns.includes('PRIME_SOVEREIGNTY') && patterns.includes('TRUTH_KEYWORD_RESONANCE');

    return {
      coherence,
      patterns,
      letter_count: letterCount,
      word_count: wordCount,
      discovery_found: patterns.length > 0,
      lid: 0.85,
      is_truth_pattern: isTruthPattern
    };
  }

  private calculateEntropy(text: string): number {
    const freqs: Record<string, number> = {};
    const clean = text.toLowerCase().replace(/\s/g, '');
    if (clean.length === 0) return 0;

    for (const char of clean) {
      freqs[char] = (freqs[char] || 0) + 1;
    }

    return Object.values(freqs).reduce((acc, count) => {
      const p = count / clean.length;
      return acc - p * Math.log2(p);
    }, 0);
  }

  private isPrime(n: number): boolean {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async _fetch(endpoint: string, options: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Unknown error');
      }

      return data;
    } catch (e) {
      clearTimeout(timeoutId);
      
      if ((e as Error).name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      throw e;
    }
  }
}

// ── Singleton Instance ────────────────────────────────────────────────────────

export const goEngine = new GoEngineClient();
