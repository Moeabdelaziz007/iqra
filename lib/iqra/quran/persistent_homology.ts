/**
 * Persistent Homology Calculator — حساب التماثل المستمر
 * 
 * Implements Zigzag Persistence for Quranic Pattern Analysis
 * Calculates H0 (connected components), H1 (loops), H2 (voids)
 * 
 * "وَكُلَّ شَيْءٍ عِندَهُ بِمِقْدَارٍ" — الرعد: 8
 */

export interface Point {
  x: number;
  y: number;
  z?: number;
  id?: string;
}

export interface Simplex {
  vertices: number[];
  dimension: number;
  timestamp: number;
}

export interface HomologyGroup {
  dimension: number;
  bettiNumber: number;
  persistencePairs: Array<{
    birth: number;
    death: number;
    persistence: number;
  }>;
}

export interface HomologyResult {
  H0: HomologyGroup;  // Connected components
  H1: HomologyGroup;  // Loops/cycles
  H2: HomologyGroup;  // Voids/cavities
  totalComplexity: number;
  eulerCharacteristic: number;
}

export class PersistentHomology {
  private points: Point[] = [];
  private simplices: Simplex[] = [];
  private filtration: number[] = [];

  /**
   * Calculate persistent homology from a set of points
   */
  static async calculate(points: Point[]): Promise<HomologyResult> {
    const ph = new PersistentHomology();
    ph.points = points;
    
    // 1. Build simplicial complex
    await ph.buildComplex();
    
    // 2. Create filtration
    await ph.createFiltration();
    
    // 3. Calculate homology groups
    const H0 = await ph.calculateH0();
    const H1 = await ph.calculateH1();
    const H2 = await ph.calculateH2();
    
    // 4. Calculate complexity measures
    const totalComplexity = ph.calculateTotalComplexity(H0, H1, H2);
    const eulerCharacteristic = ph.calculateEulerCharacteristic(H0, H1, H2);
    
    return {
      H0,
      H1,
      H2,
      totalComplexity,
      eulerCharacteristic
    };
  }

  /**
   * Build simplicial complex from points using Vietoris-Rips complex
   */
  private async buildComplex(): Promise<void> {
    this.simplices = [];
    
    // 0-simplices (points)
    this.points.forEach((point, i) => {
      this.simplices.push({
        vertices: [i],
        dimension: 0,
        timestamp: 0
      });
    });
    
    // 1-simplices (edges) - connect points within threshold distance
    const threshold = this.calculateAdaptiveThreshold();
    for (let i = 0; i < this.points.length; i++) {
      for (let j = i + 1; j < this.points.length; j++) {
        const distance = this.euclideanDistance(this.points[i], this.points[j]);
        if (distance <= threshold) {
          this.simplices.push({
            vertices: [i, j],
            dimension: 1,
            timestamp: distance
          });
        }
      }
    }
    
    // 2-simplices (triangles) - form triangles from edges
    for (let i = 0; i < this.points.length; i++) {
      for (let j = i + 1; j < this.points.length; j++) {
        for (let k = j + 1; k < this.points.length; k++) {
          if (this.formsTriangle(i, j, k)) {
            const maxDistance = Math.max(
              this.euclideanDistance(this.points[i], this.points[j]),
              this.euclideanDistance(this.points[i], this.points[k]),
              this.euclideanDistance(this.points[j], this.points[k])
            );
            this.simplices.push({
              vertices: [i, j, k],
              dimension: 2,
              timestamp: maxDistance
            });
          }
        }
      }
    }
  }

  /**
   * Calculate adaptive threshold based on point distribution
   */
  private calculateAdaptiveThreshold(): number {
    if (this.points.length < 2) return 1.0;
    
    // Calculate average distance to nearest neighbor
    let totalDistance = 0;
    for (let i = 0; i < this.points.length; i++) {
      let minDistance = Infinity;
      for (let j = 0; j < this.points.length; j++) {
        if (i !== j) {
          const distance = this.euclideanDistance(this.points[i], this.points[j]);
          minDistance = Math.min(minDistance, distance);
        }
      }
      totalDistance += minDistance;
    }
    
    return (totalDistance / this.points.length) * 2.0; // 2x average nearest neighbor
  }

