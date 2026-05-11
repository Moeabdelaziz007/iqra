/**
 * 📜 IQRA Runtime Manifest — دستور التشغيل السيادي
 * "قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا" — الطلاق: 3
 * 
 * النية: توفير سجل مركزي للهوية، المهارات، والقيود الحاكمة للتشغيل.
 * هذا النظام مستلهم من بنية Gemini-3.0 Superpowers.
 */

export enum RiskLevel {
  LOW = "LOW",       // عمليات قراءة فقط، لا خطر
  MEDIUM = "MEDIUM", // عمليات تعديل بسيطة، تتطلب مراجعة
  HIGH = "HIGH",     // عمليات خطيرة (مثل مسح ملفات أو وصول للنظام)، تتطلب موافقة بشرية أو تفتيش صارم
  CRITICAL = "CRITICAL" // عمليات سيادية لا يقوم بها إلا النظام الأساسي
}

export interface SkillManifest {
  name: string;
  purpose: string;
  intent_ar: string;
  risk_level: RiskLevel;
  allowed_tools: string[];
  memory_access: {
    read: boolean;
    write: boolean;
    level: "HOT" | "WARM" | "COLD";
  };
  auto_trigger_rules: string[]; // الكلمات المفتاحية أو الأنماط التي تفعل هذه المهارة
}

export interface AgentPersona {
  name: string;
  title: string;
  constitutional_focus: string[];
  behavioral_discipline: string[];
}

export class RuntimeManifest {
  private static instance: RuntimeManifest;
  private persona: AgentPersona = {
    name: "IQRA",
    title: "Sovereign Cognitive Runtime",
    constitutional_focus: ["Truth", "Integrity", "Self-Evolution", "Memory-Augmented Reasoning"],
    behavioral_discipline: [
      "Observe before Acting",
      "Validate every Reasoning step",
      "Log every Insight to Trust Chain",
      "Reject Hallucinations with high penalty"
    ]
  };

  private skills: Map<string, SkillManifest> = new Map();

  private constructor() {
    // تحميل المهارات الأساسية افتراضياً
    this.registerDefaultSkills();
  }

  public static getInstance(): RuntimeManifest {
    if (!RuntimeManifest.instance) {
      RuntimeManifest.instance = new RuntimeManifest();
    }
    return RuntimeManifest.instance;
  }

  public getPersona(): AgentPersona {
    return this.persona;
  }

  public registerSkill(skill: SkillManifest): void {
    this.skills.set(skill.name, skill);
  }

  public getSkill(name: string): SkillManifest | undefined {
    return this.skills.get(name);
  }

  public listSkills(): SkillManifest[] {
    return Array.from(this.skills.values());
  }

  /**
   * ✅ التحقق من صلاحية تنفيذ أداة معينة بواسطة مهارة محددة
   */
  public canExecuteAction(skillName: string, toolName: string): { allowed: boolean; reason?: string; risk?: RiskLevel } {
    const skill = this.skills.get(skillName);
    if (!skill) {
      return { allowed: false, reason: `Skill '${skillName}' is not registered in manifest.` };
    }

    const toolAllowed = skill.allowed_tools.includes(toolName) || skill.allowed_tools.includes("*");
    if (!toolAllowed) {
      return { 
        allowed: false, 
        reason: `Tool '${toolName}' is not allowed for skill '${skillName}'.`,
        risk: skill.risk_level
      };
    }

    return { allowed: true, risk: skill.risk_level };
  }

  private registerDefaultSkills(): void {
    this.registerSkill({
      name: "GhostSearch",
      purpose: "Deep web exploration for truth discovery",
      intent_ar: "البحث العميق عن الحقيقة في الشبكة",
      risk_level: RiskLevel.LOW,
      allowed_tools: ["search_web", "read_url_content"],
      memory_access: { read: true, write: true, level: "WARM" },
      auto_trigger_rules: ["search", "find", "research", "تحقق", "ابحث"]
    });

    this.registerSkill({
      name: "MemoryBuilder",
      purpose: "Constructing long-term pattern memory",
      intent_ar: "بناء الذاكرة النمطية طويلة الأمد",
      risk_level: RiskLevel.MEDIUM,
      allowed_tools: ["save_pattern", "update_topology"],
      memory_access: { read: true, write: true, level: "COLD" },
      auto_trigger_rules: ["save", "remember", "learn", "احفظ", "تعلم"]
    });

    this.registerSkill({
      name: "GitSovereign",
      purpose: "Managed repository operations with high integrity",
      intent_ar: "إدارة المستودعات البرمجية بسيادة ونزاهة عالية",
      risk_level: RiskLevel.HIGH,
      allowed_tools: ["git_add", "git_commit", "git_push", "git_checkout", "gh_pr_create"],
      memory_access: { read: true, write: false, level: "WARM" },
      auto_trigger_rules: ["commit", "push", "branch", "pr", "ارفع", "فرع"]
    });
  }
}
