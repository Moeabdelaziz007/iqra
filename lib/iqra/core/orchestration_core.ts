/**
 * Orchestration Core - النواة المركزية للـ Orchestration
 * 
 * "وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — مريم: 64
 * 
 * نواة موحدة ومحسّنة للـ orchestration بدون تكرار
 */

import { MissionState, WorkerReport, WorkerResult } from '../workers/protocol';
import { IQRALogger } from '../logger';

export interface OrchestrationMetrics {
  totalMissions: number;
  successfulMissions: number;
  failedMissions: number;
  averageExecutionTime: number;
  lastUpdated: number;
}

export interface WorkerChainResult {
  success: boolean;
  reports: WorkerReport[];
  finalState: MissionState;
  response: string;
  executionTime: number;
  metrics: OrchestrationMetrics;
}

export class OrchestrationCore {
  private static metrics: OrchestrationMetrics = {
    totalMissions: 0,
    successfulMissions: 0,
    failedMissions: 0,
    averageExecutionTime: 0,
    lastUpdated: Date.now()
  };

  /**
   * تنفيذ سلسلة الـ workers بشكل محسّن
   */
  static async executeWorkerChain(
    initialInput: string,
    workers: string[],
    executeWorker: (phase: string, input: string, state: MissionState) => Promise<WorkerResult>
  ): Promise<WorkerChainResult> {
    const startTime = Date.now();
    
    // تهيئة الحالة الأولية
    let state: MissionState = {
      initial_input: initialInput,
      reports: [],
      context: {},
      assigned_skills: this.classifySkills(initialInput),
      metadata: {
        start_time: startTime,
        mission_id: this.generateMissionId()
      }
    };

    const reports: WorkerReport[] = [];
    let finalResponse = '';
    let chainSuccess = true;

    // تنفيذ سلسلة الـ workers
    for (const workerId of workers) {
      try {
        IQRALogger.info(`🔄 [CORE] Executing ${workerId}...`);
        
        const result = await executeWorker(workerId, initialInput, state);
        
        if (!result.success) {
          IQRALogger.warn(`⚠️ [CORE] ${workerId} failed: ${result.error}`);
          chainSuccess = false;
          finalResponse = `Mission Aborted: ${workerId} Failure${result.error ? ` - ${result.error}` : ''}`;
          break;
        }

        // تحديث الحالة
        if (result.updated_state) {
          state = result.updated_state;
        }
        
        if (result.report) {
          reports.push(result.report);
          state.reports = reports;
        }

        // تحديث السياق للـ worker التالي
        if (result.context_data) {
          state.context = { ...state.context, ...result.context_data };
        }

        finalResponse = result.data || finalResponse;
        
      } catch (error) {
        IQRALogger.error(`❌ [CORE] ${workerId} error:`, error);
        chainSuccess = false;
        finalResponse = `Mission Aborted: ${workerId} Error - ${error}`;
        break;
      }
    }

    const executionTime = Date.now() - startTime;
    
    // تحديث المقاييس
    this.updateMetrics(chainSuccess, executionTime);

    return {
      success: chainSuccess,
      reports,
      finalState: state,
      response: finalResponse,
      executionTime,
      metrics: this.metrics
    };
  }

  /**
   * تصنيف المهارات بشكل مبسط وموحّد
   */
  private static classifySkills(input: string): string[] {
    const skills: string[] = [];
    const lowerInput = input.toLowerCase();

    // أنماط التصنيف الموحدة
    const skillPatterns = {
      'coding': /\b(code|function|class|programming|برمجة|دالة|فئة)\b/,
      'quran_analysis': /\b(quran|آية|سورة|قرآن|verse|surah)\b/,
      'research': /\b(research|بحث|study|دراسة|analysis|تحليل)\b/,
      'validation': /\b(validate|check|verify|تحقق|تأكد)\b/,
      'resonance': /\b(resonance|رنين|vibration|ذبذب)\b/
    };

    for (const [skill, pattern] of Object.entries(skillPatterns)) {
      if (pattern.test(lowerInput)) {
        skills.push(skill);
      }
    }

    return skills.length > 0 ? skills : ['general'];
  }

  /**
   * إنشاء معرف مهمة فريد
   */
  private static generateMissionId(): string {
    return `mission_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * تحديث مقاييس الأداء
   */
  private static updateMetrics(success: boolean, executionTime: number): void {
    this.metrics.totalMissions++;
    
    if (success) {
      this.metrics.successfulMissions++;
    } else {
      this.metrics.failedMissions++;
    }

    // تحديث متوسط وقت التنفيذ
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalMissions - 1) + executionTime) / 
      this.metrics.totalMissions;

    this.metrics.lastUpdated = Date.now();
  }

  /**
   * الحصول على المقاييس الحالية
   */
  static getMetrics(): OrchestrationMetrics {
    return { ...this.metrics };
  }

  /**
   * إعادة تعيين المقاييس
   */
  static resetMetrics(): void {
    this.metrics = {
      totalMissions: 0,
      successfulMissions: 0,
      failedMissions: 0,
      averageExecutionTime: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * التحقق من صحة الحالة
   */
  static validateState(state: MissionState): boolean {
    if (!state || typeof state !== 'object') {
      return false;
    }

    const requiredFields = ['initial_input', 'reports', 'context', 'metadata'];
    for (const field of requiredFields) {
      if (!(field in state)) {
        IQRALogger.warn(`⚠️ [CORE] Missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * تنظيف السياق من البيانات الفاسدة
   */
  static sanitizeContext(context: any): any {
    if (!context || typeof context !== 'object') {
      return {};
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(context)) {
      // إزالة القيم الفاسدة
      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'string') {
        // إزالة القيم الخطرة
        if (value.includes('Error:') || value.includes('Exception:') || value.includes('undefined')) {
          continue;
        }
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * دمج السياق بين الـ workers
   */
  static mergeContext(currentContext: any, newContext: any): any {
    return {
      ...currentContext,
      ...newContext,
      timestamp: Date.now()
    };
  }

  /**
   * التحقق من اكتمال سلسلة الـ workers
   */
  static isChainComplete(reports: WorkerReport[], expectedWorkers: string[]): boolean {
    const completedWorkers = reports.map(r => r.worker_id);
    return expectedWorkers.every(worker => completedWorkers.includes(worker));
  }

  /**
   * حساب معدل النجاح
   */
  static getSuccessRate(): number {
    if (this.metrics.totalMissions === 0) {
      return 0;
    }
    return (this.metrics.successfulMissions / this.metrics.totalMissions) * 100;
  }

  /**
   * الحصول على توصيات الأداء
   */
  static getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const successRate = this.getSuccessRate();

    if (successRate < 80) {
      recommendations.push(`معدل النجاح منخفض (${successRate.toFixed(1)}%) - يجب مراجعة تكوين الـ workers`);
    }

    if (this.metrics.averageExecutionTime > 20000) {
      recommendations.push(`متوسط وقت التنفيذ مرتفع (${this.metrics.averageExecutionTime}ms) - يجب تحسين الأداء`);
    }

    if (this.metrics.totalMissions > 100) {
      recommendations.push('عدد المهام كبير - يجب النظر في تحسين الموارد');
    }

    return recommendations;
  }
}
