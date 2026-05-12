/**
 * 🌙 Qalbin VM — محرك التفاعل بالضمير (Conscience Interaction Engine)
 * 
 * WHY: This is the core Virtual Machine for the Qalbin language. It implements 
 * Interaction Combinators (graph-rewriting) with a integrated "Conscience" layer.
 */

import { QalbinNode, QalbinKind, Modality } from './qalbin_node';
import { SovereignError, SovereignErrorCode } from '#security/security';

export class Qalbin_VM {
  private nodes: Map<number, QalbinNode> = new Map();
  private activePairs: Set<string> = new Set(); // Use a Set to avoid duplicate active pairs
  private nodeCounter: number = 0;
  private reductionLog: string[] = [];

  spawn(kind: QalbinKind, modality: Modality = Modality.RAHMA, initialMetadata: Record<string, any> = {}): number {
    const id = this.nodeCounter++;
    const node: QalbinNode = {
      id,
      kind,
      modality,
      ports: [null, null, null],
      metadata: {
        reductions: 0,
        spawn_time: Date.now(),
        ...initialMetadata
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

  pulse(): { steps: number; resonance: number; logs: string[] } {
    let steps = 0;
    while (this.activePairs.size > 0) {
      const pairStr = this.activePairs.values().next().value;
      if (!pairStr) break;
      this.activePairs.delete(pairStr);
      
      const [idA, idB] = pairStr.split('-').map(Number);
      this.interact(idA, idB);
      steps++;

      if (steps > 1000) {
        throw new SovereignError(
          SovereignErrorCode.QALBIN_OVERFLOW,
          { reason: `Interaction limit exceeded (${steps}). Possible infinite loop in topology.` }
        );
      }
    }

    const resonance = this.calculateResonance();
    return {
      steps,
      resonance,
      logs: [...this.reductionLog]
    };
  }

  private interact(idA: number, idB: number) {
    const a = this.nodes.get(idA);
    const b = this.nodes.get(idB);

    if (!a || !b) return;

    this.verifyMoralConstraints(a, b);

    if (a.kind === b.kind) {
      this.reductionLog.push(`Annihilate: ${a.kind}(${a.modality}) <-> ${b.kind}(${b.modality})`);
      this.annihilate(a, b);
    } else {
      this.reductionLog.push(`Commute: ${a.kind}(${a.modality}) <-> ${b.kind}(${b.modality})`);
      this.commute(a, b);
    }
  }

  private verifyMoralConstraints(a: QalbinNode, b: QalbinNode) {
    // 1. Protection against high-risk interactions (Hidayah Filter)
    if ((a.modality === Modality.AMAN || b.modality === Modality.AMAN) && 
        (a.metadata['risk_score'] > 0.9 || b.metadata['risk_score'] > 0.9)) {
      throw new SovereignError(
        SovereignErrorCode.AMAN_VIOLATION,
        { reason: "High-risk interaction blocked by Hidayah filter." }
      );
    }

    // 2. AMAN Sovereignty: Security tokens are "Indivisible" and "Non-Clonable"
    // In Interaction Combinators, cloning happens during Commute (kind mismatch)
    if (a.kind !== b.kind) {
      if (a.modality === Modality.AMAN || b.modality === Modality.AMAN) {
        throw new SovereignError(
          SovereignErrorCode.AMAN_SOVEREIGNTY,
          { reason: "Security protocols cannot be fragmented or replicated during interaction." }
        );
      }
    }
    
    // 3. Ikhlas Requirement: Pure interactions must not have conflicting modalities
    if (a.modality === Modality.IKHLAS && b.modality === Modality.ADL) {
      // Small tension is allowed, but documented
      this.reductionLog.push(`Tension: IKHLAS meeting ADL. Seeking balance.`);
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
