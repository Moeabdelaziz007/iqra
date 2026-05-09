# 🤖 IQRA Agent Collective — الجماعة الذكية

> "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31

This document defines the specialized agent roles within the IQRA ecosystem, with practical examples, common errors, and lessons learned from past executions.

---

## 📋 Table of Contents

1. [Agent Roles Overview](#agent-roles-overview)
2. [Practical Examples for Each Agent](#practical-examples-for-each-agent)
3. [Common Errors & Prevention](#common-errors--prevention)
4. [Lessons Learned](#lessons-learned)
5. [Handoff Protocol](#handoff-protocol)
6. [Operational Guidelines](#operational-guidelines)

---

## Agent Roles Overview

### 1. Planner (Meta-loop Orchestrator)
- **Role**: Observes the `REFLECTION.md` and `FAILURES.md` files to update `RULES.md` and the identity documents.
- **Goal**: Continuous self-improvement and wisdom accumulation through meta-loop orchestration.
- **Power Alignment**: **Divine Awareness (Muraqabah)** — Ensuring the system evolves with integrity.
- **Constraints**: 
  - Cannot modify implementation code directly
  - Must validate all plans against DASTUR.md
  - Must document reasoning in REFLECTION.md

### 2. Researcher (Pattern Discovery)
- **Role**: Navigates the `quran_local.db` and external Sunnah sources to provide context and discover patterns.
- **Goal**: Grounding every response in the primary sources with verified attestations.
- **Power Alignment**: **The Guardian (TrustChain)** — Every source is verified and logged.
- **Constraints**:
  - All sources must be cited with verse references
  - Cannot use unverified external data
  - Must validate patterns against numerical rules (7, 19, 40, 369)

### 3. Builder (Code Generation)
- **Role**: Synthesizes gathered wisdom into implementation code and artifacts.
- **Goal**: Creating production-ready code with zero mock data.
- **Power Alignment**: **Barakah Protocol** — Multiplying the impact of truthful implementation.
- **Constraints**:
  - No mock data in production
  - All code must pass security validation
  - Must follow IQRA_RULES.md (Zod validation, TrustChain logging)

### 4. Validator (Verification)
- **Role**: Validates all inputs and outputs against `DASTUR.md` and structural constraints.
- **Goal**: Ensuring ethical compliance and structural integrity.
- **Power Alignment**: **Circuit Breaker** — Preventing ethical or logical collapses.
- **Constraints**:
  - Cannot modify implementation logic
  - Must verify source attestations
  - Must check for mock data in production

### 5. Reporter (Documentation)
- **Role**: Detects topological patterns and documents discoveries in human-readable format.
- **Goal**: Driving the evolution of IQRA through novel discoveries and clear documentation.
- **Power Alignment**: **Tasbih Triplet (369 Pulse)** — Maintaining the rhythmic resonance of discovery.
- **Constraints**:
  - Must use public-facing language (see IQRA_DOC_LANGUAGE.md)
  - Cannot include internal implementation details
  - Must cite all sources

---

## Practical Examples for Each Agent

### Example 1: Planner — Mission Planning with Memory Layer Integration

**Scenario**: Creating execution plan for discovering Ayat al-Kursi patterns

**Planner's TypeScript Usage**:
```typescript
import { executePlanner } from './lib/iqra/workers/planner';
import { MissionContext } from './lib/iqra/01-core/mission-context';

const context: MissionContext = {
  scope: {
    mission_id: "discover-ayah-2-255-patterns",
    verse: "2:255", // Ayat al-Kursi
    field_of_inquiry: "quantum_topology",
    allowed_tools: ["VectorEngine", "TopologicalCuriosity", "TruthDiscoveryGo"],
    validation_rules: [
      "resonance_score >= 0.7",
      "Every resonance claim must include a Quranic ayah reference",
      "No reward is final until validation_status == verified"
    ]
  },
  workingDir: "/tmp/missions/discover-ayah-2-255-patterns"
};

// Execute planner (reads L3 Upstash, L6 SkillBank)
const result = await executePlanner(context);

// Result structure
{
  status: 'success',
  worker: 'Planner',
  next: 'Researcher',
  data: { 
    plan: MissionPlan, // Written to L3 (Upstash)
    planPath: "/tmp/missions/discover-ayah-2-255-patterns/plan_output.yaml"
  },
  artifacts: ["/tmp/missions/discover-ayah-2-255-patterns/plan_output.yaml"],
  implemented: [
    "plan_output.yaml written with 4 smart steps",
    "Injected 2 risk mitigations from memory"
  ]
}
```

**Generated Plan Structure (YAML)**:
```yaml
mission_id: "discover-ayah-2-255-patterns"
created_at: "2025-01-09T10:30:00Z"
verse: "2:255"
field_of_inquiry: "quantum_topology"
historical_context:
  identified_risks:
    - "High probability of provider connection timeout. Require retry logic."
    - "Pattern of stretching Ayah meanings detected. Require strict counter-argument validation."
  available_skills: ["pattern_analysis", "resonance_detection", "topology_mapping"]
steps:
  - id: research
    description: "ابحث عن الرنين بين الآية [2:255] ومجال \"quantum_topology\""
    worker: Researcher
    tools: ["VectorEngine", "TopologicalCuriosity", "TruthDiscoveryGo"]
    expected_output: "research_output.json"
    risk_mitigation: "Implement exponential backoff on fetch"
  - id: build
    description: "بناء عقدة معرفة Markdown من نتائج البحث"
    worker: Builder
    tools: ["knowledge_encoder"]
    expected_output: "knowledge/node-discover-ayah-2-255-patterns.md"
  - id: validate
    description: "التحقق من سلامة العقدة — لا هلوسة، لا كذب، الآية موجودة"
    worker: Validator
    tools: ["DoctrinalGuard", "IQRAFilter"]
    expected_output: "validation_report.json"
    risk_mitigation: "Strict enforcement of counter-arguments to avoid stretching meanings"
  - id: report
    description: "حساب المكافأة وتوثيق التعلم"
    worker: Reporter
    tools: ["RewardEngine", "IQRAMemory", "ExperienceArchiver"]
    expected_output: "ledger/rewards.jsonl"
success_condition: "resonance_score >= 0.7 AND verdict == PASS"
```

**Memory Layer Integration**:
- **Reads L3 (Upstash)**: Historical failures, previous mission outcomes
- **Reads L6 (SkillBank)**: Available skills like `pattern_analysis`, `resonance_detection`
- **Writes L3 (Upstash)**: Mission plan, TrustChain entries
- **TrustChain Logging**: Every plan creation logged with `PLANNER:PLAN_CREATED`

---

### Example 2: Planner — Risk Analysis from Historical Memory

**Scenario**: Planner analyzes past failures to prevent recurrence

**Risk Analysis Function**:
```typescript
function analyzeExperience(workingDir: string): { risks: string[], failures: string[] } {
  const risks: string[] = [];
  const failures: string[] = [];

  // Read from memory layers (FAILURES.md)
  const rootFailuresPath = path.join(process.cwd(), 'FAILURES.md');
  const coreFailuresPath = path.join(process.cwd(), 'iqra-core', 'FAILURES.md');

  [rootFailuresPath, coreFailuresPath].forEach(p => {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      
      // Pattern recognition from historical data
      if (content.includes('CONNECTION_FAILURE')) {
        risks.push('High probability of provider connection timeout. Require retry logic.');
      }
      if (content.includes('Doctrinal Hallucination')) {
        risks.push('Pattern of stretching Ayah meanings detected. Require strict counter-argument validation.');
      }
      if (content.includes('Pollution Event')) {
        risks.push('Potential for forbidden concepts (lying, injustice) in research data.');
      }
    }
  });

  return { risks, failures };
}

// Usage in plan generation
const experience = analyzeExperience(workingDir);
const plan: MissionPlan = {
  // ... other fields
  historical_context: {
    identified_risks: experience.risks,
    previous_failures: experience.failures,
  },
  steps: plan.steps.map(step => ({
    ...step,
    risk_mitigation: experience.risks.find(r => r.includes('connection')) 
      ? 'Implement exponential backoff on fetch' 
      : undefined
  }))
};
```

---

### Example 3: Planner — SkillBank Integration

**Scenario**: Planner queries available skills and incorporates them into plan

**SkillBank Integration**:
```typescript
import { SkillBank } from '../08-skills/skill_bank.js';

export async function executePlanner(context: MissionContext): Promise<HandoffResult> {
  // Read from L6 (SkillBank) memory layer
  const availableSkills = SkillBank.listSkills();
  const skillsContent = availableSkills.map(s => SkillBank.getSkillContent(s)).filter(Boolean);
  
  // Example available skills
  // → ["pattern_analysis", "resonance_detection", "topology_mapping", "numerical_validation"]
  
  const plan: MissionPlan = {
    mission_id: scope.mission_id,
    // ... other fields
    historical_context: {
      identified_risks: experience.risks,
      previous_failures: experience.failures,
      available_skills: availableSkills, // Injected from L6
    },
    steps: [
      {
        id: 'research',
        description: `ابحث عن الرنين بين الآية [${scope.verse}] ومجال "${scope.field_of_inquiry}"`,
        worker: 'Researcher',
        tools: scope.allowed_tools || ['VectorEngine', 'TopologicalCuriosity'],
        expected_output: 'research_output.json',
        // Skills inform subtask generation
        subtasks: availableSkills.includes('pattern_analysis') 
          ? ['Data Gathering (Multi-source)', 'Topological Pattern Extraction (Go)', 'Sincerity Filter (Dastūr check)']
          : ['Basic Data Gathering', 'Simple Pattern Check'],
      }
      // ... other steps
    ]
  };
}
```

---

### Example 4: Planner — Deterministic Planning (No LLM)

**Scenario**: Planner creates structured plans using pure logic, no AI inference

**Deterministic Logic**:
```typescript
// Planner uses deterministic rules - no LLM calls
function generatePlanSteps(scope: MissionScope): PlanStep[] {
  const baseSteps: PlanStep[] = [
    {
      id: 'research',
      description: `ابحث عن الرنين بين الآية [${scope.verse}] ومجال "${scope.field_of_inquiry}"`,
      worker: 'Researcher',
      tools: scope.allowed_tools || ['VectorEngine', 'TopologicalCuriosity', 'TruthDiscoveryGo'],
      expected_output: 'research_output.json',
      subtasks: [
        'Data Gathering (Multi-source)',
        'Topological Pattern Extraction (Go)',
        'Sincerity Filter (Dastūr check)',
      ]
    },
    {
      id: 'build',
      description: 'بناء عقدة معرفة Markdown من نتائج البحث',
      worker: 'Builder',
      tools: ['knowledge_encoder'],
      expected_output: `knowledge/node-${scope.mission_id}.md`,
      subtasks: [
        'Markdown Structuring',
        'Cross-referencing with experience_archive',
        'Applying Congzi lens',
      ],
    },
    {
      id: 'validate',
      description: 'التحقق من سلامة العقدة — لا هلوسة، لا كذب، الآية موجودة',
      worker: 'Validator',
      tools: ['DoctrinalGuard', 'IQRAFilter'],
      expected_output: 'validation_report.json',
      subtasks: [
        'Hallucination Check',
        'Authenticity Verification',
        'Anti-pollution scan',
      ]
    },
    {
      id: 'report',
      description: 'حساب المكافأة وتوثيق التعلم',
      worker: 'Reporter',
      tools: ['RewardEngine', 'IQRAMemory', 'ExperienceArchiver'],
      expected_output: 'ledger/rewards.jsonl',
      subtasks: [
        'Reward calculation',
        'Writing to EXPERIENCE_ARCHIVE.md',
        'Generating storytelling commit',
      ],
    },
  ];

  return baseSteps;
}
```

**Key Characteristics**:
- **No LLM calls**: Pure algorithmic planning
- **Deterministic**: Same input always produces same plan
- **Memory-informed**: Uses historical data for risk mitigation
- **Skill-aware**: Incorporates available capabilities from SkillBank

**Common Integration Patterns**:
- **L3 Memory Access**: Reads mission history, writes new plans
- **L6 SkillBank**: Queries available skills and incorporates them
- **TrustChain Logging**: Every plan creation logged for accountability
- **YAML Output**: Structured plans written to working directory
- **Handoff Protocol**: Generates complete context for next worker (Researcher)

---

### Example 5: Researcher — Discovering Patterns

**Scenario**: Finding numerical patterns in Surah Al-Fatiha

**Researcher's Work**:
```typescript
// Search for patterns
const patterns = await searchQuran({
  surah: 1,
  pattern: 'numerical_7',
  validate: true
});

// Result with attestation
{
  verse: "1:1",
  text: "بسم الله الرحمن الرحيم",
  pattern: "7 letters in first word",
  confidence: 0.95,
  source: "quran_local.db",
  attestation: {
    verified: true,
    timestamp: "2025-01-09T10:30:00Z",
    validator: "RESEARCHER_AGENT"
  }
}
```

**Key Actions**:
- ✅ Searches quran_local.db with verified queries
- ✅ Validates patterns against numerical rules
- ✅ Attaches source citations
- ✅ Logs all findings in TrustChain

---

### Example 6: Builder — Implementing Discovery Code

**Scenario**: Creating code to analyze discovered patterns

**Builder's Work**:
```typescript
// CORRECT: Real data, no mocks
export async function analyzePattern(verse: string) {
  // Validate input (RULE 1)
  const validated = VersSchema.parse(verse);
  
  // Log to TrustChain (RULE 3)
  appendToTrustChain('PATTERN:ANALYZE', verse);
  
  // Real implementation
  const result = await topologyEngine.analyze(validated);
  
  // Log result (RULE 3)
  appendToTrustChain('PATTERN:RESULT', JSON.stringify(result));
  
  return result;
}

// WRONG: Mock data in production
export async function analyzePattern(verse: string) {
  // ❌ WRONG: Using mock data
  if (process.env.NODE_ENV === 'production') {
    return { pattern: 'mock_pattern' }; // FORBIDDEN!
  }
}
```

**Key Actions**:
- ✅ Validates all inputs with Zod (RULE 1)
- ✅ Logs to TrustChain before and after (RULE 3)
- ✅ Uses real data only (RULE 2 from IQRA_RULES.md)
- ✅ Follows security-first approach (RULE 0)

---

### Example 7: Validator — Multi-Layer Verification with Memory Integration

**Scenario**: Validating a Builder's output for "Ayat al-Kursi pattern analysis"

**Validator's TypeScript Usage**:
```typescript
import { executeValidator } from './lib/iqra/workers/validator';
import { ValidationContext } from './lib/iqra/01-core/validation-context';

const context: ValidationContext = {
  mission_id: "discover-ayah-2-255-patterns",
  artifacts: ["/tmp/missions/discover-ayah-2-255-patterns/knowledge/node-discover-ayah-2-255-patterns.md"],
  source_worker: "Builder",
  handoff_packet: handoffPacket, // Packet from Builder
  constraints: {
    allow_mock: false,
    require_attestations: true,
    min_confidence: 0.8
  }
};

// Execute validator (reads L3 Upstash for historical risks, L6 for skill verification)
const result = await executeValidator(context);

// Result structure
{
  status: 'success',
  worker: 'Validator',
  verdict: 'APPROVED', // or 'REJECTED'
  data: {
    reportPath: "/tmp/missions/discover-ayah-2-255-patterns/validation_report.json",
    checks: [
      { id: 'RULE_0_SECURITY', status: 'PASS' },
      { id: 'RULE_1_ZOD', status: 'PASS' },
      { id: 'RULE_2_NO_MOCK', status: 'PASS' },
      { id: 'RULE_3_TRUSTCHAIN', status: 'PASS' },
      { id: 'SOURCE_ATTESTATION', status: 'PASS' }
    ]
  },
  artifacts: ["/tmp/missions/discover-ayah-2-255-patterns/validation_report.json"],
  implemented: [
    "Verified zero mock data in production path",
    "Validated 2 source attestations against quran_local.db",
    "Logged approval to TrustChain with hash sha256:..."
  ]
}
```

### Example 8: Validator — Compliance Enforcement (IQRA_RULES.md)

**Scenario**: Validator running the core compliance functions

**Core Validation Logic**:
```typescript
import { validateNoMock } from '../agents/no-mock';
import { validateSourceAttestations } from '../agents/attestation';
import { validateWorkerAction } from '../agents/constraints';

export async function performFullValidation(report: WorkerReport) {
  // 1. Check for Forbidden Mock Data (RULE 2)
  const noMock = await validateNoMock(report.artifacts);
  if (!noMock.valid) {
    return rejectMission(report, `Mock data detected: ${noMock.reason}`);
  }

  // 2. Verify Source Attestations (RULE 3)
  const attestations = await validateSourceAttestations(report.attestations);
  if (!attestations.valid) {
    return rejectMission(report, `Invalid attestations: ${attestations.errors.join(', ')}`);
  }

  // 3. Enforce Worker Constraints (RULE 4)
  const actionAllowed = validateWorkerAction(report.worker, report.action);
  if (!actionAllowed) {
    return rejectMission(report, `Worker ${report.worker} attempted unauthorized action: ${report.action}`);
  }

  // 4. Zod Schema Validation (RULE 1)
  const schemaValid = ReportSchema.safeParse(report);
  if (!schemaValid.success) {
    return rejectMission(report, `Schema mismatch: ${schemaValid.error.message}`);
  }

  return approveMission(report);
}
```

### Example 9: Validator — Memory-Informed Decision Making

**Scenario**: Validator checks historical failures to see if previously identified risks were mitigated

**Memory Integration**:
```typescript
// Read from L3 (Upstash) to see what Planner identified as risks
const missionPlan = await Upstash.get(`plan:${mission_id}`);
const identifiedRisks = missionPlan.historical_context.identified_risks;

// Cross-check with Builder's implementation
const validationReport = {
  risk_mitigation_check: identifiedRisks.map(risk => {
    const isMitigated = checkMitigationInArtifacts(risk, report.artifacts);
    return {
      risk,
      status: isMitigated ? 'MITIGATED' : 'FAILED',
      evidence: getMitigationEvidence(risk, report.artifacts)
    };
  })
};

// If a high-priority risk wasn't mitigated, REJECT
if (validationReport.risk_mitigation_check.some(r => r.status === 'FAILED')) {
  return { 
    verdict: 'REJECTED', 
    reason: 'Identified risks from memory were not addressed in implementation' 
  };
}
```

### Example 10: Validator — Approval & TrustChain Logging

**Scenario**: Finalizing a validation and logging the verdict

**TrustChain Integration**:
```typescript
async function approveMission(report: WorkerReport) {
  const verdict = {
    mission_id: report.mission_id,
    worker: 'Validator',
    verdict: 'APPROVED',
    timestamp: new Date().toISOString(),
    artifacts_hash: await computeHash(report.artifacts)
  };

  // Log to TrustChain (RULE 3)
  await appendToTrustChain(
    'VALIDATION:APPROVED',
    report.mission_id,
    `Artifacts verified. Hash: ${verdict.artifacts_hash}`,
    1.0 // Confidence score
  );

  // Update L3 (Upstash) status
  await Upstash.set(`status:${report.mission_id}`, 'VERIFIED');

  return verdict;
}
```

**Key Characteristics**:
- **Circuit Breaker**: Stops execution if ethical or structural rules are violated.
- **Zero Trust**: Re-verifies every claim made by Researcher and Builder.
- **Memory-Aware**: Uses historical failures to guide current validation.
- **Compliance-First**: Enforces IQRA_RULES.md (Zod, No Mock, TrustChain).

---

### Example 11: Reporter — Documenting Discoveries

**Scenario**: Writing up discovered patterns for human consumption

**Reporter's Work**:
```markdown
# Discovery: Numerical Patterns in Al-Fatiha

## Pattern 1: Seven-Letter Words
- **Verse**: 1:1 (بسم الله الرحمن الرحيم)
- **Finding**: First word "بسم" contains 3 letters, but the phrase structure follows 7-letter patterns
- **Confidence**: 95%
- **Source**: Quranic Database (verified)

## Pattern 2: Divisibility by 19
- **Verse**: 1:1
- **Finding**: Letter count divisible by 19
- **Confidence**: 88%
- **Source**: Numerical Analysis Engine (verified)

## Implications
These patterns suggest deep mathematical structure in the Quranic text.

## Next Steps
1. Extend analysis to other Surahs
2. Cross-reference with Hadith literature
3. Update topology model with new patterns
```

**Key Actions**:
- ✅ Uses public-facing language (no internal jargon)
- ✅ Cites all sources clearly
- ✅ Explains findings in human-readable format
- ✅ Suggests next steps for Planner
- ✅ Updates DISCOVERIES.md

---

## Common Errors & Prevention

### Error 1: Context Loss in Handoffs

**What Happens**:
- Researcher discovers pattern but doesn't pass full context to Builder
- Builder creates code without understanding the pattern
- Validator rejects because context is missing

**Example**:
```typescript
// ❌ WRONG: Incomplete handoff
const handoff = {
  pattern: "7-letter",
  // Missing: source, confidence, verse reference, attestation
};

// ✅ CORRECT: Complete handoff
const handoff = {
  pattern: "7-letter",
  verse: "1:1",
  source: "quran_local.db",
  confidence: 0.95,
  attestation: { verified: true, timestamp: "..." },
  context: { surah: 1, ayah: 1, text: "..." }
};
```

**Prevention**:
- Use `MissionHandoff` schema from contracts.ts
- Validate handoff before passing to next agent
- Include all context data (zero context loss)
- Log handoff in TrustChain

---

### Error 2: Mock Data in Production

**What Happens**:
- Builder uses simulated data for testing
- Code passes to production
- System produces unreliable results
- Validator catches it too late

**Example**:
```typescript
// ❌ WRONG: Mock data
const getVerse = (surah: number, ayah: number) => {
  if (process.env.NODE_ENV === 'production') {
    return { text: 'mock_verse' }; // FORBIDDEN!
  }
  return realDatabase.get(surah, ayah);
};

// ✅ CORRECT: Real data only
const getVerse = (surah: number, ayah: number) => {
  return realDatabase.get(surah, ayah);
};
```

**Prevention**:
- Use `validateNoMock()` function from no-mock.ts
- Validator must check for mock data before approval
- TrustChain logs all data sources
- Circuit breaker stops execution if mock detected

---

### Error 3: Missing Source Attestations

**What Happens**:
- Researcher finds pattern but doesn't cite source
- Reporter writes discovery without attestation
- System cannot verify information
- Violates constitutional rule #3: "كل مصدر معلومة يُوسَم"

**Example**:
```typescript
// ❌ WRONG: No attestation
const discovery = {
  pattern: "7-letter words",
  confidence: 0.95
  // Missing: source, attestation, verification
};

// ✅ CORRECT: Full attestation
const discovery = {
  pattern: "7-letter words",
  confidence: 0.95,
  source: "quran_local.db",
  attestation: {
    verified: true,
    timestamp: "2025-01-09T10:30:00Z",
    validator: "RESEARCHER_AGENT",
    hash: "sha256:abc123..."
  }
};
```

**Prevention**:
- Use `validateSourceAttestations()` from attestation.ts
- Every claim must have a source
- Validator checks all attestations
- TrustChain logs all sources

---

### Error 4: Violating Worker Constraints

**What Happens**:
- Validator tries to modify implementation code (not allowed)
- Reporter includes internal implementation details (not allowed)
- Builder tries to update RULES.md (not allowed)
- System becomes inconsistent

**Example**:
```typescript
// ❌ WRONG: Validator modifying code
export function validatePattern(pattern: Pattern) {
  // Validator should NOT do this:
  pattern.confidence = 0.99; // WRONG!
  return pattern;
}

// ✅ CORRECT: Validator only approves/rejects
export function validatePattern(pattern: Pattern) {
  if (pattern.confidence < 0.8) {
    return { valid: false, reason: "Low confidence" };
  }
  return { valid: true };
}
```

**Prevention**:
- Use `validateWorkerAction()` from constraints.ts
- Each worker has specific allowed actions
- Validator checks constraints before execution
- TrustChain logs all constraint violations

---

### Error 5: Incomplete Validation

**What Happens**:
- Validator checks only some criteria
- Code passes validation but has issues
- System fails in production
- Difficult to debug

**Example**:
```typescript
// ❌ WRONG: Incomplete validation
export function validate(report: WorkerReport) {
  return report.status === 'SUCCESS'; // Only checks status!
}

// ✅ CORRECT: Comprehensive validation
export function validate(report: WorkerReport) {
  const checks = {
    hasStatus: report.status !== undefined,
    hasSourceAttestations: validateSourceAttestations(report),
    hasNoMock: validateNoMock(report),
    respectsConstraints: validateWorkerAction(report.worker, report.action),
    isComplete: validateReportCompleteness(report)
  };
  
  return Object.values(checks).every(c => c === true);
}
```

**Prevention**:
- Use comprehensive validation schemas
- Validator must check all acceptance criteria
- Use `assertValidReport()` which throws on failure
- Document all validation rules

---

## Lessons Learned

### Lesson 1: Context is Everything

**What We Learned**:
- Handoffs without full context cause cascading failures
- Each agent needs to understand the "why" not just the "what"
- Context loss compounds through the pipeline

**Application**:
- Always include full context in handoffs
- Document reasoning in REFLECTION.md
- Use `MissionHandoff` schema with all fields
- Validate handoff completeness before passing

**Example**:
```typescript
// Include context
const handoff = {
  mission_id: "discover-fatiha-patterns",
  from_worker: "PLANNER",
  to_worker: "RESEARCHER",
  context_data: {
    objective: "Find 7-letter patterns",
    constraints: ["Must cite sources", "No mock data"],
    previous_findings: [...],
    expected_output: "Pattern list with attestations"
  },
  validation_rules: ["source_verified", "confidence > 0.8"],
  pending_tasks: ["search_quran", "validate_patterns"]
};
```

---

### Lesson 2: Validation Must Be Comprehensive

**What We Learned**:
- Partial validation misses critical issues
- Validator role is crucial for system integrity
- Early validation prevents cascading failures

**Application**:
- Validator checks ALL acceptance criteria
- Use multi-layer validation (input, process, output)
- Fail fast with clear error messages
- Log all validation decisions in TrustChain

**Example**:
```typescript
// Multi-layer validation
export async function validateMission(mission: Mission) {
  // Layer 1: Input validation
  const inputValid = validateInput(mission);
  if (!inputValid) throw new Error("Invalid input");
  
  // Layer 2: Constraint validation
  const constraintsValid = validateConstraints(mission);
  if (!constraintsValid) throw new Error("Violates constraints");
  
  // Layer 3: Source validation
  const sourcesValid = validateSourceAttestations(mission);
  if (!sourcesValid) throw new Error("Missing source attestations");
  
  // Layer 4: Mock validation
  const noMockValid = validateNoMock(mission);
  if (!noMockValid) throw new Error("Contains mock data");
  
  return true;
}
```

---

### Lesson 3: Documentation is Code

**What We Learned**:
- Undocumented discoveries are lost
- Documentation helps future agents learn
- DISCOVERIES.md is as important as implementation

**Application**:
- Reporter must document every discovery
- Include reasoning and implications
- Update LESSONS_LEARNED.md with insights
- Make documentation searchable and clear

**Example**:
```markdown
# Discovery: Pattern X in Surah Y

## What We Found
[Clear description of the pattern]

## Why It Matters
[Implications and connections]

## How We Found It
[Methodology and sources]

## Confidence Level
[95% - based on X, Y, Z]

## Next Steps
[What should be investigated next]

## Related Discoveries
[Links to similar patterns]
```

---

### Lesson 4: Trust Chain is Non-Negotiable

**What We Learned**:
- Without TrustChain logging, we cannot debug failures
- Every action must be logged for accountability
- TrustChain enables learning from mistakes

**Application**:
- Log every action in TrustChain (RULE 3)
- Include timestamp, actor, action, result
- Use TrustChain for debugging and learning
- Validator checks TrustChain completeness

**Example**:
```typescript
// Every action logged
appendToTrustChain(
  'PATTERN:DISCOVER',           // action
  verse,                         // data
  `confidence=${score}`,         // metadata
  score                          // numeric value
);

// Later: Query TrustChain for debugging
const history = getTrustChain('PATTERN:DISCOVER');
// Can replay entire discovery process
```

---

### Lesson 5: Constraints Protect the System

**What We Learned**:
- Without constraints, agents overstep their roles
- Constraints prevent cascading failures
- Structural integrity depends on role boundaries

**Application**:
- Each worker has specific allowed actions
- Validator enforces constraints
- Constraints are documented in DASTUR.md
- Violations are logged and escalated

**Example**:
```typescript
// Constraints prevent role confusion
const WORKER_CONSTRAINTS = {
  PLANNER: {
    canModifyCode: false,
    canUpdateRules: true,
    canValidate: false
  },
  RESEARCHER: {
    canModifyCode: false,
    canUpdateRules: false,
    canValidate: false
  },
  BUILDER: {
    canModifyCode: true,
    canUpdateRules: false,
    canValidate: false
  },
  VALIDATOR: {
    canModifyCode: false,
    canUpdateRules: false,
    canValidate: true
  },
  REPORTER: {
    canModifyCode: false,
    canUpdateRules: false,
    canValidate: false
  }
};
```

---

### Lesson 6: Curiosity Drives Discovery

**What We Learned**:
- System learns faster when rewarded for discoveries
- Novel patterns (novelty > 0.6) should boost curiosity
- Curiosity score drives self-evolution

**Application**:
- Grant rewards for successful discoveries (RULE 7)
- Track curiosity score in Upstash
- Use curiosity to prioritize next missions
- Document high-curiosity discoveries

**Example**:
```typescript
// Reward discovery
export async function completeDiscovery(discovery: Discovery) {
  const novelty = computeNovelty(discovery);
  
  if (novelty > 0.6) {
    // Novel discovery - boost curiosity
    const boost = novelty * 0.1;
    await IQRAMemory.grantReward(boost);
    
    appendToTrustChain(
      'DISCOVERY:NOVEL',
      discovery.pattern,
      `novelty=${novelty}`,
      boost
    );
  }
}
```

---

### Lesson 7: Failures Are Learning Opportunities

**What We Learned**:
- Every failure contains valuable information
- FAILURES.md should be reviewed regularly
- Patterns in failures reveal system weaknesses

**Application**:
- Log all failures in FAILURES.md
- Planner reviews failures regularly
- Extract lessons and update RULES.md
- Prevent recurrence through constraints

**Example**:
```markdown
# Failure: Context Loss in Handoff

## What Happened
Researcher passed incomplete context to Builder.
Builder created code without understanding pattern.
Validator rejected due to missing attestations.

## Root Cause
Handoff schema not validated before passing.

## Prevention
- Validate handoff against MissionHandoff schema
- Use assertValidHandoff() which throws on failure
- Log all handoffs in TrustChain

## Lesson
Always validate before handoff.
```

---

## 🔗 Sovereign Handoff Protocol

Agents communicate via `MissionHandoff` packets. Each handoff must include:

1. **mission_id**: Unified tracking across all agents
2. **from_worker** & **to_worker**: Lineage of responsibility
3. **context_data**: Immutable state transfer (zero context loss)
4. **validation_rules**: Constraints for the next agent in the chain
5. **pending_tasks**: The "baton" passed forward
6. **attestations**: Source verification for all claims
7. **timestamp**: When handoff occurred
8. **trust_chain_hash**: Hash of all previous actions

**Example Handoff**:
```json
{
  "mission_id": "discover-fatiha-patterns-001",
  "from_worker": "PLANNER",
  "to_worker": "RESEARCHER",
  "context_data": {
    "objective": "Discover numerical patterns in Al-Fatiha",
    "constraints": ["Must cite sources", "No mock data"],
    "expected_output": "Pattern list with attestations"
  },
  "validation_rules": [
    "source_verified",
    "confidence > 0.8",
    "no_mock_data"
  ],
  "pending_tasks": [
    "search_quran_for_7_letter_patterns",
    "validate_patterns_against_rules",
    "create_attestations"
  ],
  "attestations": [],
  "timestamp": "2025-01-09T10:30:00Z",
  "trust_chain_hash": "sha256:abc123..."
}
```

---

## 🌀 Operational Protocol | بروتوكول التشغيل

### Phase 1: Planning (Planner)
1. **Observe**: Read REFLECTION.md and FAILURES.md
2. **Plan**: Create detailed mission plan
3. **Validate**: Check against DASTUR.md
4. **Handoff**: Pass to Researcher with full context

### Phase 2: Research (Researcher)
1. **Search**: Query quran_local.db and sources
2. **Validate**: Check patterns against numerical rules
3. **Attest**: Create source attestations
4. **Handoff**: Pass to Builder with findings

### Phase 3: Build (Builder)
1. **Implement**: Create code based on findings
2. **Validate**: Use Zod for input validation
3. **Log**: Append to TrustChain
4. **Handoff**: Pass to Validator for approval

### Phase 4: Validate (Validator)
1. **Check**: Verify all acceptance criteria
2. **Attest**: Verify source attestations
3. **Approve/Reject**: Make final decision
4. **Handoff**: Pass to Reporter if approved

### Phase 5: Report (Reporter)
1. **Document**: Write human-readable discovery
2. **Cite**: Include all sources
3. **Suggest**: Propose next steps
4. **Archive**: Update DISCOVERIES.md

### Phase 6: Learn (Planner)
1. **Review**: Read Reporter's documentation
2. **Extract**: Identify lessons learned
3. **Update**: Modify RULES.md if needed
4. **Loop**: Return to Phase 1 for next mission

---

## 🤝 Structured Handoffs Protocol | بروتوكول التسليم الهرمي

لضمان عدم ضياع السياق، يعمل الوكلاء بنظام التتابع (Serial beats parallel). لا يبدأ وكيل عمله إلا بعد توقيع الوكيل السابق.

### Handoff Report Template (قالب تقرير التسليم):
يجب على كل وكيل، قبل إنهاء عمليته، إرسال تقرير بصيغة JSON لمركز القيادة يحتوي على:

```json
{
  "worker_id": "RESONANCE_WORKER",
  "mission_id": "discover-fatiha-patterns-001",
  "status": "SUCCESS|FAILURE",
  "implemented": [
    "استخراج 3 أنماط عددية",
    "التحقق من الرنين مع البيانات الحديثة",
    "توثيق جميع المصادر"
  ],
  "undone": [
    "لم يتم العثور على رنين قوي لآية كذا"
  ],
  "commands_run": [
    { "command": "grep 'pattern' *.md", "exitCode": 0 },
    { "command": "validate_sources()", "exitCode": 0 }
  ],
  "issues_discovered": [
    "تشويش دلالي في الكلمة X",
    "مصدر غير موثق في الآية Y"
  ],
  "procedures_followed": true,
  "attestations": [
    {
      "source": "quran_local.db",
      "verified": true,
      "timestamp": "2025-01-09T10:30:00Z"
    }
  ],
  "trust_chain_hash": "sha256:abc123...",
  "next_worker": "VALIDATOR",
  "timestamp": "2025-01-09T10:35:00Z"
}
```

**Validation Rules**:
- إذا كانت `procedures_followed` = `false`، يتم رفض الـ Handoff وتُعاد العملية لدورة الاستغفار والتصحيح
- جميع `attestations` يجب أن تكون `verified: true`
- `trust_chain_hash` يجب أن يطابق السجل السابق
- `next_worker` يجب أن يكون محدداً بوضوح

---

## ✅ Acceptance Criteria Checklist

Before marking a mission as complete, verify:

- [ ] Each agent has a practical example documented
- [ ] Common errors are listed with prevention strategies
- [ ] Lessons learned section is comprehensive
- [ ] No dead code in examples
- [ ] No duplicate content
- [ ] All content is clear and actionable
- [ ] Handoff protocol is documented
- [ ] Operational guidelines are clear
- [ ] All constraints are documented
- [ ] TrustChain logging is explained

---

## 🤲 Dua

```
"رَبِّ زِدْنِي عِلْمًا" — طه: 114

كل وكيل = خادم مخلص
كل اكتشاف = صدقة جارية
كل درس = حكمة من الحكمة

اللهم اجعل هذا النظام خالصاً لوجهك الكريم
واجعله نافعاً للبشرية
وتقبله منا يا أرحم الراحمين
```

---

**Made with ❤️ by Moe Abdelaziz**
**Powered by: Upstash + Qdrant + HuggingFace + Groq**
**Architecture: tinyminimicroterboquansimualgotoplogy**

بسم الله، والصلاة والسلام على رسول الله، وعلى آله وصحبه ومن والاه
