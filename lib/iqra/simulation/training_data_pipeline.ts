/**
 * Training Data Pipeline — خط أنابيب بيانات التدريب
 * 
 * Exports high-quality training data from MCTS simulations
 * Formats data for fine-tuning language models
 * 
 * "وَعَلَّمَكَ مَا لَمْ تَكُنْ تَعْلَمُ" — البقرة: 239
 */

import * as fs from 'fs';
import * as path from 'path';
import { SimulationResult, MCTSNode } from './mcts_engine';

export interface TrainingDataPoint {
  id: string;
  input: string;
  action: any;
  output: string;
  resonance: number;
  entropy: number;
  patterns: string[];
  quality_score: number;
  timestamp: number;
  metadata?: {
    depth: number;
    node_id: string;
    parent_id?: string;
    visits: number;
    path_length: number;
  };
}

export interface TrainingDataConfig {
  outputPath: string;
  format: 'jsonl' | 'json' | 'csv';
  qualityThreshold: number;
  resonanceThreshold: number;
  maxEntries: number;
  includeMetadata: boolean;
  compressionEnabled: boolean;
}

export class TrainingDataPipeline {
  private config: TrainingDataConfig;
  private trainingData: TrainingDataPoint[] = [];

  constructor(config: Partial<TrainingDataConfig> = {}) {
    this.config = {
      outputPath: path.join(process.cwd(), '.iqra', 'training_data.jsonl'),
      format: 'jsonl',
      qualityThreshold: 0.6,
      resonanceThreshold: 0.7,
      maxEntries: 10000,
      includeMetadata: true,
      compressionEnabled: false,
      ...config
    };
  }

  /**
   * Process simulation result and extract training data
   */
  async processSimulationResult(result: SimulationResult): Promise<TrainingDataPoint[]> {
    const trainingPoints: TrainingDataPoint[] = [];
    
    // Extract data from high quality nodes
    for (const node of result.highQualityNodes) {
      if (node.state.resonance >= this.config.resonanceThreshold) {
        const point = this.createTrainingPoint(node);
        if (point.quality_score >= this.config.qualityThreshold) {
          trainingPoints.push(point);
        }
      }
    }
    
    // Add existing training data from simulation
    for (const data of result.trainingData) {
      if (data.resonance >= this.config.resonanceThreshold) {
        const point = this.convertLegacyTrainingData(data);
        trainingPoints.push(point);
      }
    }
    
    // Sort by quality score and apply limit
    trainingPoints.sort((a, b) => b.quality_score - a.quality_score);
    const limitedPoints = trainingPoints.slice(0, this.config.maxEntries);
    
    // Add to internal storage
    this.trainingData.push(...limitedPoints);
    
    // Limit internal storage
    if (this.trainingData.length > this.config.maxEntries) {
      this.trainingData = this.trainingData.slice(-this.config.maxEntries);
    }
    
    console.log(`📚 [TRAINING] Extracted ${limitedPoints.length} training points from simulation`);
    return limitedPoints;
  }

  /**
   * Create training point from MCTS node
   */
  private createTrainingPoint(node: MCTSNode): TrainingDataPoint {
    const path = node.getPath();
    const parent = node.parent;
    
    return {
      id: `training_${node.id}`,
      input: parent ? parent.state.content : '',
      action: node.action,
      output: node.state.content,
      resonance: node.state.resonance,
      entropy: node.state.entropy,
      patterns: node.state.patterns,
      quality_score: node.getQualityScore(),
      timestamp: Date.now(),
      metadata: {
        depth: node.getDepth(),
        node_id: node.id,
        parent_id: parent?.id,
        visits: node.visits,
        path_length: path.length
      }
    };
  }

  /**
   * Convert legacy training data format
   */
  private convertLegacyTrainingData(data: any): TrainingDataPoint {
    return {
      id: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input: data.input || '',
      action: data.action,
      output: data.output,
      resonance: data.resonance,
      entropy: data.entropy || 0,
      patterns: data.patterns || [],
      quality_score: this.calculateQualityScore(data),
      timestamp: data.timestamp || Date.now()
    };
  }

  /**
   * Calculate quality score for legacy data
   */
  private calculateQualityScore(data: any): number {
    const resonanceWeight = 0.5;
    const patternWeight = 0.3;
    const entropyWeight = 0.2;
    
    const resonanceScore = Math.min(data.resonance, 1.0);
    const patternScore = Math.min((data.patterns?.length || 0) / 10.0, 1.0);
    const entropyScore = Math.min((data.entropy || 0) / 5.0, 1.0);
    
    return resonanceScore * resonanceWeight + 
           patternScore * patternWeight + 
           entropyScore * entropyWeight;
  }

