// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🎯 MCTS Engine — Monte Carlo Tree Search Simulation
 * 
 * Based on arxiv:2406.03816 "ReST-MCTS∗: LLM Self-Training via Process Reward Guided Tree Search"
 * Implements self-playing simulation for training data generation
 */

import { IQRALogger } from '#infra/logger';

export interface MCTSNode {
  id: string;
  parent?: MCTSNode;
  children: MCTSNode[];
  visits: number;
  value: number;
  reward: number;
  action: string;
  state: any;
  untried_actions: string[];
}

export interface MCTSConfig {
  simulations: number;
  exploration: number;
  rollout_depth: number;
  time_limit: number;
}

export class MCTSEngine {
  private config: MCTSConfig;
  private root: MCTSNode | null = null;

  constructor(config: MCTSConfig) {
    this.config = {
      simulations: 1000,
      exploration: 1.41,  // √2
      rollout_depth: 10,
      time_limit: 5000,
      ...config
    };
  }

  /**
   * ينفذ شجرة MCTS من البداية
   */
  initialize(initialState: any, possibleActions: string[]): MCTSNode {
    this.root = {
      id: 'root',
      children: [],
      visits: 0,
      value: 0,
      reward: 0,
      action: 'root',
      state: initialState,
      untried_actions: [...possibleActions]
    };

    IQRALogger.info('🌱 [MCTS] Initialized tree for self-playing simulation');
    return this.root;
  }

  /**
   * الخوارزمية الرئيسية - UCB1 (Upper Confidence Bound)
   * UCB1 = reward + exploration * √(ln(parent_visits) / child_visits)
   */
  private selectNode(node: MCTSNode): MCTSNode {
    if (node.untried_actions.length === 0) {
      // إذا لم يتبقى أي إجراء، اختر عشوائياً
      return node.children[Math.floor(Math.random() * node.children.length)];
    }

    let bestNode: MCTSNode = node.children[0];
    let bestScore = -Infinity;

    for (const child of node.children) {
      const ucb1Score = child.reward + 
        this.config.exploration * Math.sqrt(Math.log(node.visits) / (child.visits || 1));
      
      if (ucb1Score > bestScore) {
        bestScore = ucb1Score;
        bestNode = child;
      }
    }

    return bestNode;
  }

  /**
   * محاكاة عشوائية (rollout) لتقييم العقدة
   */
  private rollout(node: MCTSNode, depth: number = 0): number {
    if (depth >= this.config.rollout_depth || node.untried_actions.length === 0) {
      return node.reward;
    }

    const action = node.untried_actions[Math.floor(Math.random() * node.untried_actions.length)];
    const newState = this.simulateAction(node.state, action);
    const reward = this.evaluateState(newState);

    const childNode: MCTSNode = {
      id: `${node.id}-${action}`,
      parent: node,
      children: [],
      visits: 1,
      value: reward,
      reward: reward,
      action,
      state: newState,
      untried_actions: this.getAvailableActions(newState)
    };

    node.children.push(childNode);
    
    // إزالة الإجراء من القائمة غير المجرّبة
    const actionIndex = node.untried_actions.indexOf(action);
    if (actionIndex > -1) {
      node.untried_actions.splice(actionIndex, 1);
    }

    return reward;
  }

  /**
   * تشغيل المحاكاة الكاملة
   */
  async run(initialState: any, possibleActions: string[]): Promise<{
    bestAction: string;
    bestValue: number;
    simulations: number;
    tree: MCTSNode;
  }> {
    const startTime = Date.now();
    this.root = this.initialize(initialState, possibleActions);
    let totalSimulations = 0;

    while (Date.now() - startTime < this.config.time_limit && 
           totalSimulations < this.config.simulations) {
      
      const selectedNode = this.selectNode(this.root!);
      
      // تشغيل محاكاة من العقدة المختارة
      const rolloutReward = this.rollout(selectedNode, 0);
      
      // تحديث الإحصائيات
      this.backpropagate(selectedNode, rolloutReward);
      totalSimulations++;
    }

    // اختيار أفضل إجراء بناءً على القيمة
    let bestAction = '';
    let bestValue = -Infinity;
    
    for (const child of this.root!.children) {
      const avgValue = child.visits > 0 ? child.value / child.visits : child.value;
      if (avgValue > bestValue) {
        bestValue = avgValue;
        bestAction = child.action;
      }
    }

    IQRALogger.info(`🎯 [MCTS] Completed ${totalSimulations} simulations, best action: ${bestAction}`);

    return {
      bestAction,
      bestValue,
      simulations: totalSimulations,
      tree: this.root!
    };
  }

  /**
   * نشر النتائج للأعلى في الشجرة
   */
  private backpropagate(node: MCTSNode, reward: number): void {
    let current: MCTSNode | undefined = node;
    
    while (current) {
      current.visits++;
      current.value += reward;
      current = current.parent;
    }
  }

  /**
   * محاكاة الإجراء في الحالة
   */
  private simulateAction(state: any, action: string): any {
    // هنا يتم تنفيذ الإجراء في سياق المحاكاة
    // يجب تكييف هذا حسب نوع المشكلة
    return { ...state, action, step: (state.step || 0) + 1 };
  }

  /**
   * تقييم الحالة - دالة مكافأة
   */
  private evaluateState(state: any): number {
    // يمكن تعديل هذا ليناسب المشكلة
    // مثال: مكافأة بناءً على الهدف
    if (state.goal_reached) return 1.0;
    if (state.invalid_action) return -0.5;
    return 0.0;
  }

  /**
   * الحصول على الإجراءات المتاحة
   */
  private getAvailableActions(state: any): string[] {
    // يجب تكييف هذا حسب المشكلة
    return ['action_1', 'action_2', 'action_3', 'action_4'];
  }

  /**
   * إحصائيات الشجرة
   */
  getTreeStats(): {
    totalNodes: number;
    maxDepth: number;
    avgBranchingFactor: number;
  } {
    if (!this.root) {
      return { totalNodes: 0, maxDepth: 0, avgBranchingFactor: 0 };
    }

    let totalNodes = 0;
    let maxDepth = 0;

    const countNodes = (node: MCTSNode, depth: number = 0) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);
      
      for (const child of node.children) {
        countNodes(child, depth + 1);
      }
    };

    countNodes(this.root, 0);

    const avgBranchingFactor = totalNodes > 0 ? 
      (this.root!.children.length + totalNodes - 1) / totalNodes : 0;

    return { totalNodes, maxDepth, avgBranchingFactor };
  }
}
