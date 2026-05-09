/**
 * IQRA Agent Constraints — القيود
 * 
 * Part of the Agent Contracts Foundation.
 * Implements the "Conservation of Budget" principle (arXiv:2601.08815).
 */

import { IQRALogger } from "#infra/logger.js";

export interface ResourceContract {
  agentId: string;
  missionId: string;
  maxTokens: number;
  maxTimeMs: number;
  tokensConsumed: number;
  startTime: number;
  isBreached: boolean;
  provenance: string;
}

export class ContractGuard {
  private static contracts: Map<string, ResourceContract> = new Map();

  /**
   * Initialize a new contract for an agent mission
   */
  static openContract(agentId: string, missionId: string, budget: { tokens: number, timeMs: number }): ResourceContract {
    const contract: ResourceContract = {
      agentId,
      missionId,
      maxTokens: budget.tokens,
      maxTimeMs: budget.timeMs,
      tokensConsumed: 0,
      startTime: Date.now(),
      isBreached: false,
      provenance: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.contracts.set(`${agentId}:${missionId}`, contract);
    IQRALogger.info(`📜 [CONTRACT] Opened for ${agentId} on mission ${missionId}`);
    return contract;
  }

  /**
   * Verify if an agent is still within its contract bounds
   */
  static verify(agentId: string, missionId: string): boolean {
    const contract = this.contracts.get(`${agentId}:${missionId}`);
    if (!contract) {
      IQRALogger.error(`⚠️ [CONTRACT_BREACH] No active contract found for ${agentId}`);
      return false;
    }

    const elapsed = Date.now() - contract.startTime;
    if (elapsed > contract.maxTimeMs) {
      contract.isBreached = true;
      IQRALogger.error(`⚠️ [CONTRACT_BREACH] Temporal limit exceeded for ${agentId} (${elapsed}ms > ${contract.maxTimeMs}ms)`);
      return false;
    }

    if (contract.tokensConsumed > contract.maxTokens) {
      contract.isBreached = true;
      IQRALogger.error(`⚠️ [CONTRACT_BREACH] Token budget exceeded for ${agentId} (${contract.tokensConsumed} > ${contract.maxTokens})`);
      return false;
    }

    return true;
  }

  /**
   * Record resource consumption
   */
  static updateUsage(agentId: string, missionId: string, tokens: number) {
    const contract = this.contracts.get(`${agentId}:${missionId}`);
    if (contract) {
      contract.tokensConsumed += tokens;
    }
  }

  /**
   * Close and archive a contract
   */
  static closeContract(agentId: string, missionId: string) {
    this.contracts.delete(`${agentId}:${missionId}`);
    IQRALogger.info(`🔒 [CONTRACT] Closed for ${agentId}`);
  }
}
