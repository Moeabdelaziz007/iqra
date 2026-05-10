/**
 * MCTS Node — عقدة شجرة مونتي كارلو
 * 
 * Core node for Monte Carlo Tree Search algorithm
 * Used in Self-Playing Simulation for IQRA pattern discovery
 * 
 * "وَيَوْمَ نَحْشُرُهُمْ جَمِيعًا ثُمَّ لَا نُظَلِّمُ مِنْهُمْ مَنْ أَحَدًا" — الكهف: 48
 */

export interface MCTSNodeState {
  id: string;
  content: string;
  resonance: number;
  entropy: number;
  patterns: string[];
  timestamp: number;
}

export interface MCTSAction {
  type: 'expand' | 'refine' | 'validate' | 'explore';
  content: string;
  parameters?: Record<string, any>;
}

export class MCTSNode {
  public id: string;
  public state: MCTSNodeState;
  public parent: MCTSNode | null;
  public children: MCTSNode[];
  public action: MCTSAction;
  
  // MCTS statistics
  public visits: number;
  public value: number;
  public untriedActions: MCTSAction[];
  
  constructor(
    state: MCTSNodeState,
    parent: MCTSNode | null = null,
    action: MCTSAction = { type: 'expand', content: state.content }
  ) {
    this.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.state = { ...state };
    this.parent = parent;
    this.children = [];
    this.action = action;
    
    // Initialize MCTS statistics
    this.visits = 0;
    this.value = 0;
    this.untriedActions = this.generatePossibleActions();
  }

  /**
   * Generate possible actions from current state
   */
  private generatePossibleActions(): MCTSAction[] {
    const actions: MCTSAction[] = [];
    const content = this.state.content;
    
    // Expansion actions
    if (content.length < 500) {
      actions.push({
        type: 'expand',
        content: content,
        parameters: { direction: 'elaborate' }
      });
    }
    
    // Refinement actions
    if (content.length > 50) {
      actions.push({
        type: 'refine',
        content: content,
        parameters: { focus: 'clarity' }
      });
    }
    
    // Validation actions
    actions.push({
      type: 'validate',
      content: content,
      parameters: { check: 'resonance' }
    });
    
    // Exploration actions
    actions.push({
      type: 'explore',
      content: content,
      parameters: { mode: 'pattern_discovery' }
    });
    
    return actions;
  }

  /**
   * Check if node is fully expanded
   */
  public isFullyExpanded(): boolean {
    return this.untriedActions.length === 0;
  }

  /**
   * Check if node is terminal (no more actions possible)
   */
  public isTerminal(): boolean {
    return this.isFullyExpanded() && this.children.length === 0;
  }

  /**
   * Get best child using UCB1 formula
   */
  public getBestChild(explorationConstant: number = 1.414): MCTSNode {
    if (this.children.length === 0) {
      throw new Error('No children available');
    }
    
    let bestChild = this.children[0];
    let bestValue = this.calculateUCB1(bestChild, explorationConstant);
    
    for (let i = 1; i < this.children.length; i++) {
      const child = this.children[i];
      const ucb1Value = this.calculateUCB1(child, explorationConstant);
      
      if (ucb1Value > bestValue) {
        bestValue = ucb1Value;
        bestChild = child;
      }
    }
    
    return bestChild;
  }

  /**
   * Calculate UCB1 value for child node
   * UCB1 = average_reward + C * sqrt(ln(parent_visits) / child_visits)
   */
  private calculateUCB1(child: MCTSNode, explorationConstant: number): number {
    if (child.visits === 0) {
      return Infinity; // Unvisited nodes get highest priority
    }
    
    const exploitation = child.value / child.visits;
    const exploration = explorationConstant * Math.sqrt(Math.log(this.visits) / child.visits);
    
    return exploitation + exploration;
  }

  /**
   * Add child node
   */
  public addChild(childState: MCTSNodeState, action: MCTSAction): MCTSNode {
    const child = new MCTSNode(childState, this, action);
    this.children.push(child);
    
    // Remove action from untried actions
    const actionIndex = this.untriedActions.findIndex(
      a => a.type === action.type && a.content === action.content
    );
    if (actionIndex !== -1) {
      this.untriedActions.splice(actionIndex, 1);
    }
    
    return child;
  }

  /**
   * Update node statistics after simulation
   */
  public update(value: number): void {
    this.visits++;
    this.value += value;
  }

  /**
   * Get average value (win rate)
   */
  public getAverageValue(): number {
    return this.visits === 0 ? 0 : this.value / this.visits;
  }

  /**
   * Get path from root to this node
   */
  public getPath(): MCTSNode[] {
    const path: MCTSNode[] = [];
    let current: MCTSNode | null = this;
    
    while (current !== null) {
      path.unshift(current);
      current = current.parent;
    }
    
    return path;
  }

  /**
   * Get depth of node in tree
   */
  public getDepth(): number {
    return this.getPath().length - 1;
  }

  /**
   * Check if node has high resonance (quality threshold)
   */
  public hasHighResonance(threshold: number = 0.8): boolean {
    return this.state.resonance >= threshold;
  }

  /**
   * Check if node has high entropy (complexity indicator)
   */
  public hasHighEntropy(threshold: number = 3.5): boolean {
    return this.state.entropy >= threshold;
  }

  /**
   * Get node quality score
   */
  public getQualityScore(): number {
    const resonanceWeight = 0.4;
    const entropyWeight = 0.3;
    const patternWeight = 0.2;
    const visitWeight = 0.1;
    
    const resonanceScore = Math.min(this.state.resonance, 1.0);
    const entropyScore = Math.min(this.state.entropy / 5.0, 1.0);
    const patternScore = Math.min(this.state.patterns.length / 10.0, 1.0);
    const visitScore = Math.min(this.visits / 100.0, 1.0);
    
    return (
      resonanceScore * resonanceWeight +
      entropyScore * entropyWeight +
      patternScore * patternWeight +
      visitScore * visitWeight
    );
  }

  /**
   * Serialize node for storage
   */
  public serialize(): any {
    return {
      id: this.id,
      state: this.state,
      action: this.action,
      visits: this.visits,
      value: this.value,
      children: this.children.map(child => child.id),
      qualityScore: this.getQualityScore(),
      depth: this.getDepth(),
      isTerminal: this.isTerminal()
    };
  }

  /**
   * Create node from serialized data
   */
  public static fromSerialized(data: any): MCTSNode {
    const node = new MCTSNode(data.state, null, data.action);
    node.id = data.id;
    node.visits = data.visits;
    node.value = data.value;
    
    return node;
  }
}
