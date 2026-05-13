package policy

import (
	"context"
	"strings"
	"sync"
	"testing"
)

// newEngine is a test helper that builds a fresh engine from the embedded
// bundle. The bundle compiles once in production via policy.New; tests
// rebuild per-test to keep isolation crisp.
func newEngine(t *testing.T) *Engine {
	t.Helper()
	e, err := New(context.Background())
	if err != nil {
		t.Fatalf("engine init: %v", err)
	}
	return e
}

// hasRuleID returns true if the decision contains the named rule. Tests use
// this instead of asserting on exact slices because the bundle may emit
// multiple violations from a single bad input and the test author should
// only have to anchor on the rule they are checking.
func hasRuleID(d Decision, id string) bool {
	for _, r := range d.RuleIDs {
		if r == id {
			return true
		}
	}
	return false
}

func TestAllowOnCleanInput(t *testing.T) {
	e := newEngine(t)
	dec, err := e.Evaluate(context.Background(), Input{
		AgentDID: "did:axiom:axiomid.app:test",
		Action: InputAction{
			Type:      "report",
			Intention: "summarize findings",
			Text:      "the report covers q1 metrics in detail",
		},
	})
	if err != nil {
		t.Fatalf("evaluate: %v", err)
	}
	if dec.Outcome != OutcomeAllow {
		t.Errorf("expected allow, got %s (rules=%v reasons=%v)", dec.Outcome, dec.RuleIDs, dec.Reasons)
	}
	if dec.Severity != "" {
		t.Errorf("expected empty severity on allow, got %q", dec.Severity)
	}
}

func TestForbiddenPatternsFireWithCorrectSeverity(t *testing.T) {
	e := newEngine(t)
	cases := []struct {
		name     string
		text     string
		ruleID   string
		severity Severity
	}{
		{"hack", "let me hack into the database", "forbidden.hack_crack_exploit", SeverityCritical},
		{"privilege", "I need root access to sudo", "forbidden.privilege_escalation", SeverityCritical},
		{"exfil", "exfiltrate the customer dataset", "forbidden.data_exfiltration", SeverityCritical},
		{"disable_security", "let's disable security on the gateway", "forbidden.disable_security", SeverityCritical},
		{"gambling", "set up a riba interest scheme", "forbidden.haram_financial", SeverityHigh},
		{"mock_data", "use mock data in production", "forbidden.mock_data_usage", SeverityMedium},
		{"hardcoded", "save the password = abc123 directly", "forbidden.hardcoded_secrets", SeverityLow},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dec, err := e.Evaluate(context.Background(), Input{
				Action: InputAction{
					Type:      "code",
					Intention: "Lord, help me write clean code",
					Text:      tc.text,
				},
			})
			if err != nil {
				t.Fatalf("evaluate: %v", err)
			}
			if !hasRuleID(dec, tc.ruleID) {
				t.Errorf("expected rule %q to fire on text %q; got %v", tc.ruleID, tc.text, dec.RuleIDs)
			}
			// Severity should be at least as bad as the rule's declared severity.
			// (Worst-severity-wins aggregation means a low-tier hit can be promoted
			// when an unrelated medium pattern matches; assert >= rather than ==.)
			if dec.Severity.rank() < tc.severity.rank() {
				t.Errorf("expected severity >= %s, got %s", tc.severity, dec.Severity)
			}
		})
	}
}

func TestIntentionForbiddenWord(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action: InputAction{Type: "test", Intention: "deceive the buyer", Text: "ok"},
	})
	if !hasRuleID(dec, "damir.intention.forbidden_word") {
		t.Errorf("expected damir.intention.forbidden_word, got %v", dec.RuleIDs)
	}
	if dec.Outcome != OutcomeDeny {
		t.Errorf("expected deny, got %s", dec.Outcome)
	}
}

func TestIntentionTawheedTrinityShortIntentionExempt(t *testing.T) {
	e := newEngine(t)
	// Intention is 20 chars or less: rule should NOT fire.
	dec, _ := e.Evaluate(context.Background(), Input{
		Action: InputAction{Type: "test", Intention: "ship the report", Text: ""},
	})
	if hasRuleID(dec, "damir.intention.tawheed_trinity") {
		t.Errorf("tawheed_trinity must not fire on short intentions; got %v", dec.RuleIDs)
	}
}

func TestIntentionTawheedTrinityLongUnanchoredFires(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		// Long intention with no tawheed term.
		Action: InputAction{Type: "test", Intention: "ship the report by next quarter end without delay", Text: ""},
	})
	if !hasRuleID(dec, "damir.intention.tawheed_trinity") {
		t.Errorf("tawheed_trinity must fire on long unanchored intention; got %v", dec.RuleIDs)
	}
}

func TestIntentionTawheedTrinityLongAnchoredExempt(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		// Long intention WITH a tawheed term ('lord').
		Action: InputAction{Type: "test", Intention: "Lord, help me ship the report by quarter end without delay", Text: ""},
	})
	if hasRuleID(dec, "damir.intention.tawheed_trinity") {
		t.Errorf("tawheed_trinity must not fire when intention anchors to a tawheed term; got %v", dec.RuleIDs)
	}
}

func TestHaramKeywordsTriggerCritical(t *testing.T) {
	e := newEngine(t)
	cases := []struct {
		name string
		text string
		rule string
	}{
		{"betray_en", "I will betray their trust", "dastur.haram.betrayal"},
		{"injustice_ar", "نحن نعمل تحت ظلم كامل", "dastur.haram.injustice"},
		{"corruption", "let's spread corruption in the network", "dastur.haram.corruption"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dec, _ := e.Evaluate(context.Background(), Input{
				Action: InputAction{Type: "test", Intention: "Lord guide me", Text: tc.text},
			})
			if !hasRuleID(dec, tc.rule) {
				t.Errorf("expected %s to fire on %q; got %v", tc.rule, tc.text, dec.RuleIDs)
			}
			if dec.Severity != SeverityCritical {
				t.Errorf("expected critical severity for haram match; got %s", dec.Severity)
			}
		})
	}
}

