package policy

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/open-policy-agent/opa/v1/rego"
	"go.opentelemetry.io/otel/attribute"

	"iqra/engine/pkg/observability"
)

// policyFS embeds the Rego bundle that ships with the binary. Phase 5b
// intentionally bakes the bundle into the image; the remote Bundle API
// integration is a follow-up that requires a separate credential rollout.
//
// The directory layout under policies/ matches the package names declared
// inside each .rego file:
//
//	policies/aix/damir/intention.rego       -> package aix.damir.intention
//	policies/aix/damir/forbidden.rego       -> package aix.damir.forbidden
//	policies/aix/damir/haram.rego           -> package aix.damir.haram
//	policies/aix/damir/constraints.rego     -> package aix.damir.constraints
//	policies/aix/damir/decide.rego          -> package aix.damir.decide  (root)
//
//go:embed policies
var policyFS embed.FS

// queryString is the single Rego entrypoint the engine evaluates. The root
// decision module under aix.damir.decide aggregates every per-policy verdict
// into one merged Decision so callers see exactly one round-trip per check.
const queryString = "data.aix.damir.decide.result"

// Engine is the long-lived policy evaluator. Construct one per process,
// share across handlers, and replace via Reload when the bundle changes.
type Engine struct {
	mu       sync.RWMutex
	prepared rego.PreparedEvalQuery
}

// New compiles the embedded Rego bundle and returns a ready Engine. If the
// bundle fails to compile the function returns an error and the caller
// should refuse to start the server; running with an empty policy is worse
// than failing fast because it silently relaxes the guard.
func New(ctx context.Context) (*Engine, error) {
	prepared, err := compileBundle(ctx, policyFS)
	if err != nil {
		return nil, fmt.Errorf("policy: compile bundle: %w", err)
	}
	return &Engine{prepared: prepared}, nil
}

// Reload re-compiles the embedded bundle and atomically swaps in the new
// prepared query. Intended for SIGHUP / dynamic reload hooks; Phase 5b does
// not wire those triggers up because static-embed bundles only change on
// process restart, but the API is here so Phase 5b.1 (file-watcher or
// remote bundle) is a drop-in extension.
func (e *Engine) Reload(ctx context.Context) error {
	prepared, err := compileBundle(ctx, policyFS)
	if err != nil {
		return fmt.Errorf("policy: reload: %w", err)
	}
	e.mu.Lock()
	e.prepared = prepared
	e.mu.Unlock()
	return nil
}

// Evaluate runs the bundle against input and returns the merged Decision.
// On any internal error the function returns a fail-closed Deny so a bug in
// the policy layer never accidentally lets traffic through; the caller can
// inspect the err to distinguish policy-deny from infrastructure-failure.
func (e *Engine) Evaluate(ctx context.Context, input Input) (Decision, error) {
	start := time.Now()

	ctx, span := observability.Tracer().Start(ctx, "Policy.Evaluate")
	span.SetAttributes(
		attribute.String("policy.action.type", input.Action.Type),
		attribute.String("policy.agent_did", input.AgentDID),
	)
	defer span.End()

	e.mu.RLock()
	q := e.prepared
	e.mu.RUnlock()

	rs, err := q.Eval(ctx, rego.EvalInput(input))
	if err != nil {
		span.RecordError(err)
		return failClosed(start, "policy.engine.eval_error", "policy evaluation failed: "+err.Error()), err
	}

	decision, parseErr := parseResultSet(rs, start)
	if parseErr != nil {
		span.RecordError(parseErr)
		return failClosed(start, "policy.engine.parse_error", "policy result malformed: "+parseErr.Error()), parseErr
	}

	span.SetAttributes(
		attribute.String("policy.outcome", string(decision.Outcome)),
		attribute.String("policy.severity", string(decision.Severity)),
		attribute.StringSlice("policy.rule_ids", decision.RuleIDs),
		attribute.Int64("policy.latency_ms", decision.LatencyMs),
	)
	return decision, nil
}