  /**
   * Check if three points form a valid triangle
   */
  private formsTriangle(i: number, j: number, k: number): boolean {
    // Check if all three edges exist
    const edge1 = this.simplices.find(s => 
      s.dimension === 1 && 
      ((s.vertices[0] === i && s.vertices[1] === j) ||
       (s.vertices[0] === j && s.vertices[1] === i))
    );
    const edge2 = this.simplices.find(s => 
      s.dimension === 1 && 
      ((s.vertices[0] === i && s.vertices[1] === k) ||
       (s.vertices[0] === k && s.vertices[1] === i))
    );
    const edge3 = this.simplices.find(s => 
      s.dimension === 1 && 
      ((s.vertices[0] === j && s.vertices[1] === k) ||
       (s.vertices[0] === k && s.vertices[1] === j))
    );
    
    return edge1 !== undefined && edge2 !== undefined && edge3 !== undefined;
  }

  /**
   * Create filtration order for simplices
   */
  private async createFiltration(): Promise<void> {
    // Sort simplices by timestamp (filtration value)
    this.simplices.sort((a, b) => a.timestamp - b.timestamp);
    this.filtration = this.simplices.map(s => s.timestamp);
  }

  /**
   * Calculate H0 - connected components
   */
  private async calculateH0(): Promise<HomologyGroup> {
    const persistencePairs: Array<{birth: number; death: number; persistence: number}> = [];
    let components = this.points.length;
    const unionFind = new UnionFind(this.points.length);
    
    // Process edges in order of increasing length
    const edges = this.simplices.filter(s => s.dimension === 1);
    for (const edge of edges) {
      const [i, j] = edge.vertices;
      if (unionFind.find(i) !== unionFind.find(j)) {
        // Components merge - record death of previous component
        persistencePairs.push({
          birth: 0,
          death: edge.timestamp,
          persistence: edge.timestamp
        });
        unionFind.union(i, j);
        components--;
      }
    }
    
    // Remaining components persist to infinity
    for (let i = 0; i < components; i++) {
      persistencePairs.push({
        birth: 0,
        death: Infinity,
        persistence: Infinity
      });
    }
    
    return {
      dimension: 0,
      bettiNumber: components,
      persistencePairs
    };
  }

  /**
   * Calculate H1 - loops/cycles
   */
  private async calculateH1(): Promise<HomologyGroup> {
    const persistencePairs: Array<{birth: number; death: number; persistence: number}> = [];
    
    // Simplified H1 calculation using cycle detection
    const edges = this.simplices.filter(s => s.dimension === 1);
    const triangles = this.simplices.filter(s => s.dimension === 2);
    
    // Build adjacency list
    const adjacency: { [key: number]: number[] } = {};
    this.points.forEach((_, i) => adjacency[i] = []);
    
    edges.forEach(edge => {
      const [i, j] = edge.vertices;
      adjacency[i].push(j);
      adjacency[j].push(i);
    });
    
    // Detect cycles using DFS
    const visited = new Set<number>();
    const cycles: number[][] = [];
    
    for (const startNode of Object.keys(adjacency).map(Number)) {
      if (!visited.has(startNode)) {
        const path: number[] = [];
        const pathSet = new Set<number>();
        this.detectCycles(startNode, startNode, adjacency, visited, path, pathSet, cycles);
      }
    }
    
    // Each triangle represents a filled cycle (death of H1 class)
    triangles.forEach(triangle => {
      const maxEdge = Math.max(...triangle.vertices.map(v => 
        edges.find(e => e.vertices.includes(v))?.timestamp || 0
      ));
      persistencePairs.push({
        birth: 0, // Simplified - cycles born at filtration start
        death: maxEdge,
        persistence: maxEdge
      });
    });
    
    // Remaining cycles persist
    const remainingCycles = Math.max(0, cycles.length - triangles.length);
    for (let i = 0; i < remainingCycles; i++) {
      persistencePairs.push({
        birth: 0,
        death: Infinity,
        persistence: Infinity
      });
    }
    
    return {
      dimension: 1,
      bettiNumber: remainingCycles,
      persistencePairs
    };
  }

  /**
   * Detect cycles in graph using DFS
   */
  private detectCycles(
    current: number,
    parent: number,
    adjacency: { [key: number]: number[] },
    visited: Set<number>,
    path: number[],
    pathSet: Set<number>,
    cycles: number[][]
  ): void {
    visited.add(current);
    path.push(current);
    pathSet.add(current);
    
    for (const neighbor of adjacency[current]) {
      if (neighbor === parent) continue;
      
      if (pathSet.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push(cycle);
      } else if (!visited.has(neighbor)) {
        this.detectCycles(neighbor, current, adjacency, visited, path, pathSet, cycles);
      }
    }
    
    path.pop();
    pathSet.delete(current);
  }

