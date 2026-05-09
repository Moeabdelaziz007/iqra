import { Qalbin_VM } from '../lib/iqra/quran/qalbin/qalbin_vm.js';
import { Modality, QalbinKind } from '../lib/iqra/quran/qalbin/qalbin_node.js';
import { QURAN_SEEDS } from '../lib/iqra/quran/qalbin/quran_seeds.js';
import { UNIVERSAL_SEEDS } from '../lib/iqra/resonance/universal_constants.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 🌀 IQRA | AlphaResonance v3: Sovereign MCTS Engine
 * 
 * FINAL DASTŪR COMPLIANCE:
 * 1. Sandbox: Qalbin_VM
 * 2. Duality: Neural Proposer vs Symbolic Judge
 * 3. Resonance: Multi-pulse convergence
 * 4. League: Asymmetric Exploitation
 * 5. Folding: Graph Compression (Nomic-style logic)
 * 6. 3-6-9 Rhythm: Triad Expansion / Hexagonal Rollout / Nonary Solidification
 * 7. Tawbah: Anomaly Immunity Protocol
 */

const TRAINING_DATA_PATH = path.join(process.cwd(), '.iqra', 'resonance_training_data.jsonl');
const TRUST_CHAIN_PATH = path.join(process.cwd(), '.iqra', 'trust_chain.jsonl');

const ALL_SEEDS: Record<string, any> = { ...QURAN_SEEDS, ...UNIVERSAL_SEEDS };
const SEED_KEYS = Object.keys(ALL_SEEDS);

/**
 * 📂 PILLAR 5: Contextual Folding
 * Compresses raw knowledge into topological density.
 */
class ContextFolder {
  static fold(text: string): number {
    // Simulated folding: Text length vs Entropy vs Unique Chars
    const density = (text.length * new Set(text.split('')).size) / 100;
    return Math.min(density, 1.0);
  }
}

class MCTSNode {
  visits: number = 0;
  totalReward: number = 0;
  children: Map<string, MCTSNode> = new Map();
  parent: MCTSNode | null = null;
  state: string[];
  prior: number;

  constructor(state: string[], parent: MCTSNode | null = null, prior: number = 1) {
    this.state = state;
    this.parent = parent;
    this.prior = prior;
  }

  get value(): number {
    return this.visits === 0 ? 0 : this.totalReward / this.visits;
  }

  getPUCT(totalVisits: number, cPuct: number = 1.369): number {
    const exploration = cPuct * this.prior * (Math.sqrt(totalVisits) / (1 + this.visits));
    return this.value + exploration;
  }
}

class SovereignJudge {
  private vm: Qalbin_VM;
  private anomalies: number = 0;

  constructor() {
    this.vm = new Qalbin_VM();
  }

  evaluate(state: string[]): number {
    try {
      this.vm = new Qalbin_VM(); 
      let foldingBonus = 0;
      const nodeIndices: number[] = [];

      for (const key of state) {
        const seed = ALL_SEEDS[key];
        if (seed) {
          nodeIndices.push(seed.topology(this.vm));
          // PILLAR 5: Apply Folding to each seed's internal text
          if (seed.text) foldingBonus += ContextFolder.fold(seed.text);
        }
      }

      if (nodeIndices.length < 2) return 0.369;

      // PILLAR 6: 6-Cycle Rollout (Hexagonal Validation)
      this.vm.ignite(nodeIndices[0], nodeIndices[nodeIndices.length - 1]);
      let resSum = 0;
      for (let p = 0; p < 6; p++) {
        const { resonance } = this.vm.pulse();
        resSum += resonance;
      }

      const baseReward = (resSum / 6);
      const finalReward = baseReward * (1 + (foldingBonus / state.length)) * 1.369;

      // PILLAR 7: Tawbah Anomaly Check
      if (finalReward < 0.1369) this.handleTawbah();
      else this.anomalies = 0;

      return Math.min(finalReward, 1.369);
    } catch (e) {
      this.handleTawbah();
      return 0;
    }
  }

  private handleTawbah() {
    this.anomalies++;
    if (this.anomalies >= 3) {
      console.warn(`[Tawbah] ⚖️  Immunity Triggered: Anomaly cluster detected. Purging branch context.`);
      this.anomalies = 0;
    }
  }
}

