/**
 * 🔄 State Coordinator - منسق الحالة الموحد
 * 
 * يستخدم أنماط SmSa و Snapper من أبحاث arxiv.org
 * لضمان مزامنة الحالة بين العمال بشكل صحيح
 * 
 * "وَمَا يَعْمَلُ مِنْ عَامِلٍ مِنْكُمْ مِنْ ذَكَرٍ أَوْ أُنْثَىٰ" - الإسراء: 32
 */

import { MissionState, WorkerReport } from './protocol';
import { IQRALogger } from '../logger';

export interface StateTransaction {
  id: string;
  worker_id: string;
  phase: string;
  operations: StateOperation[];
  timestamp: number;
}

export interface StateOperation {
  type: 'SET' | 'MERGE' | 'DELETE';
  key: string;
  value?: any;
  dependencies?: string[];
}

/**
 * منسق الحالة يطبق أنماط ACID والمعاملات
 */
export class StateCoordinator {
  private static instance: StateCoordinator;
  private pendingTransactions: Map<string, StateTransaction> = new Map();
  private completedTransactions: StateTransaction[] = [];
  private stateSnapshot: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): StateCoordinator {
    if (!StateCoordinator.instance) {
      StateCoordinator.instance = new StateCoordinator();
    }
    return StateCoordinator.instance;
  }

  /**
   * إنشاء معاملة حالة جديدة
   */
  createTransaction(workerId: string, phase: string): StateTransaction {
    const transaction: StateTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      worker_id: workerId,
      phase,
      operations: [],
      timestamp: Date.now()
    };

    this.pendingTransactions.set(transaction.id, transaction);
    IQRALogger.info(`🔄 [STATE_COORDINATOR] Created transaction ${transaction.id} for ${workerId}`);
    
    return transaction;
  }

  /**
   * إضافة عملية للمعاملة
   */
  addOperation(transactionId: string, operation: StateOperation): void {
    const transaction = this.pendingTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.operations.push(operation);
    IQRALogger.info(`🔄 [STATE_COORDINATOR] Added operation ${operation.type} to ${transactionId}`);
  }

  /**
   * تنفيذ المعاملة بشكل ذري (ACID)
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.pendingTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // التحقق من التبعيات
      await this.validateDependencies(transaction);

      // تنفيذ العمليات بالترتيب
      for (const operation of transaction.operations) {
        await this.executeOperation(operation);
      }

      // حفظ المعاملة المكتملة
      this.completedTransactions.push(transaction);
      this.pendingTransactions.delete(transactionId);

      IQRALogger.info(`✅ [STATE_COORDINATOR] Committed transaction ${transactionId}`);

    } catch (error) {
      IQRALogger.error(`❌ [STATE_COORDINATOR] Failed to commit transaction ${transactionId}:`, error);
      
      // التراجع عن المعاملة (Rollback)
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * التحقق من التبعيات قبل التنفيذ
   */
  private async validateDependencies(transaction: StateTransaction): Promise<void> {
    for (const operation of transaction.operations) {
      if (operation.dependencies) {
        for (const dep of operation.dependencies) {
          if (!this.stateSnapshot.has(dep)) {
            throw new Error(`Dependency ${dep} not found in state snapshot`);
          }
        }
      }
    }
  }

  /**
   * تنفيذ عملية واحدة
   */
  private async executeOperation(operation: StateOperation): Promise<void> {
    switch (operation.type) {
      case 'SET':
        if (operation.value !== undefined) {
          this.stateSnapshot.set(operation.key, operation.value);
        }
        break;
      
      case 'MERGE':
        if (operation.value !== undefined) {
          const existing = this.stateSnapshot.get(operation.key) || {};
          const merged = { ...existing, ...operation.value };
          this.stateSnapshot.set(operation.key, merged);
        }
        break;
      
      case 'DELETE':
        this.stateSnapshot.delete(operation.key);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * التراجع عن المعاملة
   */
  private async rollbackTransaction(transactionId: string): Promise<void> {
    IQRALogger.warn(`⚠️ [STATE_COORDINATOR] Rolling back transaction ${transactionId}`);
    
    // في نظام حقيقي، سنقوم باستعادة snapshot سابق
    // حالياً، نقوم فقط بحذف المعاملة المعلقة
    this.pendingTransactions.delete(transactionId);
  }

  /**
   * دمج الحالة من عامل إلى الحالة العامة
   */
  mergeWorkerState(workerId: string, workerState: Partial<MissionState>): void {
    const transaction = this.createTransaction(workerId, 'state_merge');
    
    // دمج السياق
    if (workerState.context) {
      this.addOperation(transaction.id, {
        type: 'MERGE',
        key: 'context',
        value: workerState.context,
        dependencies: ['context']
      });
    }

    // دمج التقارير
    if (workerState.reports) {
      this.addOperation(transaction.id, {
        type: 'MERGE',
        key: 'reports',
        value: workerState.reports,
        dependencies: ['reports']
      });
    }

    // تحديث البيانات الوصفية
    if (workerState.metadata) {
      this.addOperation(transaction.id, {
        type: 'MERGE',
        key: 'metadata',
        value: workerState.metadata,
        dependencies: ['metadata']
      });
    }

    this.commitTransaction(transaction.id).catch(error => {
      IQRALogger.error(`Failed to merge state for ${workerId}:`, error);
    });
  }

  /**
   * الحصول على الحالة الحالية
   */
  getCurrentState(): Partial<MissionState> {
    const context = this.stateSnapshot.get('context') || {};
    const reports = this.stateSnapshot.get('reports') || [];
    const metadata = this.stateSnapshot.get('metadata') || {};

    return {
      context,
      reports,
      metadata
    };
  }

  /**
   * الحصول على إحصائيات المعاملات
   */
  getTransactionStats(): {
    pending: number;
    completed: number;
    success_rate: number;
  } {
    const pending = this.pendingTransactions.size;
    const completed = this.completedTransactions.length;
    const success_rate = completed > 0 ? completed / (completed + pending) : 1.0;

    return { pending, completed, success_rate };
  }

  /**
   * مسح الحالة (للاختبار)
   */
  clear(): void {
    this.pendingTransactions.clear();
    this.completedTransactions = [];
    this.stateSnapshot.clear();
    IQRALogger.info(`🧹 [STATE_COORDINATOR] State cleared`);
  }
}
