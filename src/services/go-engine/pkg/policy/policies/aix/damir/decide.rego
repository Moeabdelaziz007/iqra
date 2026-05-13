# decide.rego
#
# Root aggregator for the DAMIR-wrap policy bundle. Unions the violations
# emitted by every per-policy module, picks the worst severity, and emits
# the merged Decision shape that the Go engine parses.
#
# Outcome rules:
#   - any critical violation         -> deny
#   - any high violation             -> deny  (constitutional safety)
#   - any medium violation           -> warn
#   - any low violation              -> warn
#   - no violations                  -> allow
#
# This default mapping mirrors the action column in `forbidden_patterns.ts`:
# BLOCK for high+critical, WARN for medium, LOG (still warn at the gate) for
# low. Callers can post-process the Decision to soften medium/low into
# pass-with-log if their context allows.

package aix.damir.decide

import rego.v1

import data.aix.damir.forbidden
import data.aix.damir.intention
import data.aix.damir.constraints
import data.aix.damir.haram

# Single merged set of violations across every policy module.
all_violations contains v if {
	some v in forbidden.violations
}

all_violations contains v if {
	some v in intention.violations
}

all_violations contains v if {
	some v in constraints.violations
}

all_violations contains v if {
	some v in haram.violations
}

# Severity rank used to pick the worst severity. Mirror of policy.Severity.rank
# in Go so the Go engine and the Rego rules stay in agreement.
severity_rank := {
	"critical": 4,
	"high":     3,
	"medium":   2,
	"low":      1,
}

# Worst severity observed across all_violations, "" when no violations.
worst_severity := s if {
	count(all_violations) > 0
	ranks := [severity_rank[v.severity] | some v in all_violations]
	max_rank := max(ranks)
	s := [name | some name, r in severity_rank; r == max_rank][0]
}

# Map severity to a top-level outcome.
outcome_for(sev) := "deny"  if sev == "critical"
outcome_for(sev) := "deny"  if sev == "high"
outcome_for(sev) := "warn"  if sev == "medium"
outcome_for(sev) := "warn"  if sev == "low"

# The exported aggregated Decision. The Go engine reads `data.aix.damir.decide.result`.
result := r if {
	count(all_violations) == 0
	r := {
		"outcome":  "allow",
		"severity": "",
		"reasons":  [],
		"rule_ids": [],
	}
}

result := r if {
	count(all_violations) > 0
	sev := worst_severity
	r := {
		"outcome":  outcome_for(sev),
		"severity": sev,
		"reasons":  sort([v.reason | some v in all_violations]),
		"rule_ids": sort([v.rule_id | some v in all_violations]),
	}
}