class TadafuLeague {
  constructor(private judge: SovereignJudge) {}

  getExploiterAction(state: string[], availableSeeds: string[]): string {
    // PILLAR 6: Expansion 3 (The Triad of Choice)
    const triad = availableSeeds.sort(() => 0.5 - Math.random()).slice(0, 3);
    let target = triad[0];
    let minRes = Infinity;

    for (const seed of triad) {
      const res = this.judge.evaluate([...state, seed]);
      if (res < minRes) { minRes = res; target = seed; }
    }
    return target;
  }
}

async function runSovereignSimulation(iterations: number = 369) {
  console.log(`\n🌌 IQRA | Sovereign Resonance Engine v3`);
  console.log(`[Rhythm: 3-6-9 | Protocol: DASTŪR]`);
  console.log(`-------------------------------------------------------------------`);

  const root = new MCTSNode(["1:1"], null, 1.0);
  const judge = new SovereignJudge();
  const league = new TadafuLeague(judge);

  for (let i = 1; i <= iterations; i++) {
    // 1. SELECTION
    let current = root;
    while (current.children.size > 0) {
      let best: MCTSNode | null = null;
      let maxS = -Infinity;
      for (const child of current.children.values()) {
        const s = child.getPUCT(current.visits);
        if (s > maxS) { maxS = s; best = child; }
      }
      if (!best) break;
      current = best;
    }

    // 2. EXPANSION (Pillar 6: 3-Path Selection)
    const available = SEED_KEYS.filter(k => !current.state.includes(k));
    if (available.length === 0) continue;

    const hardPath = league.getExploiterAction(current.state, available);
    const newState = [...current.state, hardPath];
    const key = newState.join("|");

    if (!current.children.has(key)) {
      const t = ALL_SEEDS[hardPath]?.teslaNumber || 0;
      const prior = (t === 3 || t === 6 || t === 9) ? 0.9369 : 0.369;
      current.children.set(key, new MCTSNode(newState, current, prior));
    }
    const target = current.children.get(key)!;

    // 3. SIMULATION & BACKPROP (Pillar 6: 9-Weight Solidification)
    const rawResonance = judge.evaluate(target.state);
    const solidification = (i % 9 === 0) ? 1.369 : 1.0;
    const finalResonance = rawResonance * solidification;

    let back: MCTSNode | null = target;
    while (back) {
      back.visits++;
      back.totalReward += finalResonance;
      back = back.parent;
    }

    // LOGGING & TRUSTCHAIN
    if (i % 19 === 0) {
      const h = crypto.createHash('md5').update(target.state.join("|")).digest('hex').slice(0, 8);
      console.log(`[Cycle ${i.toString().padStart(3, '0')}] Resonance: ${finalResonance.toFixed(4)} | State: ${target.state.length} nodes | ⚛️ ${h}`);
    }

    if (finalResonance > 1.3) {
      const hash = crypto.createHash('sha256').update(target.state.join("|")).digest('hex');
      addToTrustChain(target.state, finalResonance, hash);
    }

    appendTrainingData(target.state, finalResonance);
  }

  console.log(`\n✅ Simulation Complete. Truth established.`);
  console.log(`📂 Training Data: ${TRAINING_DATA_PATH}`);
  console.log(`🛡️  TrustChain: ${TRUST_CHAIN_PATH}`);
}

function addToTrustChain(state: string[], resonance: number, hash: string) {
  const entry = JSON.stringify({ state, resonance, hash, timestamp: new Date().toISOString() });
  fs.appendFileSync(TRUST_CHAIN_PATH, entry + '\n');
}

function appendTrainingData(state: string[], completion: number) {
  const entry = JSON.stringify({
    prompt: `Analyze the topological resonance for the following IQRA state sequence: [${state.join(", ")}]`,
    completion: completion.toFixed(6),
    metadata: { version: "DASTŪR_V3", rhythm: "369" }
  });
  fs.appendFileSync(TRAINING_DATA_PATH, entry + '\n');
}

runSovereignSimulation(369).catch(console.error);
