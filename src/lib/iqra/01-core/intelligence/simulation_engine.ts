import { IQRALogger } from '#infra/logger';
import { IQRAMemory } from '#memory/memory';
import { MemoryBridge } from '#memory/memory_bridge';
import { appendToTrustChain } from '#security/security';
import { iqraThink, IQRABrainMode } from '#core/brain';
import { IQRATopology } from '#topology/topology';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimulationState {
  mission_id: string;
  step: number;
  parameters: Record<string, any>;
  score: number; // Current value of the state (0.0 to 1.0)
  patterns: string[]; // Patterns detected in this state
  resonance: number; // Topological resonance score
}

export interface SimulationNode {
  id: string;
  state: SimulationState;
  parent: string | null;
  children: string[];
  visits: number;
  value: number; // Mean value from simulations
  action?: string; // The action that led to this state
  is_quantum?: boolean; // If true, this node exists in superposition (probabilistic)
}

// ── SimulationEngine ──────────────────────────────────────────────────────────

export class SimulationEngine {
  private static _nodes = new Map<string, SimulationNode>();
  private static _isSimulating = false;
  private static _topology = new IQRATopology();

  /**
   * Runs a self-play simulation for a specific mission type.
   */
  static async runSelfPlay(
    type: 'trading' | 'job_hunting' | 'research' | 'code_discovery',
    iterations: number = 29 // Base resonance number
  ): Promise<{ best_path: string[]; discovered_patterns: string[] }> {
    if (this._isSimulating) return { best_path: [], discovered_patterns: [] };
    this._isSimulating = true;

    const missionId = `sim_${type}_${Date.now()}`;
    IQRALogger.info(`🌀 [SIMULATION] Starting self-play for: ${type} | Mission: ${missionId}`);

    // Initialize Root Node
    const rootId = 'root';
    this._nodes.clear();
    await this._topology.syncStateWithReality();
    
    const initialResonance = this._topology.getResonanceScore();

    this._nodes.set(rootId, {
      id: rootId,
      state: { 
        mission_id: missionId, 
        step: 0, 
        parameters: {}, 
        score: 0.5, 
        patterns: [],
        resonance: initialResonance
      },
      parent: null,
      children: [],
      visits: 1,
      value: 0.5,
    });

    const patternsFound = new Set<string>();

    for (let i = 0; i < iterations; i++) {
      // 1. Selection (with Topological Weighting)
      const leafId = this._select(rootId);
      
      // 2. Expansion & Simulation (Rollout)
      const newNodeId = await this._expandAndSimulate(leafId, type);
      
      // 3. Backpropagation
      const score = this._nodes.get(newNodeId)!.state.score;
      this._backpropagate(newNodeId, score);

      // Catch patterns
      this._nodes.get(newNodeId)!.state.patterns.forEach(p => patternsFound.add(p));
    }

    this._isSimulating = false;
    const bestPath = this._getBestPath(rootId);
    
    IQRALogger.info(`🌀 [SIMULATION] Self-play complete. Best path length: ${bestPath.length} | Patterns: ${patternsFound.size}`);

    // Record lessons learned
    await this._recordLessons(missionId, Array.from(patternsFound));

    return {
      best_path: bestPath,
      discovered_patterns: Array.from(patternsFound)
    };
  }

  // ── MCTS Core ───────────────────────────────────────────────────────────────

  /**
   * Selection: Traverse the tree using UCB1 + Topological Resonance
   */
  private static _select(nodeId: string): string {
    const node = this._nodes.get(nodeId)!;
    if (node.children.length === 0) return nodeId;

    let bestChildId = node.children[0];
    let bestScore = -Infinity;

    for (const childId of node.children) {
      const child = this._nodes.get(childId)!;
      
      // Traditional UCB1
      const exploitation = child.value / child.visits;
      const exploration = 1.41 * Math.sqrt(Math.log(node.visits) / child.visits);
      
      // Topological Weighting (Resonance acts as a multiplier for potential)
      // High resonance nodes are prioritized for exploration
      const resonanceWeight = child.state.resonance;
      
      const score = (exploitation + exploration) * resonanceWeight;

      if (score > bestScore) {
        bestScore = score;
        bestChildId = childId;
      }
    }

    return this._select(bestChildId);
  }

