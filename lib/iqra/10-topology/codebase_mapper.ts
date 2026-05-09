import fs from 'fs';
import path from 'path';
import { IQRALogger } from '../12-infrastructure/logger.js';

/**
 * 🌀 CodebaseTopologyMapper — مخطط طوبولوجيا الكود
 *
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ" — فصلت: 53
 *
 * يُحوّل هيكل المجلدات والملفات إلى رسم بياني طوبولوجي (Graph).
 * يكتشف "الثقوب" (Holes) وهي الأجزاء غير المتصلة أو المعقدة بشكل غير طبيعي.
 */

export interface CodeTopology {
  nodes: Map<string, { size: number; complexity: number; exports: number }>;
  edges: Set<string>; // format: "source->target"
  h0: number; // Connected components
  h1: number; // Cycles
  resonance: number; // Global structural resonance [0, 1]
}

export class CodebaseTopologyMapper {
  private static readonly ROOT = path.join(process.cwd(), 'lib', 'iqra');

  /**
   * Scans the /lib/iqra directory and builds a topology graph.
   */
  static async scan(): Promise<CodeTopology> {
    const nodes = new Map<string, { size: number; complexity: number; exports: number }>();
    const edges = new Set<string>();

    const files = this._getAllFiles(this.ROOT).filter(f => f.endsWith('.ts'));

    for (const file of files) {
      const relPath = path.relative(this.ROOT, file);
      const content = fs.readFileSync(file, 'utf-8');
      
      const stats = {
        size: content.length,
        complexity: (content.match(/if|for|while|switch|case|catch/g) || []).length,
        exports: (content.match(/export /g) || []).length
      };

      nodes.set(relPath, stats);

      // Extract imports to build edges
      const imports = content.match(/import .* from ['"](.*)['"]/g) || [];
      for (const imp of imports) {
        const match = imp.match(/from ['"](.*)['"]/);
        if (match && match[1]) {
          let target = match[1];
          if (target.startsWith('.')) {
            const absoluteTarget = path.resolve(path.dirname(file), target);
            if (fs.existsSync(absoluteTarget + '.ts')) {
              const relTarget = path.relative(this.ROOT, absoluteTarget + '.ts');
              edges.add(`${relPath}->${relTarget}`);
            }
          }
        }
      }
    }

    const { h0, h1 } = this._calculateBettiNumbers(nodes, edges);
    
    // Resonance is high when h1 is low (few cycles) and nodes are well-connected (low h0)
    const resonance = Math.max(0, 1.0 - (h1 * 0.05) - (h0 * 0.02));

    IQRALogger.info(`🌀 [TOPOLOGY] Codebase Scan Complete: Files=${nodes.size} | Edges=${edges.size} | H0=${h0} | H1=${h1} | Resonance=${resonance.toFixed(3)}`);

    return { nodes, edges, h0, h1, resonance };
  }

  private static _getAllFiles(dir: string): string[] {
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results.push(...this._getAllFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }

  private static _calculateBettiNumbers(nodes: Map<string, any>, edges: Set<string>): { h0: number; h1: number } {
    const V = nodes.size;
    const E = edges.size;
    
    if (V === 0) return { h0: 0, h1: 0 };

    // Union-Find for H0
    const parent = new Map<string, string>();
    for (const node of nodes.keys()) parent.set(node, node);

    function find(i: string): string {
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i)!);
      parent.set(i, root);
      return root;
    }

    function union(i: string, j: string) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    }

    for (const edge of edges) {
      const [src, dst] = edge.split('->');
      if (nodes.has(src) && nodes.has(dst)) {
        union(src, dst);
      }
    }

    const components = new Set<string>();
    for (const node of nodes.keys()) components.add(find(node));
    
    const h0 = components.size;
    const h1 = Math.max(0, E - V + h0); // Euler characteristic formula

    return { h0, h1 };
  }
}
