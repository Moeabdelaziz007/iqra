/**
 * 🌙 Qalbin VM — محرك التفاعل بالضمير (Conscience Interaction Engine)
 * 
 * WHY: This is the core Virtual Machine for the Qalbin language. It implements 
 * Interaction Combinators (graph-rewriting) with a integrated "Conscience" layer.
 */

import { QalbinNode, QalbinKind, Modality } from './qalbin_node';
import { SovereignError } from '../../security';

export class Qalbin_VM {
  private nodes: Map<number, QalbinNode> = new Map();
  private activePairs: Set<string> = new Set(); // Use a Set to avoid duplicate active pairs
  private nodeCounter: number = 0;

  spawn(kind: QalbinKind, modality: Modality = Modality.RAHMA): number {
    const id = this.nodeCounter++;
    const node: QalbinNode = {
      id,
      kind,
      modality,
      ports: [null, null, null],
      metadata: {
        reductions: 0
      }
    };
    this.nodes.set(id, node);
    return id;
  }

  link(idA: number, portA: number, idB: number, portB: number) {
    const addrA = (idA << 2) | portA;
    const addrB = (idB << 2) | portB;
    this.reconnect(addrA, addrB);
  }

  ignite(idA: number, idB: number) {
    this.link(idA, 0, idB, 0);
  }

  pulse(): { steps: number; resonance: number } {
    let steps = 0;
    while (this.activePairs.size > 0) {
      const pairStr = this.activePairs.values().next().value;
      if (!pairStr) break;
      this.activePairs.delete(pairStr);
      
      const [idA, idB] = pairStr.split('-').map(Number);
      this.interact(idA, idB);
      steps++;

      if (steps > 1000) {
        throw new SovereignError(`QALBIN_OVERFLOW: Halt at ${steps} steps.`, "HALT", "CRITICAL");
      }
    }

    return {
      steps,
      resonance: this.calculateResonance()
    };
  }

  private interact(idA: number, idB: number) {
    const a = this.nodes.get(idA);
    const b = this.nodes.get(idB);

    if (!a || !b) return;

    this.verifyMoralConstraints(a, b);

    if (a.kind === b.kind) {
      this.annihilate(a, b);
    } else {
      this.commute(a, b);
    }
  }

  private verifyMoralConstraints(a: QalbinNode, b: QalbinNode) {
    // 1. Protection against high-risk interactions
    if (a.modality === Modality.AMAN && a.metadata['risk_score'] > 0.9) {
      throw new SovereignError("AMAN_VIOLATION: High-risk interaction.", "TAWBAH", "CRITICAL");
    }

    // 2. AMAN Sovereignty: Tokens with AMAN modality cannot be cloned (Commute)
    // In Interaction Combinators, cloning happens during Commute (kind mismatch)
    if (a.kind !== b.kind && (a.modality === Modality.AMAN || b.modality === Modality.AMAN)) {
      throw new SovereignError("AMAN_SOVEREIGNTY: Security tokens cannot be cloned or fragmented.", "TAWBAH", "HALT");
    }
  }

  private annihilate(a: QalbinNode, b: QalbinNode) {
    const pA1 = a.ports[1];
    const pA2 = a.ports[2];
    const pB1 = b.ports[1];
    const pB2 = b.ports[2];

    this.nodes.delete(a.id);
    this.nodes.delete(b.id);

    this.reconnect(pA1, pB1);
    this.reconnect(pA2, pB2);
  }

  private commute(a: QalbinNode, b: QalbinNode) {
    const pA1 = a.ports[1];
    const pA2 = a.ports[2];
    const pB1 = b.ports[1];
    const pB2 = b.ports[2];

    const a1 = this.spawn(a.kind, a.modality);
    const a2 = this.spawn(a.kind, a.modality);
    const b1 = this.spawn(b.kind, b.modality);
    const b2 = this.spawn(b.kind, b.modality);

    this.link(a1, 1, b1, 1);
    this.link(a1, 2, b2, 1);
    this.link(a2, 1, b1, 2);
    this.link(a2, 2, b2, 2);

    this.nodes.delete(a.id);
    this.nodes.delete(b.id);

    this.reconnect((a1 << 2) | 0, pA1);
    this.reconnect((a2 << 2) | 0, pA2);
    this.reconnect((b1 << 2) | 0, pB1);
    this.reconnect((b2 << 2) | 0, pB2);
  }

  private reconnect(addrA: number | null, addrB: number | null) {
    if (addrA === null || addrB === null) return;

    const idA = addrA >> 2;
    const portA = addrA & 3;
    const idB = addrB >> 2;
    const portB = addrB & 3;

    const nodeA = this.nodes.get(idA);
    const nodeB = this.nodes.get(idB);

    if (nodeA) nodeA.ports[portA] = addrB;
    if (nodeB) nodeB.ports[portB] = addrA;

    if (portA === 0 && portB === 0) {
      const pairId = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
      this.activePairs.add(pairId);
    }
  }

  private calculateResonance(): number {
    if (this.nodes.size === 0) return 1.0;
    let weight = 0;
    this.nodes.forEach(n => weight += (n.modality === Modality.IKHLAS ? 1.5 : 1.0));
    return weight / this.nodes.size;
  }
}