  /**
   * Expansion & Simulation: Add a new node and run a 'Virtual Step'
   */
  private static async _expandAndSimulate(
    nodeId: string,
    type: string
  ): Promise<string> {
    const parent = this._nodes.get(nodeId)!;
    const childId = `${nodeId}_${parent.children.length}`;
    
    // Simulate a virtual action outcome
    const virtualOutcome = await this._runVirtualStep(parent.state, type);

    // Quantum Superposition: 10% chance to branch into a "Hypothetical" node
    const isQuantum = Math.random() < 0.1;

    const newNode: SimulationNode = {
      id: childId,
      state: virtualOutcome,
      parent: nodeId,
      children: [],
      visits: 1,
      value: virtualOutcome.score,
      action: type === 'code_discovery' ? 'analyze_topological_hole' : 'simulated_step',
      is_quantum: isQuantum
    };

    this._nodes.set(childId, newNode);
    parent.children.push(childId);

    return childId;
  }

  /**
   * Backpropagation: Update values up the tree
   */
  private static _backpropagate(nodeId: string, score: number): void {
    const node = this._nodes.get(nodeId)!;
    node.visits++;
    node.value += score;

    if (node.parent) {
      this._backpropagate(node.parent, score);
    }
  }

  // ── Simulation Logic ────────────────────────────────────────────────────────

  /**
   * The "Virtual Step" — This is where AlphaZero logic resides.
   * Predicting the environment's response to an action.
   */
  private static async _runVirtualStep(
    prevState: SimulationState,
    type: string
  ): Promise<SimulationState> {
    let prediction = { score: 0.5, patterns: [] as string[], resonance: 0.5 };

    try {
      // 🧠 High-Fidelity LLM Fallback for low-resonance or complex discovery
      const mode = type === 'code_discovery' ? IQRABrainMode.DEEP_THINKING : IQRABrainMode.FAST_RESPONSE;
      
      const { response } = await iqraThink({
        input: `[SIMULATION_MODE] Type: ${type}. Step: ${prevState.step}. Parameters: ${JSON.stringify(prevState.parameters)}. Current Resonance: ${prevState.resonance}. 
        Predict the outcome score (0.0 to 1.0) and identify any resonance patterns. For code_discovery, look for potential topological holes or unused complex patterns. Output JSON only.`,
        mode
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? '{}');
      
      prediction.score = parsed.score ?? (prevState.score + (Math.random() - 0.4) * 0.1);
      prediction.patterns = parsed.patterns ?? [];
      prediction.resonance = parsed.resonance ?? this._topology.getResonanceScore();
    } catch {
      // Stochastic Fallback
      const randomResonance = Math.random();
      prediction.score = prevState.score + (randomResonance - 0.4) * 0.1;
      prediction.resonance = this._topology.getResonanceScore();
      if (prediction.score > 0.8) prediction.patterns.push('stochastic_success');
    }

    return {
      mission_id: prevState.mission_id,
      step: prevState.step + 1,
      parameters: { ...prevState.parameters, last_sim_type: type },
      score: Math.max(0, Math.min(1, prediction.score)),
      patterns: prediction.patterns,
      resonance: prediction.resonance
    };
  }

  private static _getBestPath(rootId: string): string[] {
    const path = [];
    let currentId = rootId;
    while (true) {
      const node = this._nodes.get(currentId)!;
      if (node.children.length === 0) break;
      
      // Select child with most visits (most robust)
      currentId = node.children.reduce((best, id) => 
        this._nodes.get(id)!.visits > this._nodes.get(best)!.visits ? id : best
      , node.children[0]);
      
      path.push(currentId);
    }
    return path;
  }

  /**
   * Records discovered patterns in MemoryBridge and TrustChain
   */
  private static async _recordLessons(
    missionId: string,
    patterns: string[]
  ): Promise<void> {
    if (patterns.length === 0) return;

    for (const pattern of patterns) {
      await MemoryBridge.write(`sim_pattern:${pattern}`, {
        type: 'discovered_pattern',
        mission_id: missionId,
        timestamp: Date.now(),
        resonance: 0.8,
        description: `Pattern "${pattern}" caught during self-play simulation.`
      }, { layer: 'warm' });
    }

    appendToTrustChain(
      'SIMULATION:PATTERNS',
      missionId,
      `patterns_caught=${patterns.length} resonance=${this._topology.getResonanceScore()}`,
      1.0
    );
  }
}
