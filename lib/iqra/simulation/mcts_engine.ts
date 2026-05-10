/**
 * MCTS Simulation Engine — محاكاة مونتي كارلو
 * 
 * Monte Carlo Tree Search implementation for IQRA Self-Playing Simulation
 * Integrates with Qalbin VM for resonance evaluation
 * 
 * "وَلَقَدْ صَرَّفْنَاهُ بَيْنَهُمْ لِيَذَّكَّرُوا" — الفرقان: 50
 */

import { MCTSNode, MCTSNodeState, MCTSAction } from './mcts_node';

// Re-export for pipeline usage
export { MCTSNode };
export type { MCTSNodeState, MCTSAction };
import { QalbinVM } from '../quran/qalbin_vm';
import { VectorEngine } from '../quran/vector_engine';
import { IQRAMemory } from '../memory';

export interface SimulationConfig {
  maxIterations: number;
  explorationConstant: number;
  resonanceThreshold: number;
  qualityThreshold: number;
  maxDepth: number;
}

export interface SimulationResult {
  rootNode: MCTSNode;
  bestPath: MCTSNode[];
  highQualityNodes: MCTSNode[];
  totalIterations: number;
  averageResonance: number;
  patternsDiscovered: string[];
  trainingData: any[];
}

export class MCTSEngine {
  private rootNode: MCTSNode;
  private qalbinVM: QalbinVM;
  private vectorEngine: VectorEngine;
  private config: SimulationConfig;
  private patternsDiscovered: Set<string>;
  private trainingData: any[];

  constructor(initialState: MCTSNodeState, config: Partial<SimulationConfig> = {}) {
    this.config = {
      maxIterations: 369,
      explorationConstant: 1.414,
      resonanceThreshold: 0.7,
      qualityThreshold: 0.6,
      maxDepth: 10,
      ...config
    };

    this.rootNode = new MCTSNode(initialState);
    this.vectorEngine = new VectorEngine({});
    this.qalbinVM = new QalbinVM(this.vectorEngine, IQRAMemory);
    this.patternsDiscovered = new Set();
    this.trainingData = [];
  }

  /**
   * Run complete MCTS simulation
   */
  async runSimulation(): Promise<SimulationResult> {
    console.log(`🚀 [MCTS] Starting simulation with ${this.config.maxIterations} iterations`);
    
    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      // 1. Selection Phase
      const selectedNode = this.select(this.rootNode);
      
      // 2. Expansion & Simulation Phase
      const newNode = await this.expandAndSimulate(selectedNode);
      
      // 3. Backpropagation Phase
      this.backpropagate(newNode, newNode.state.resonance);
      
      // 4. Record lessons periodically
      if (iteration % 50 === 0) {
        await this.recordLessons(iteration);
      }
      
      // 5. Progress logging
      if (iteration % 100 === 0) {
        console.log(`📊 [MCTS] Iteration ${iteration}: Best resonance ${this.getBestResonance().toFixed(3)}`);
      }
    }
    
    // Generate final results
    const bestPath = this.getBestPath();
    const highQualityNodes = this.getHighQualityNodes();
    const averageResonance = this.calculateAverageResonance();
    
    console.log(`✅ [MCTS] Simulation completed. Best resonance: ${this.getBestResonance().toFixed(3)}`);
    
