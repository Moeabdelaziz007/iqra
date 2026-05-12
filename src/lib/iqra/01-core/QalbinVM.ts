/**
 * 🧠 Qalbin VM — الآلة الافتراضية للقرآن
 * 
 * Virtual Machine for Quranic pattern processing
 * Implements topological operations on sacred text
 */

export interface QalbinNode {
  id: string;
  value: number;
  connections: string[];
  type: 'verse' | 'word' | 'pattern';
}

export interface TopologicalSignature {
  nodes: QalbinNode[];
  edges: Array<{ from: string; to: string; weight: number }>;
  dimension: number;
  integrity: number;
}

export class QalbinVM {
  private nodes: Map<string, QalbinNode> = new Map();
  private edges: Map<string, Array<{ from: string; to: string; weight: number }>> = new Map();
  private currentDimension: number = 3;

  /**
   * Initialize VM with default topological structure
   */
  constructor() {
    this.initializeBaseTopology();
  }

  private initializeBaseTopology() {
    // Create core nodes for Islamic numerical constants
    this.addNode('1', 1, [], 'verse');
    this.addNode('3', 3, [], 'verse');
    this.addNode('6', 6, [], 'verse');
    this.addNode('7', 7, [], 'verse');
    this.addNode('9', 9, [], 'verse');
    
    // Connect with sacred geometry (3-6-9)
    this.addEdge('1', '3', 0.5);
    this.addEdge('3', '6', 0.8);
    this.addEdge('6', '9', 0.6);
    this.addEdge('9', '1', 0.4); // Complete the cycle
  }

  /**
   * Add a node to the topological space
   */
  addNode(id: string, value: number, connections: string[] = [], type: QalbinNode['type'] = 'pattern'): void {
    this.nodes.set(id, {
      id,
      value,
      connections,
      type
    });
  }

  /**
   * Add weighted edge between nodes
   */
  addEdge(from: string, to: string, weight: number): void {
    const edges = this.edges.get(from) || [];
    edges.push({ from, to, weight });
    this.edges.set(from, edges);
  }

  /**
   * Calculate topological signature of current state
   */
  getSignature(): TopologicalSignature {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.entries()).flatMap(([from, edges]) => 
        edges.map(edge => ({ ...edge, from }))
      ),
      dimension: this.currentDimension,
      integrity: this.calculateIntegrity()
    };
  }

  /**
   * Calculate structural integrity based on node connections
   */
  private calculateIntegrity(): number {
    let integrity = 0;
    let totalConnections = 0;

    for (const [_, edges] of this.edges.entries()) {
      totalConnections += edges.length;
      // Weight integrity by edge strength
      integrity += edges.reduce((sum, edge) => sum + edge.weight, 0);
    }

    return totalConnections > 0 ? integrity / totalConnections : 0;
  }

  /**
   * Transform input through topological operations
   */
  transform(input: string): TopologicalSignature {
    // Parse input for numerical patterns
    const numbers = input.match(/\d+/g) || [];
    
    // Add each number as a pattern node
    numbers.forEach((num, index) => {
      const nodeId = `pattern_${index}`;
      this.addNode(nodeId, parseInt(num), [], 'pattern');
      
      // Connect to nearest sacred number
      const nearestSacred = this.findNearestSacredNumber(parseInt(num));
      if (nearestSacred) {
        this.addEdge(nodeId, nearestSacred.toString(), 0.3);
      }
    });

    return this.getSignature();
  }

  /**
   * Find nearest sacred number (1,3,6,7,9) for resonance
   */
  private findNearestSacredNumber(num: number): number | null {
    const sacred = [1, 3, 6, 7, 9];
    let nearest = null;
    let minDistance = Infinity;

    for (const sacredNum of sacred) {
      const distance = Math.abs(num - sacredNum);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = sacredNum;
      }
    }

    return nearest;
  }

  /**
   * Reset VM to initial state
   */
  reset(): void {
    this.nodes.clear();
    this.edges.clear();
    this.initializeBaseTopology();
  }
}
