/**
 * Core Orchestration Patterns - أنماط الـ Orchestration الأساسية
 * 
 * "وَمَا كَانَ رَبُّكَ نَسِيًّا" — مريم: 64
 * 
 * اكتشاف وتوثيق الأنماط الأساسية في نظام Sovereign Worker Orchestration
 */

export interface CorePattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  lastDetected: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PatternInsight {
  pattern: CorePattern;
  context: string;
  recommendation: string;
  confidence: number;
}

export class CoreOrchestrationPatterns {
  private static patterns: Map<string, CorePattern> = new Map();

  /**
   * تهيئة الأنماط الأساسية المعروفة
   */
  static initializePatterns(): void {
    // Pattern 1: Sequential Worker Failure
    this.patterns.set('sequential_failure', {
      id: 'sequential_failure',
      name: 'فشل متسلسل للـ Workers',
      description: 'عندما يفشل worker واحد، يزداد احتمال فشل الـ workers التالية',
      frequency: 0,
      lastDetected: 0,
      severity: 'high'
    });

    // Pattern 2: Memory Contamination
    this.patterns.set('memory_contamination', {
      id: 'memory_contamination',
      name: 'تلوث الذاكرة',
      description: 'عندما تؤثر البيانات الخاطئة على قرارات الـ workers اللاحقة',
      frequency: 0,
      lastDetected: 0,
      severity: 'critical'
    });

    // Pattern 3: Skill Misclassification
    this.patterns.set('skill_misclassification', {
      id: 'skill_misclassification',
      name: 'خطأ في تصنيف المهارات',
      description: 'عندما يتم تصنيف المدخل بشكل خاطئ مما يؤدي إلى اختيار worker غير مناسب',
      frequency: 0,
      lastDetected: 0,
      severity: 'medium'
    });

    // Pattern 4: Context Loss
    this.patterns.set('context_loss', {
      id: 'context_loss',
      name: 'فقدان السياق',
      description: 'عندما يفقد النظام السياق أثناء انتقال البيانات بين الـ workers',
      frequency: 0,
      lastDetected: 0,
      severity: 'high'
    });

    // Pattern 5: Timeout Cascade
    this.patterns.set('timeout_cascade', {
      id: 'timeout_cascade',
      name: 'تتالي المهلات',
      description: 'عندما يؤدي مهل worker واحد إلى مهل الـ workers التالية',
      frequency: 0,
      lastDetected: 0,
      severity: 'medium'
    });

    // Pattern 6: Reward Inflation
    this.patterns.set('reward_inflation', {
      id: 'reward_inflation',
      name: 'تضخم المكافآت',
      description: 'عندما يتم منح مكافآت مرتفعة بشكل غير مبرر',
      frequency: 0,
      lastDetected: 0,
      severity: 'low'
    });

    // Pattern 7: Validation Overload
    this.patterns.set('validation_overload', {
      id: 'validation_overload',
      name: 'إرهاق التحقق',
      description: 'عندما يقوم Validation Worker بالتحقق من أكثر من اللازم',
      frequency: 0,
      lastDetected: 0,
      severity: 'medium'
    });
  }

  /**
   * اكتشاف الأنماط في تنفيذ المهمة
   */
  static detectPatterns(executionData: any): PatternInsight[] {
    const insights: PatternInsight[] = [];
    const now = Date.now();

    for (const [patternId, pattern] of this.patterns.entries()) {
      const insight = this.analyzePattern(patternId, pattern, executionData, now);
      if (insight) {
        insights.push(insight);
        // تحديث تكرار النمط
        pattern.frequency++;
        pattern.lastDetected = now;
      }
    }

    return insights;
  }

