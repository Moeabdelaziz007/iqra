// Package policy hosts the Phase 5b OPA wrapper around the DAMIR conscience.
// It evaluates stateless rules (intention, HARAM list, forbidden patterns,
// RBAC constraints, doctrinal guard, Mizan thresholds) and returns a single
// merged Decision. Graded-Linear-Logic resource arithmetic, the 7-loop
// kernel, Byzantine z-score math, TrustChain hash chaining, and the LLM
// Muraqabah audit explicitly stay in TypeScript DAMIR as the canonical
// authority. This package is the fast pre-flight cache that lets the runtime
// reject obvious violations in microseconds instead of paying the full
// TS-bridge round trip.
package policy

import "time"

// Severity grades a violation. Higher severity short-circuits aggregation:
// one Critical wins against any number of Lows. The string values mirror the
// `forbidden_patterns.ts` severity enum so a TS caller can map directly.
type Severity string

const (
	SeverityLow      Severity = "low"
	SeverityMedium   Severity = "medium"
	SeverityHigh     Severity = "high"
	SeverityCritical Severity = "critical"
)

// rank returns a comparable weight per Severity. Higher is worse.
func (s Severity) rank() int {
	switch s {
	case SeverityCritical:
		return 4
	case SeverityHigh:
		return 3
	case SeverityMedium:
		return 2
	case SeverityLow:
		return 1
	}
	return 0
}

// Outcome is the top-level verdict. The contract intentionally mirrors the
// DAMIR `ConscienceVerdict.allowed` boolean while adding a third `warn`
// state so the caller can decide policy on warnings (e.g. log but continue,
// or escalate to human review).
type Outcome string

const (
	OutcomeAllow Outcome = "allow"
	OutcomeWarn  Outcome = "warn"
	OutcomeDeny  Outcome = "deny"
)

// Input is the structured JSON document passed to the Rego query as
// `input`. Field names use snake_case so the Rego authors can refer to them
// idiomatically (Rego best practice prefers snake_case for input). Every
// optional field is `omitempty` so the on-wire JSON stays small for the
// common pre-flight case.
type Input struct {
	AgentDID string             `json:"agent_did,omitempty"`
	Action   InputAction        `json:"action"`
	Context  InputContext       `json:"context,omitempty"`
	// Doctrinal payload is present when the caller is making a claim about
	// an ayah. The doctrinal_guard policy only fires when ayah_text is set.
	Doctrinal *InputDoctrinal `json:"doctrinal,omitempty"`
	// ResourceHint is a flattened view of the Resource the caller intends
	// to consume. It is NOT the full graded-linear-logic resource pool
	// (which stays in TS DAMIR); only the type+source pair is needed to
	// enforce the "no injected knowledge" rule at the gate.
	ResourceHint *InputResourceHint `json:"resource_hint,omitempty"`
}

// InputAction captures the surface a policy evaluates against. `text` is the
// free-form payload (prompt, code, manifest) used by the pattern policies.
type InputAction struct {
	Type      string `json:"type"`
	Intention string `json:"intention,omitempty"`
	Text      string `json:"text,omitempty"`
}

// InputContext supplies the role/skill/resonance triple that the RBAC and
// Mizan policies adjudicate against. `entropy` is paired with `resonance`
// for the Adl (justice) check in damir_kernel.
type InputContext struct {
	Role      string   `json:"role,omitempty"`
	Skills    []string `json:"skills,omitempty"`
	Resonance float64  `json:"resonance,omitempty"`
	Entropy   float64  `json:"entropy,omitempty"`
	Domain    string   `json:"domain,omitempty"`
}

// InputDoctrinal carries the doctrinal_guard inputs.
type InputDoctrinal struct {
	AyahRef  string `json:"ayah_ref"`
	AyahText string `json:"ayah_text"`
	Claim    string `json:"claim"`
}

// InputResourceHint mirrors damir_conscience.Resource at the type+source
// granularity without exposing the stateful pool.
type InputResourceHint struct {
	Type   string `json:"type"`
	Source string `json:"source"`
}

// Decision is the merged verdict across every rule that fired. Reasons are
// human-readable, RuleIDs are stable machine identifiers callers can pin in
// tests, and Severity is the worst severity observed across all violations.
type Decision struct {
	Outcome   Outcome   `json:"outcome"`
	Reasons   []string  `json:"reasons,omitempty"`
	RuleIDs   []string  `json:"rule_ids,omitempty"`
	Severity  Severity  `json:"severity,omitempty"`
	LatencyMs int64     `json:"latency_ms"`
	EvaluatedAt time.Time `json:"evaluated_at"`
}