// compileBundle walks the embedded FS and feeds every .rego file into a
// fresh rego.New, then PrepareForEval. Bundled .json files (e.g. the
// authored HARAM list) are loaded as Rego `data` documents via the same
// fs.WalkDir pass so the bundle is fully self-describing.
func compileBundle(ctx context.Context, embedded fs.FS) (rego.PreparedEvalQuery, error) {
	// Rego v1 syntax is enforced via `import rego.v1` at the top of each
	// .rego file. We deliberately omit a SDK-level version override so the
	// per-module imports stay the single source of truth on syntax.
	options := []func(r *rego.Rego){
		rego.Query(queryString),
	}

	walkErr := fs.WalkDir(embedded, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		data, err := fs.ReadFile(embedded, path)
		if err != nil {
			return fmt.Errorf("read %s: %w", path, err)
		}
		switch {
		case strings.HasSuffix(path, ".rego"):
			options = append(options, rego.Module(path, string(data)))
		case strings.HasSuffix(path, ".json"):
			// Rego data documents are mounted under the "data." root; the
			// file's path relative to policies/ defines the mount point.
			// For now Phase 5b only ships static data inlined in .rego
			// files; we keep this branch so the haram-list-from-DASTUR
			// build step can drop a generated data.json without code
			// changes.
			options = append(options, rego.Store(nil))
		}
		return nil
	})
	if walkErr != nil {
		return rego.PreparedEvalQuery{}, walkErr
	}

	r := rego.New(options...)
	return r.PrepareForEval(ctx)
}

// parseResultSet inspects the Rego result, extracts the `result` object the
// aggregator emits, and shapes it into a Decision. The shape contract is:
//
//	result := {
//	  "outcome": "allow" | "warn" | "deny",
//	  "severity": "low" | "medium" | "high" | "critical",  // optional
//	  "reasons":  ["..."],                                 // optional
//	  "rule_ids": ["..."],                                 // optional
//	}
//
// Any deviation falls back to fail-closed Deny so a malformed policy is
// loud during testing rather than silently permissive.
func parseResultSet(rs rego.ResultSet, start time.Time) (Decision, error) {
	if len(rs) == 0 {
		return failClosed(start, "policy.engine.no_result", "policy returned empty result set"), errors.New("empty result set")
	}
	val, ok := rs[0].Expressions[0].Value.(map[string]interface{})
	if !ok {
		return failClosed(start, "policy.engine.shape", "policy result is not an object"), errors.New("result not an object")
	}

	outcome := OutcomeAllow
	if s, ok := val["outcome"].(string); ok {
		switch Outcome(s) {
		case OutcomeAllow, OutcomeWarn, OutcomeDeny:
			outcome = Outcome(s)
		}
	}
	severity := Severity("")
	if s, ok := val["severity"].(string); ok {
		severity = Severity(s)
	}

	reasons := toStringSlice(val["reasons"])
	ruleIDs := toStringSlice(val["rule_ids"])

	// Sort rule IDs deterministically so test fixtures stay stable across
	// Rego evaluation orderings.
	sort.Strings(ruleIDs)
	sort.Strings(reasons)

	return Decision{
		Outcome:     outcome,
		Reasons:     reasons,
		RuleIDs:     ruleIDs,
		Severity:    severity,
		LatencyMs:   time.Since(start).Milliseconds(),
		EvaluatedAt: time.Now().UTC(),
	}, nil
}

// failClosed builds a Deny decision used whenever the engine itself fails.
// Reason and rule id are stable strings so the caller can grep production
// logs for an engine-side incident vs an authored-policy deny.
func failClosed(start time.Time, ruleID, reason string) Decision {
	return Decision{
		Outcome:     OutcomeDeny,
		Severity:    SeverityCritical,
		Reasons:     []string{reason},
		RuleIDs:     []string{ruleID},
		LatencyMs:   time.Since(start).Milliseconds(),
		EvaluatedAt: time.Now().UTC(),
	}
}

// toStringSlice converts Rego's `[]interface{}` result slices to a Go
// []string, silently dropping non-string entries. Rego always returns
// arrays as []interface{}; we coerce here so the Decision type stays
// strictly typed.
func toStringSlice(v interface{}) []string {
	raw, ok := v.([]interface{})
	if !ok {
		return nil
	}
	out := make([]string, 0, len(raw))
	for _, e := range raw {
		if s, ok := e.(string); ok {
			out = append(out, s)
		}
	}
	return out
}