  /**
   * تحليل نمط معين
   */
  private static analyzePattern(
    patternId: string, 
    pattern: CorePattern, 
    executionData: any, 
    timestamp: number
  ): PatternInsight | null {
    switch (patternId) {
      case 'sequential_failure':
        return this.detectSequentialFailure(executionData, pattern, timestamp);
      
      case 'memory_contamination':
        return this.detectMemoryContamination(executionData, pattern, timestamp);
      
      case 'skill_misclassification':
        return this.detectSkillMisclassification(executionData, pattern, timestamp);
      
      case 'context_loss':
        return this.detectContextLoss(executionData, pattern, timestamp);
      
      case 'timeout_cascade':
        return this.detectTimeoutCascade(executionData, pattern, timestamp);
      
      case 'reward_inflation':
        return this.detectRewardInflation(executionData, pattern, timestamp);
      
      case 'validation_overload':
        return this.detectValidationOverload(executionData, pattern, timestamp);
      
      default:
        return null;
    }
  }

  /**
   * اكتشاف فشل متسلسل للـ Workers
   */
  private static detectSequentialFailure(
    executionData: any, 
    pattern: CorePattern, 
    timestamp: number
  ): PatternInsight | null {
    const reports = executionData.reports || [];
    const failures = reports.filter((r: any) => r.status === 'FAIL');
    
    // التحقق من وجود 3 فشل متتالي أو أكثر
    if (failures.length >= 3) {
      const consecutiveFailures = this.checkConsecutiveFailures(reports);
      if (consecutiveFailures >= 2) {
        return {
          pattern,
          context: `اكتشاف ${consecutiveFailures} فشل متتالي في ${reports.length} workers`,
          recommendation: 'يجب فحص حالة النظام وإعادة تهيئة الـ workers',
          confidence: 0.9
        };
      }
    }

    return null;
  }

  /**
   * اكتشاف تلوث الذاكرة
   */
  private static detectMemoryContamination(
    executionData: any, 
    pattern: CorePattern, 
    timestamp: number
  ): PatternInsight | null {
    const context = executionData.context || {};
    
    // التحقق من وجود بيانات غير متوقعة في السياق
    const contaminationSigns = [
      'undefined',
      'null',
      'Error:',
      'Exception:',
      'FAIL'
    ];

    const hasContamination = Object.values(context).some((value: any) => 
      contaminationSigns.some(sign => 
        typeof value === 'string' && value.includes(sign)
      )
    );

    if (hasContamination) {
      return {
        pattern,
        context: 'اكتشاف تلوث في بيانات السياق',
        recommendation: 'يجب تصفية الذاكرة وإعادة تهيئة السياق',
        confidence: 0.85
      };
    }

    return null;
  }

  /**
   * اكتشاف خطأ في تصنيف المهارات
   */
  private static detectSkillMisclassification(
    executionData: any, 
    pattern: CorePattern, 
    timestamp: number
  ): PatternInsight | null {
    const skills = executionData.assigned_skills || [];
    const actualWorkers = executionData.reports?.map((r: any) => r.worker_id) || [];
    
    // التحقق من عدم تطابق المهارات مع الـ workers الفعلية
    const skillWorkerMap: { [key: string]: string } = {
      'coding': 'ExecutionWorker',
      'quran_analysis': 'ResearchWorker',
      'research': 'ResearchWorker',
      'validation': 'ValidationWorker',
      'resonance': 'ResonanceWorker'
    };

    let mismatches = 0;
    for (const skill of skills) {
      const expectedWorker = skillWorkerMap[skill];
      if (expectedWorker && !actualWorkers.includes(expectedWorker)) {
        mismatches++;
      }
    }

    if (mismatches > 0) {
      return {
        pattern,
        context: `اكتشاف ${mismatches} عدم تطابق في تصنيف المهارات`,
        recommendation: 'يجب تحسين خوارزمية تصنيف المهارات',
        confidence: 0.75
      };
    }

    return null;
  }

