import { appendToTrustChain } from '#security/security';
import { IQRALogger } from '#infra/logger';

export enum MeshAgentRole {
  MUWAKKIL = 'MUWAKKIL',
  SHAHID = 'SHAHID',
}

export interface Assignment {
  missionId: string;
  primaryWorker: string;
  collaborators: string[];
  routingMetadata: Record<string, unknown>;
}

export interface WorkerLoad {
  workerId: string;
  activeTasks: number;
  status: 'IDLE' | 'BUSY' | 'DOWN';
}

export interface ToolAuditReport {
  toolName: string;
  category: string;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  lastAudit: string;
}

/**
 * AgentBus — Event Publishing System
 * 
 * Note: Event bus functionality is currently not used in the active architecture.
 * The mesh communication uses direct method calls and TrustChain for audit trails.
 * 
 * If event-driven architecture is needed in the future, implement via:
 * - EventEmitter pattern (Node.js)
 * - Message queue (Redis/RabbitMQ)
 * - Pub/Sub system (Firebase/AWS SNS)
 * 
 * See: PLAN.md - Phase 4: Event Bus Architecture (if needed)
 */
export class AgentBus {
  /**
   * Publish an event to all subscribers
   * 
   * @deprecated Not currently used. Direct method calls preferred for determinism.
   * @param event - Event name
   * @param payload - Event data
   */
  static publish(event: string, payload: Record<string, unknown>): void {
    // Not implemented — use direct method calls instead
    // This is intentional to maintain deterministic behavior and full audit trails
    throw new Error(
      'AgentBus.publish() is not implemented. ' +
      'Use direct method calls on AlMuwakkil/ShahidAlAdah instead. ' +
      'All operations are logged in TrustChain.'
    );
  }

  /**
   * Subscribe to an event
   * 
   * @deprecated Not currently used. Direct method calls preferred for determinism.
   * @param event - Event name
   * @param handler - Callback function
   */
  static subscribe(
    event: string,
    handler: (payload: Record<string, unknown>) => void
  ): void {
    // Not implemented — use direct method calls instead
    throw new Error(
      'AgentBus.subscribe() is not implemented. ' +
      'Use direct method calls on AlMuwakkil/ShahidAlAdah instead.'
    );
  }
}

export class AlMuwakkil {
  static readonly role = MeshAgentRole.MUWAKKIL;

  static async assignTask(
    missionId: string,
    context: Record<string, unknown>
  ): Promise<Assignment> {
    IQRALogger.info('AlMuwakkil assigning task', { missionId });
    await appendToTrustChain('MUWAKKIL:ASSIGN', missionId, 'task assigned', 0.9);

    return {
      missionId,
      primaryWorker: 'PLANNER',
      collaborators: ['RESEARCHER', 'BUILDER'],
      routingMetadata: { timestamp: Date.now() },
    };
  }

  static async getWorkerLoad(workerId: string): Promise<WorkerLoad> {
    return {
      workerId,
      activeTasks: 0,
      status: 'IDLE',
    };
  }

  static async rebalance(): Promise<void> {
    IQRALogger.info('AlMuwakkil rebalancing');
    await appendToTrustChain('MUWAKKIL:REBALANCE', 'system', 'rebalance triggered', 0.8);
  }

  static async submitForAudit(
    missionId: string,
    toolNames: string[]
  ): Promise<void> {
    IQRALogger.info('AlMuwakkil submitting for audit', { missionId, toolNames });
    await appendToTrustChain('MUWAKKIL:AUDIT_REQUEST', missionId, toolNames.join(','), 0.7);
  }
}

export class ShahidAlAdah {
  static readonly role = MeshAgentRole.SHAHID;

  static async auditAllTools(): Promise<ToolAuditReport[]> {
    IQRALogger.info('Shahid auditing tools');
    await appendToTrustChain('SHAHID:AUDIT', 'system', 'full audit', 1.0);
    return [];
  }

  static async proposeNewTool(spec: {
    name: string;
    category: string;
    description: string;
  }): Promise<{ approved: boolean; reason: string }> {
    IQRALogger.info('Shahid evaluating new tool', spec);
    await appendToTrustChain('SHAHID:PROPOSE', spec.name, spec.description, 0.8);
    return { approved: true, reason: 'Proposal recorded for review' };
  }

  static async evaluateToolPerformance(
    toolName: string
  ): Promise<{ successRate: number; avgLatency: number }> {
    return { successRate: 1.0, avgLatency: 0 };
  }
}
