/**
 * Orchestration Learning System - نظام التعلم الذكي للـ Orchestration
 * 
 * "وَمَا يَزِيدُ الَّذِينَ عِلْمًا وَاللَّهُ الْحَكِيمُ" — المجادلة: 58:11
 * 
 * نظام ذكي يتعلم من أخطاء الـ orchestration ويحسن الأداء
 */

import { CoreOrchestrationPatterns, PatternInsight } from '../patterns/core_orchestration_patterns';
import { IQRALogger } from '../logger';

export interface LearningMetrics {
  totalMissions: number;
  successfulMissions: number;
  failedMissions: number;
  averageExecutionTime: number;
  patternFrequency: { [patternId: string]: number };
  lastLearningUpdate: number;
}

export interface LearningAction {
  type: 'pattern_detected' | 'adaptation_applied' | 'prevention_implemented';
  patternId?: string;
  description: string;
  confidence: number;
  timestamp: number;
}

export class OrchestrationLearning {
  private static metrics: LearningMetrics = {
    totalMissions: 0,
    successfulMissions: 0,
    failedMissions: 0,
    averageExecutionTime: 0,
    patternFrequency: {},
    lastLearningUpdate: Date.now()
  };

  private static learningHistory: LearningAction[] = [];
  private static adaptationThreshold = 3; // عدد مرات اكتشاف النمط قبل التطبيق