  /**
   * اكتشاف فقدان السياق
   */
  private static detectContextLoss(
    executionData: any, 
    pattern: CorePattern, 
    timestamp: number
  ): PatternInsight | null {
    const reports = executionData.reports || [];
    
    // التحقق من فقدان البيانات أثناء انتقال الـ workers
    let contextLossCount = 0;
    for (let i = 1; i < reports.length; i++) {
      const prevReport = reports[i - 1];
      const currReport = reports[i];
      
      if (prevReport && currReport) {
        const prevContext = prevReport.context || {};
        const currContext = currReport.context || {};
        
        // التحقق من فقدان البيانات الهامة
        const lostKeys = Object.keys(prevContext).filter(key => 
          !(key in currContext) && key !== 'timestamp'
        );
        
        if (lostKeys.length > 2) {
          contextLossCount++;
        }
      }
    }

    if (contextLossCount >= 2) {
      return {
        pattern,
        context: `اكتشاف ${contextLossCount} حالات فقدان للسياق`,
        recommendation: 'يجب تحسين آلية نقل السياق بين الـ workers',
        confidence: 0.8
      };
    }

    return null;
  }

  /**
   * اكتشاف تتالي المهلات
   */
  private static detectTimeoutCascade(
    executionData: any, 
    pattern: CorePattern, 
    timestamp: number
  ): PatternInsight | null {
    const reports = executionData.reports || [];
    const startTime = executionData.start_time;
    
    // التحقق من وجود مهلات متتالية
    let timeoutCount = 0;
    for (const report of reports) {
      if (report.duration && report.duration > 30000) { // 30 ثانية
        timeoutCount++;
      }
    }

    if (timeoutCount >= 2) {
      return {
        pattern,
        context: `اكتشاف ${timeoutCount} مهل متتالية`,
        recommendation: 'يجب تحسين إدارة المهلات وإضافة آليات إعادة المحاولة',
        confidence: 0.7
      };
    }

    return null;
  }

  /**
   * اكتشاف تضخم المكافآت
   */
  private static detectRewardInflation(
    executionData: any, 
    pattern: CorePattern, 
    timestamp: number
  ): PatternInsight | null {
    const rewards = executionData.rewards || [];
    
    // التحقق من مكافآت مرتفعة بشكل غير طبيعي
    const totalReward = rewards.reduce((sum: number, r: any) => sum + (r.reward || 0), 0);
    const avgReward = totalReward / rewards.length;
    
    if (avgReward > 0.9) { // مكافأة متوسطة أعلى من 0.9
      return {
        pattern,
        context: `اكتشاف مكافآت مرتفعة (متوسط: ${avgReward.toFixed(2)})`,
        recommendation: 'يجب مراجعة خوارزمية حساب المكافآت',
        confidence: 0.6
      };
    }

    return null;
  }

  /**
   * اكتشاف إرهاق التحقق
   */
  private static detectValidationOverload(
    executionData: any, 
    pattern: CorePattern, 
    timestamp: number
  ): PatternInsight | null {
    const reports = executionData.reports || [];
    const validationReport = reports.find((r: any) => r.worker_id === 'ValidationWorker');
    
    if (validationReport) {
      const validations = validationReport.validations || [];
      
      // التحقق من عدد عمليات التحقق الزائدة
      if (validations.length > 10) {
        return {
          pattern,
          context: `اكتشاف إرهاق في التحقق (${validations.length} عملية)`,
          recommendation: 'يجب تحسين كفاءة Validation Worker',
          confidence: 0.65
        };
      }
    }

    return null;
  }

  /**
   * التحقق من وجود فشل متتالي
   */
  private static checkConsecutiveFailures(reports: any[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const report of reports) {
      if (report.status === 'FAIL') {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  /**
   * الحصول على جميع الأنماط
   */
  static getAllPatterns(): CorePattern[] {
    if (this.patterns.size === 0) {
      this.initializePatterns();
    }
    return Array.from(this.patterns.values());
  }

  /**
   * الحصول على إحصائيات الأنماط
   */
  static getPatternStatistics(): { [patternId: string]: CorePattern } {
    if (this.patterns.size === 0) {
      this.initializePatterns();
    }
    return Object.fromEntries(this.patterns.entries());
  }

  /**
   * تحديث تكرار النمط
   */
  static updatePatternFrequency(patternId: string): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.frequency++;
      pattern.lastDetected = Date.now();
    }
  }

  /**
   * إعادة تعيين تكرارات الأنماط
   */
  static resetPatternFrequencies(): void {
    for (const pattern of this.patterns.values()) {
      pattern.frequency = 0;
      pattern.lastDetected = 0;
    }
  }
}