    return {
      rootNode: this.rootNode,
      bestPath,
      highQualityNodes,
      totalIterations: this.config.maxIterations,
      averageResonance,
      patternsDiscovered: Array.from(this.patternsDiscovered),
      trainingData: this.trainingData
    };
  }

  /**
   * Selection Phase - traverse tree to find best node to expand
   */
  private select(node: MCTSNode): MCTSNode {
    let current = node;
    
    while (!current.isTerminal() && current.getDepth() < this.config.maxDepth) {
      if (!current.isFullyExpanded()) {
        return current;
      }
      
      try {
        current = current.getBestChild(this.config.explorationConstant);
      } catch (error) {
        // If no children available, return current node
        break;
      }
    }
    
    return current;
  }

  /**
   * Expansion & Simulation Phase
   */
  private async expandAndSimulate(node: MCTSNode): Promise<MCTSNode> {
    if (node.untriedActions.length === 0) {
      // Node is fully expanded, return node itself
      return node;
    }
    
    // Choose random untried action
    const action = node.untriedActions[Math.floor(Math.random() * node.untriedActions.length)];
    
    // Execute action and get new state
    const newState = await this.executeAction(node.state, action);
    
    // Create new child node
    const childNode = node.addChild(newState, action);
    
    // Record patterns discovered
    newState.patterns.forEach(pattern => this.patternsDiscovered.add(pattern));
    
    // Add to training data if high quality
    if (newState.resonance >= this.config.resonanceThreshold) {
      this.trainingData.push({
        input: node.state.content,
        action: action,
        output: newState.content,
        resonance: newState.resonance,
        entropy: newState.entropy,
        patterns: newState.patterns,
        timestamp: Date.now()
      });
    }
    
    return childNode;
  }

  /**
   * Execute action and evaluate with Qalbin VM
   */
  private async executeAction(state: MCTSNodeState, action: MCTSAction): Promise<MCTSNodeState> {
    let newContent = state.content;
    
    // Apply action transformation
    switch (action.type) {
      case 'expand':
        newContent = await this.expandContent(state.content, action.parameters);
        break;
      case 'refine':
        newContent = await this.refineContent(state.content, action.parameters);
        break;
      case 'validate':
        newContent = await this.validateContent(state.content, action.parameters);
        break;
      case 'explore':
        newContent = await this.exploreContent(state.content, action.parameters);
        break;
    }
    
    // Evaluate with Qalbin VM
    const qalbinResult = await this.qalbinVM.pulse(newContent);
    
    // Detect numerical patterns
    const { EnhancedNumericalValidator } = await import('../quran/enhanced_numerical_validator');
    const numericalPatterns = EnhancedNumericalValidator.validate(newContent);
    
    // Combine all patterns
    const allPatterns = [
      ...qalbinResult.patterns,
      ...numericalPatterns.patterns
    ];
    
    return {
      id: `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: newContent,
      resonance: qalbinResult.state.resonance,
      entropy: qalbinResult.state.entropy,
      patterns: allPatterns,
      timestamp: Date.now()
    };
  }

  /**
   * Backpropagation Phase - update statistics up the tree
   */
  private backpropagate(node: MCTSNode, value: number): void {
    let current: MCTSNode | null = node;
    
    while (current !== null) {
      current.update(value);
      current = current.parent;
    }
  }

  /**
   * Content expansion using local LLM or rules
   */
  private async expandContent(content: string, parameters?: any): Promise<string> {
    // Simple rule-based expansion for now
    const expansions = [
      `توسيع: ${content} - هذا يوضح المعنى بشكل أعمق`,
      `شرح: ${content} - يمكن فهم هذا من خلال`,
      `تفصيل: ${content} - يتضمن عدة جوانب مهمة`
    ];
    
    return expansions[Math.floor(Math.random() * expansions.length)];
  }

  /**
   * Content refinement
   */
  private async refineContent(content: string, parameters?: any): Promise<string> {
    // Simple refinement rules
    if (content.length > 100) {
      return content.substring(0, 100) + '... (مختصر)';
    }
    
    return `مكرر: ${content}`;
  }

  /**
   * Content validation
   */
  private async validateContent(content: string, parameters?: any): Promise<string> {
    // Add validation markers
    return `[تم التحقق] ${content}`;
  }

  /**
   * Content exploration
   */
  private async exploreContent(content: string, parameters?: any): Promise<string> {
    // Generate exploration variations
    const explorations = [
      `استكشاف: ${content} - من زاوية مختلفة`,
      `تحليل: ${content} - بشكل معمق`,
      `تأمل: ${content} - في سياق أوسع`
    ];
    
    return explorations[Math.floor(Math.random() * explorations.length)];
  }

  /**
   * Get best path from root to highest quality node
   */
  private getBestPath(): MCTSNode[] {
    let bestNode = this.rootNode;
    let bestScore = bestNode.getQualityScore();
    
    // Find node with highest quality score
    this.traverseTree(this.rootNode, (node) => {
      const score = node.getQualityScore();
      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    });
    
    return bestNode.getPath();
  }

  /**
   * Get all high quality nodes
   */
  private getHighQualityNodes(): MCTSNode[] {
    const highQualityNodes: MCTSNode[] = [];
    
    this.traverseTree(this.rootNode, (node) => {
      if (node.getQualityScore() >= this.config.qualityThreshold) {
        highQualityNodes.push(node);
      }
    });
    
    return highQualityNodes.sort((a, b) => b.getQualityScore() - a.getQualityScore());
  }

  /**
   * Get best resonance value in tree
   */
  private getBestResonance(): number {
    let bestResonance = 0;
    
    this.traverseTree(this.rootNode, (node) => {
      if (node.state.resonance > bestResonance) {
        bestResonance = node.state.resonance;
      }
    });
    
    return bestResonance;
  }

  /**
   * Calculate average resonance across all nodes
   */
  private calculateAverageResonance(): number {
    let totalResonance = 0;
    let nodeCount = 0;
    
    this.traverseTree(this.rootNode, (node) => {
      totalResonance += node.state.resonance;
      nodeCount++;
    });
    
    return nodeCount === 0 ? 0 : totalResonance / nodeCount;
  }

  /**
   * Traverse tree and apply callback to each node
   */
  private traverseTree(node: MCTSNode, callback: (node: MCTSNode) => void): void {
    callback(node);
    
    for (const child of node.children) {
      this.traverseTree(child, callback);
    }
  }

  /**
   * Record lessons and patterns
   */
  private async recordLessons(iteration: number): Promise<void> {
    const lessons = Array.from(this.patternsDiscovered);
    
    if (lessons.length > 0) {
      await IQRAMemory.set(`mcts_lessons_${iteration}`, {
        iteration,
        patterns: lessons,
        bestResonance: this.getBestResonance(),
        nodeCount: this.getNodeCount(),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get total node count in tree
   */
  private getNodeCount(): number {
    let count = 0;
    
    this.traverseTree(this.rootNode, () => {
      count++;
    });
    
    return count;
  }

  /**
   * Export training data
   */
  exportTrainingData(): any[] {
    return this.trainingData.filter(data => data.resonance >= this.config.resonanceThreshold);
  }

  /**
   * Get tree statistics
   */
  getTreeStats(): any {
    return {
      totalNodes: this.getNodeCount(),
      maxDepth: this.getMaxDepth(),
      averageResonance: this.calculateAverageResonance(),
      bestResonance: this.getBestResonance(),
      patternsDiscovered: this.patternsDiscovered.size,
      trainingDataPoints: this.trainingData.length
    };
  }

  /**
   * Get maximum depth of tree
   */
  private getMaxDepth(): number {
    let maxDepth = 0;
    
    this.traverseTree(this.rootNode, (node) => {
      maxDepth = Math.max(maxDepth, node.getDepth());
    });
    
    return maxDepth;
  }
}