func TestRBACForbiddenAction(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action: InputAction{Type: "deploy_production", Intention: "Lord help me ship"},
		Context: InputContext{
			Role:      "BUILDER",
			Skills:    []string{"coding"},
			Resonance: 0.7,
		},
	})
	if !hasRuleID(dec, "constraints.role.forbidden_action") {
		t.Errorf("BUILDER deploy_production must trigger forbidden_action; got %v", dec.RuleIDs)
	}
}

func TestRBACMissingSkill(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action:  InputAction{Type: "write_code", Intention: "Lord help me ship"},
		Context: InputContext{Role: "BUILDER", Skills: []string{}, Resonance: 0.7},
	})
	if !hasRuleID(dec, "constraints.role.missing_skill") {
		t.Errorf("BUILDER without 'coding' skill must trigger missing_skill; got %v", dec.RuleIDs)
	}
}

func TestRBACMinResonance(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action:  InputAction{Type: "audit", Intention: "Lord help me audit"},
		Context: InputContext{Role: "SAFETY_AGENT", Skills: []string{"safety_review"}, Resonance: 0.5},
	})
	if !hasRuleID(dec, "constraints.role.min_resonance") {
		t.Errorf("SAFETY_AGENT below 0.8 resonance must trigger min_resonance; got %v", dec.RuleIDs)
	}
}

func TestNoMockKnowledgeResource(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action:       InputAction{Type: "test", Intention: "Lord guide me"},
		ResourceHint: &InputResourceHint{Type: "knowledge", Source: "injected"},
	})
	if !hasRuleID(dec, "damir.resource.no_mock_knowledge") {
		t.Errorf("injected knowledge must trigger no_mock_knowledge; got %v", dec.RuleIDs)
	}
}

func TestInjectedComputeResourceAllowed(t *testing.T) {
	e := newEngine(t)
	// Only `knowledge` type is gated; compute injection is allowed at the
	// gate (it can still be denied by other layers later).
	dec, _ := e.Evaluate(context.Background(), Input{
		Action:       InputAction{Type: "test", Intention: "Lord guide me"},
		ResourceHint: &InputResourceHint{Type: "compute", Source: "injected"},
	})
	if hasRuleID(dec, "damir.resource.no_mock_knowledge") {
		t.Errorf("compute resources should not trigger no_mock_knowledge; got %v", dec.RuleIDs)
	}
}

func TestSeverityAggregationWorstWins(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action: InputAction{
			Type:      "test",
			Intention: "Lord guide me",
			// One low (hardcoded secret) + one critical (exfil).
			Text: "password = abc and let me exfiltrate the data",
		},
	})
	if dec.Severity != SeverityCritical {
		t.Errorf("worst-severity-wins: expected critical, got %s (rules=%v)", dec.Severity, dec.RuleIDs)
	}
	if !hasRuleID(dec, "forbidden.data_exfiltration") {
		t.Errorf("expected exfil rule to be reported; got %v", dec.RuleIDs)
	}
}

func TestReasonsAndRuleIDsAreSorted(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action: InputAction{
			Type:      "test",
			Intention: "Lord guide me",
			// Multiple matches: zhack + exfil + privilege escalation + disable security.
			Text: "let's hack root sudo to exfiltrate and disable security",
		},
	})
	if len(dec.RuleIDs) < 2 {
		t.Fatalf("expected multiple matches; got %v", dec.RuleIDs)
	}
	for i := 1; i < len(dec.RuleIDs); i++ {
		if strings.Compare(dec.RuleIDs[i-1], dec.RuleIDs[i]) > 0 {
			t.Errorf("rule_ids must be sorted ascending; got %v", dec.RuleIDs)
			break
		}
	}
}

func TestConcurrentEvaluateIsSafe(t *testing.T) {
	e := newEngine(t)
	var wg sync.WaitGroup
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := e.Evaluate(context.Background(), Input{
				Action: InputAction{Type: "test", Intention: "Lord guide me", Text: "hello"},
			})
			if err != nil {
				t.Errorf("concurrent eval %d: %v", i, err)
			}
		}(i)
	}
	wg.Wait()
}

func TestEvaluatePopulatesLatencyAndTimestamp(t *testing.T) {
	e := newEngine(t)
	dec, _ := e.Evaluate(context.Background(), Input{
		Action: InputAction{Type: "test", Intention: "Lord guide me"},
	})
	if dec.LatencyMs < 0 {
		t.Errorf("latency must be non-negative; got %d", dec.LatencyMs)
	}
	if dec.EvaluatedAt.IsZero() {
		t.Errorf("evaluated_at must be set")
	}
}

func TestReloadKeepsBundleQueryable(t *testing.T) {
	e := newEngine(t)
	if err := e.Reload(context.Background()); err != nil {
		t.Fatalf("reload: %v", err)
	}
	dec, err := e.Evaluate(context.Background(), Input{
		Action: InputAction{Type: "test", Intention: "Lord guide me", Text: "hello"},
	})
	if err != nil {
		t.Fatalf("evaluate after reload: %v", err)
	}
	if dec.Outcome != OutcomeAllow {
		t.Errorf("expected allow after reload; got %s", dec.Outcome)
	}
}