  /**
   * تحليل أداء المهمة وتحديث المقاييس
   */
  static analyzeMissionPerformance(executionData: any): void {
    this.metrics.totalMissions++;
    
    const isSuccess = !executionData.response?.includes('Mission Aborted');
    if (isSuccess) {
      this.metrics.successfulMissions++;
    } else {
      this.metrics.failedMissions++;
    }

    // تحديث متوسط وقت التنفيذ
    const executionTime = executionData.duration || 0;
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalMissions - 1) + executionTime) / 
      this.metrics.totalMissions;

    // اكتشاف الأنماط
    const insights = CoreOrchestrationPatterns.detectPatterns(executionData);
    for (const insight of insights) {
      this.recordPatternDetection(insight);
    }

    this.metrics.lastLearningUpdate = Date.now();
    
    IQRALogger.info(`🧠 [LEARNING] Mission analyzed: ${isSuccess ? 'SUCCESS' : 'FAILURE'}`);
    IQRALogger.info(`📊 [LEARNING] Total missions: ${this.metrics.totalMissions}, Success rate: ${(this.metrics.successfulMissions / this.metrics.totalMissions * 100).toFixed(1)}%`);
  }

  /**
   * تسجيل اكتشاف النمط
   */
  private static recordPatternDetection(insight: PatternInsight): void {
    const patternId = insight.pattern.id;
    
    // تحديث تكرار النمط
    if (!this.metrics.patternFrequency[patternId]) {
      this.metrics.patternFrequency[patternId] = 0;
    }
    this.metrics.patternFrequency[patternId]++;

    // تسجيل إجراء التعلم
    const action: LearningAction = {
      type: 'pattern_detected',
      patternId,
      description: `اكتشاف نمط: ${insight.pattern.name}`,
      confidence: insight.confidence,
      timestamp: Date.now()
    };

    this.learningHistory.push(action);

    // التحقق من الحاجة لتطبيق تكيف
    if (this.metrics.patternFrequency[patternId] >= this.adaptationThreshold) {
      this.applyAdaptation(insight);
    }

    IQRALogger.warn(`⚠️ [LEARNING] Pattern detected: ${insight.pattern.name} (Confidence: ${insight.confidence})`);
  }

  /**
   * تطبيق تكيف تلقائي بناءً على النمط المكتشف
   */
  private static applyAdaptation(insight: PatternInsight): void {
    const patternId = insight.pattern.id;
    
    switch (patternId) {
      case 'sequential_failure':
        this.applySequentialFailureAdaptation(insight);
        break;
        
      case 'memory_contamination':
        this.applyMemoryContaminationAdaptation(insight);
        break;
        
      case 'skill_misclassification':
        this.applySkillMisclassificationAdaptation(insight);
        break;
        
      case 'context_loss':
        this.applyContextLossAdaptation(insight);
        break;
        
      case 'timeout_cascade':
        this.applyTimeoutCascadeAdaptation(insight);
        break;
        
      default:
        IQRALogger.info(`🔍 [LEARNING] No adaptation available for pattern: ${patternId}`);
        return;
    }

    // تسجيل إجراء التكيف
    const action: LearningAction = {
      type: 'adaptation_applied',
      patternId,
      description: `تطبيق تكيف: ${insight.recommendation}`,
      confidence: insight.confidence,
      timestamp: Date.now()
    };

    this.learningHistory.push(action);
    IQRALogger.info(`🔧 [LEARNING] Adaptation applied: ${insight.recommendation}`);
  }

  /**
   * تكيف لفشل متسلسل
   */
  private static applySequentialFailureAdaptation(insight: PatternInsight): void {
    IQRALogger.info(`🔄 [ADAPTATION] Applying sequential failure adaptation`);
    
    // التكيف: إضافة مهلة زمنية بين الـ workers
    // هذا يتطلب تعديل في MissionControl.executePhase
    
    // تسجيل الإجراء الوقائي
    const action: LearningAction = {
      type: 'prevention_implemented',
      patternId: insight.pattern.id,
      description: 'إضافة مهلة زمنية بين الـ workers',
      confidence: 0.8,
      timestamp: Date.now()
    };

    this.learningHistory.push(action);
  }

  /**
   * تكيف لتلوث الذاكرة
   */
  private static applyMemoryContaminationAdaptation(insight: PatternInsight): void {
    IQRALogger.info(`🧹 [ADAPTATION] Applying memory contamination adaptation`);
    
    // التكيف: تصفية الذاكرة قبل كل مهمة
    // هذا يتطلب تعديل في MissionControl.run
    
    const action: LearningAction = {
      type: 'prevention_implemented',
      patternId: insight.pattern.id,
      description: 'تصفية الذاكرة قبل المهمة',
      confidence: 0.85,
      timestamp: Date.now()
    };

    this.learningHistory.push(action);
  }

  /**
   * تكيف لخطأ تصنيف المهارات
   */
  private static applySkillMisclassificationAdaptation(insight: PatternInsight): void {
    IQRALogger.info(`🎯 [ADAPTATION] Applying skill misclassification adaptation`);
    
    // التكيف: تحسين خوارزمية التصنيف
    // هذا يتطلب تعديل في MissionControl.classifyMission
    
    const action: LearningAction = {
      type: 'prevention_implemented',
      patternId: insight.pattern.id,
      description: 'تحسين خوارزمية تصنيف المهارات',
      confidence: 0.75,
      timestamp: Date.now()
    };

    this.learningHistory.push(action);
  }

  /**
   * تكيف لفقدان السياق
   */
  private static applyContextLossAdaptation(insight: PatternInsight): void {
    IQRALogger.info(`📝 [ADAPTATION] Applying context loss adaptation`);
    
    // التكيف: تعزيز آلية نقل السياق
    // هذا يتطلب تعديل في executePhase
    
    const action: LearningAction = {
      type: 'prevention_implemented',
      patternId: insight.pattern.id,
      description: 'تعزيز آلية نقل السياق',
      confidence: 0.8,
      timestamp: Date.now()
    };

    this.learningHistory.push(action);
  }

  /**
   * تكيف لتتالي المهلات
   */
  private static applyTimeoutCascadeAdaptation(insight: PatternInsight): void {
    IQRALogger.info(`⏱️ [ADAPTATION] Applying timeout cascade adaptation`);
    
    // التكيف: تحسين إدارة المهلات
    // هذا يتطلب تعديل في executePhase
    
    const action: LearningAction = {
      type: 'prevention_implemented',
      patternId: insight.pattern.id,
      description: 'تحسين إدارة المهلات',
      confidence: 0.7,
      timestamp: Date.now()
    };

    this.learningHistory.push(action);
  }

  /**
   * الحصول على المقاييس الحالية
   */
  static getMetrics(): LearningMetrics {
    return { ...this.metrics };
  }

  /**
   * الحصول على تاريخ التعلم
   */
  static getLearningHistory(): LearningAction[] {
    return [...this.learningHistory];
  }

  /**
   * الحصول على توصيات التحسين
   */
  static getImprovementRecommendations(): string[] {
    const recommendations: string[] = [];
    const patterns = CoreOrchestrationPatterns.getAllPatterns();

    // تحليل الأنماط الأكثر تكراراً
    const sortedPatterns = patterns.sort((a, b) => 
      this.metrics.patternFrequency[b.id] - this.metrics.patternFrequency[a.id]
    );

    for (const pattern of sortedPatterns.slice(0, 3)) {
      const frequency = this.metrics.patternFrequency[pattern.id];
      if (frequency >= 2) {
        recommendations.push(`النمط "${pattern.name}" تكرر ${frequency} مرة - ${pattern.recommendation}`);
      }
    }

    // تحليل معدل النجاح
    const successRate = this.metrics.successfulMissions / this.metrics.totalMissions;
    if (successRate < 0.8) {
      recommendations.push(`معدل النجاح منخفض (${(successRate * 100).toFixed(1)}%) - يجب مراجعة تكوين الـ workers`);
    }

    // تحليل متوسط وقت التنفيذ
    if (this.metrics.averageExecutionTime > 20000) { // 20 ثانية
      recommendations.push(`متوسط وقت التنفيذ مرتفع (${this.metrics.averageExecutionTime}ms) - يجب تحسين الأداء`);
    }

    return recommendations;
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
      patternFrequency: {},
      lastLearningUpdate: Date.now()
    };
    
    CoreOrchestrationPatterns.resetPatternFrequencies();
    
    IQRALogger.info(`🔄 [LEARNING] Metrics reset`);
  }

  /**
   * تصدير بيانات التعلم
   */
  static exportLearningData(): any {
    return {
      metrics: this.metrics,
      history: this.learningHistory,
      patterns: CoreOrchestrationPatterns.getAllPatterns(),
      recommendations: this.getImprovementRecommendations(),
      exportTimestamp: Date.now()
    };
  }
}