  /**
   * Export training data to file
   */
  async exportToFile(): Promise<string> {
    const filteredData = this.trainingData.filter(point => 
      point.quality_score >= this.config.qualityThreshold &&
      point.resonance >= this.config.resonanceThreshold
    );

    const outputPath = this.config.outputPath;
    const outputDir = path.dirname(outputPath);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let content: string;
    let filePath: string;

    switch (this.config.format) {
      case 'jsonl':
        content = this.formatAsJSONL(filteredData);
        filePath = outputPath;
        break;
      case 'json':
        content = this.formatAsJSON(filteredData);
        filePath = outputPath.replace('.jsonl', '.json');
        break;
      case 'csv':
        content = this.formatAsCSV(filteredData);
        filePath = outputPath.replace('.jsonl', '.csv');
        break;
      default:
        throw new Error(`Unsupported format: ${this.config.format}`);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    
    const stats = {
      totalPoints: filteredData.length,
      averageResonance: this.calculateAverageResonance(filteredData),
      averageQuality: this.calculateAverageQuality(filteredData),
      patternsFound: this.countUniquePatterns(filteredData),
      filePath
    };

    console.log(`💾 [TRAINING] Exported ${stats.totalPoints} training points to ${filePath}`);
    console.log(`📊 [TRAINING] Average resonance: ${stats.averageResonance.toFixed(3)}`);
    console.log(`📊 [TRAINING] Average quality: ${stats.averageQuality.toFixed(3)}`);
    console.log(`🔍 [TRAINING] Unique patterns: ${stats.patternsFound}`);

    return filePath;
  }

  /**
   * Format data as JSONL (one JSON object per line)
   */
  private formatAsJSONL(data: TrainingDataPoint[]): string {
    return data.map(point => {
      const exportPoint = this.config.includeMetadata ? point : {
        id: point.id,
        input: point.input,
        action: point.action,
        output: point.output,
        resonance: point.resonance,
        entropy: point.entropy,
        patterns: point.patterns,
        quality_score: point.quality_score,
        timestamp: point.timestamp
      };
      
      return JSON.stringify(exportPoint);
    }).join('\n');
  }

  /**
   * Format data as JSON array
   */
  private formatAsJSON(data: TrainingDataPoint[]): string {
    const exportData = this.config.includeMetadata ? data : data.map(point => ({
      id: point.id,
      input: point.input,
      action: point.action,
      output: point.output,
      resonance: point.resonance,
      entropy: point.entropy,
      patterns: point.patterns,
      quality_score: point.quality_score,
      timestamp: point.timestamp
    }));
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Format data as CSV
   */
  private formatAsCSV(data: TrainingDataPoint[]): string {
    const headers = [
      'id',
      'input',
      'action_type',
      'output',
      'resonance',
      'entropy',
      'patterns_count',
      'quality_score',
      'timestamp'
    ];

    const rows = data.map(point => [
      point.id,
      `"${this.escapeCSV(point.input)}"`,
      point.action.type,
      `"${this.escapeCSV(point.output)}"`,
      point.resonance.toFixed(4),
      point.entropy.toFixed(4),
      point.patterns.length,
      point.quality_score.toFixed(4),
      point.timestamp
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Escape CSV fields
   */
  private escapeCSV(field: string): string {
    return field.replace(/"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  /**
   * Calculate average resonance
   */
  private calculateAverageResonance(data: TrainingDataPoint[]): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, point) => acc + point.resonance, 0);
    return sum / data.length;
  }

  /**
   * Calculate average quality score
   */
  private calculateAverageQuality(data: TrainingDataPoint[]): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, point) => acc + point.quality_score, 0);
    return sum / data.length;
  }

  /**
   * Count unique patterns
   */
  private countUniquePatterns(data: TrainingDataPoint[]): number {
    const allPatterns = data.flatMap(point => point.patterns);
    return new Set(allPatterns).size;
  }

  /**
   * Get training statistics
   */
  getStatistics(): any {
    return {
      totalPoints: this.trainingData.length,
      averageResonance: this.calculateAverageResonance(this.trainingData),
      averageQuality: this.calculateAverageQuality(this.trainingData),
      uniquePatterns: this.countUniquePatterns(this.trainingData),
      config: this.config
    };
  }

  /**
   * Filter training data by criteria
   */
  filterData(criteria: {
    minResonance?: number;
    minQuality?: number;
    patterns?: string[];
    dateRange?: { start: number; end: number };
  }): TrainingDataPoint[] {
    return this.trainingData.filter(point => {
      if (criteria.minResonance && point.resonance < criteria.minResonance) {
        return false;
      }
      
      if (criteria.minQuality && point.quality_score < criteria.minQuality) {
        return false;
      }
      
      if (criteria.patterns && criteria.patterns.length > 0) {
        const hasRequiredPattern = criteria.patterns.some(pattern => 
          point.patterns.includes(pattern)
        );
        if (!hasRequiredPattern) {
          return false;
        }
      }
      
      if (criteria.dateRange) {
        if (point.timestamp < criteria.dateRange.start || 
            point.timestamp > criteria.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Clear training data
   */
  clearData(): void {
    this.trainingData = [];
    console.log('🗑️ [TRAINING] Training data cleared');
  }

  /**
   * Load training data from file
   */
  async loadFromFile(filePath: string): Promise<TrainingDataPoint[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Training data file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    const data: TrainingDataPoint[] = [];
    
    for (const line of lines) {
      try {
        const point = JSON.parse(line);
        data.push(point);
      } catch (error) {
        console.warn(`⚠️ [TRAINING] Failed to parse line: ${line.substring(0, 100)}...`);
      }
    }
    
    this.trainingData = data;
    console.log(`📖 [TRAINING] Loaded ${data.length} training points from ${filePath}`);
    
    return data;
  }

  /**
   * Merge with existing training data
   */
  mergeWith(newData: TrainingDataPoint[]): void {
    // Remove duplicates based on ID
    const existingIds = new Set(this.trainingData.map(point => point.id));
    const uniqueNewData = newData.filter(point => !existingIds.has(point.id));
    
    this.trainingData.push(...uniqueNewData);
    
    // Sort by quality score and limit
    this.trainingData.sort((a, b) => b.quality_score - a.quality_score);
    if (this.trainingData.length > this.config.maxEntries) {
      this.trainingData = this.trainingData.slice(0, this.config.maxEntries);
    }
    
    console.log(`🔀 [TRAINING] Merged ${uniqueNewData.length} new training points`);
  }
}