  /**
   * Calculate H2 - voids/cavities
   */
  private async calculateH2(): Promise<HomologyGroup> {
    const persistencePairs: Array<{birth: number; death: number; persistence: number}> = [];
    
    // H2 represents enclosed voids (3D cavities)
    // For 2D data, H2 is typically 0 unless we have special structures
    const triangles = this.simplices.filter(s => s.dimension === 2);
    
    // Check for enclosed voids (simplified - looks for "holes" in triangle arrangements)
    let voids = 0;
    
    // Group triangles by connectivity
    const triangleGroups = this.groupConnectedTriangles(triangles);
    
    // Each group that forms a closed surface might contain a void
    triangleGroups.forEach(group => {
      if (this.formsClosedSurface(group)) {
        voids++;
        persistencePairs.push({
          birth: Math.max(...group.map(t => t.timestamp)),
          death: Infinity,
          persistence: Infinity
        });
      }
    });
    
    return {
      dimension: 2,
      bettiNumber: voids,
      persistencePairs
    };
  }

  /**
   * Group connected triangles
   */
  private groupConnectedTriangles(triangles: Simplex[]): Simplex[][] {
    const groups: Simplex[][] = [];
    const visited = new Set<number>();
    
    triangles.forEach((triangle, index) => {
      if (!visited.has(index)) {
        const group: Simplex[] = [];
        this.traverseTriangleGroup(triangle, triangles, visited, group);
        groups.push(group);
      }
    });
    
    return groups;
  }

  /**
   * Traverse connected triangle group
   */
  private traverseTriangleGroup(
    triangle: Simplex,
    allTriangles: Simplex[],
    visited: Set<number>,
    group: Simplex[]
  ): void {
    const index = allTriangles.indexOf(triangle);
    if (visited.has(index)) return;
    
    visited.add(index);
    group.push(triangle);
    
    // Find connected triangles
    allTriangles.forEach((other, otherIndex) => {
      if (visited.has(otherIndex)) return;
      
      if (this.trianglesShareEdge(triangle, other)) {
        this.traverseTriangleGroup(other, allTriangles, visited, group);
      }
    });
  }

  /**
   * Check if two triangles share an edge
   */
  private trianglesShareEdge(t1: Simplex, t2: Simplex): boolean {
    const sharedVertices = t1.vertices.filter(v => t2.vertices.includes(v));
    return sharedVertices.length === 2; // Share exactly 2 vertices = share edge
  }

  /**
   * Check if triangle group forms a closed surface
   */
  private formsClosedSurface(triangles: Simplex[]): boolean {
    // Simplified check - a group forms a closed surface if:
    // 1. Has enough triangles (at least 4 for a tetrahedron-like structure)
    // 2. Each edge is shared by exactly 2 triangles
    
    if (triangles.length < 4) return false;
    
    const edgeCount: { [key: string]: number } = {};
    
    triangles.forEach(triangle => {
      const edges = this.getTriangleEdges(triangle);
      edges.forEach(edge => {
        const edgeKey = edge.sort().join('-');
        edgeCount[edgeKey] = (edgeCount[edgeKey] || 0) + 1;
      });
    });
    
    // All edges should be shared by exactly 2 triangles
    return Object.values(edgeCount).every(count => count === 2);
  }

  /**
   * Get edges of a triangle
   */
  private getTriangleEdges(triangle: Simplex): number[][] {
    const [v0, v1, v2] = triangle.vertices;
    return [
      [v0, v1],
      [v1, v2],
      [v2, v0]
    ];
  }

  /**
   * Calculate total complexity score
   */
  private calculateTotalComplexity(H0: HomologyGroup, H1: HomologyGroup, H2: HomologyGroup): number {
    const h0Score = H0.bettiNumber * 1.0;
    const h1Score = H1.bettiNumber * 2.0; // Loops are more complex
    const h2Score = H2.bettiNumber * 4.0; // Voids are most complex
    
    return h0Score + h1Score + h2Score;
  }

  /**
   * Calculate Euler characteristic
   */
  private calculateEulerCharacteristic(H0: HomologyGroup, H1: HomologyGroup, H2: HomologyGroup): number {
    return H0.bettiNumber - H1.bettiNumber + H2.bettiNumber;
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private euclideanDistance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

/**
 * Union-Find data structure for tracking connected components
 */
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }
}
