# constraints.rego
#
# Ports the 9-role RBAC table from
# `src/lib/iqra/06-security/contracts/constraints.ts`. The TS module is
# already shaped exactly like an OPA policy: a static role registry that
# maps each WorkerRole to allowed_actions, forbidden_actions, optional
# min_resonance, required_skills, and a few enforcement helpers. This
# port is faithful to that shape.

package aix.damir.constraints

import rego.v1


# The canonical role registry. Keys MUST match WorkerRole enum values in
# `contracts/constraints.ts`. Phase 5b ports the registry inline; Phase
# 5b.1 can move it to a generated data document.
roles := {
	"PLANNER":         {"allowed_actions": ["plan", "decompose", "estimate"],          "forbidden_actions": ["execute", "delete"],                         "required_skills": ["planning"],          "min_resonance": 0.6},
	"RESEARCHER":      {"allowed_actions": ["search", "summarize", "cite", "compare"], "forbidden_actions": ["execute_code", "modify_filesystem"],         "required_skills": ["research"],          "min_resonance": 0.5},
	"PATTERN_HUNTER":  {"allowed_actions": ["scan", "detect", "report"],               "forbidden_actions": ["delete", "modify"],                          "required_skills": ["pattern_detection"], "min_resonance": 0.55},
	"BUILDER":         {"allowed_actions": ["write_code", "refactor", "test"],         "forbidden_actions": ["deploy_production", "delete_repository"],    "required_skills": ["coding"],            "min_resonance": 0.6},
	"VALIDATOR":       {"allowed_actions": ["validate", "approve", "reject"],          "forbidden_actions": ["modify_subject"],                            "required_skills": ["validation"],        "min_resonance": 0.7},
	"SAFETY_AGENT":    {"allowed_actions": ["audit", "filter", "block", "approve"],    "forbidden_actions": ["bypass_safety", "disable_filter"],           "required_skills": ["safety_review"],     "min_resonance": 0.8},
	"REPORTER":        {"allowed_actions": ["report", "log", "summarize"],             "forbidden_actions": ["modify", "delete"],                          "required_skills": ["reporting"]},
	"ECONOMIST":       {"allowed_actions": ["calculate_reward", "tally", "trace_fold"], "forbidden_actions": ["mint", "transfer_external"],                 "required_skills": ["economics"],         "min_resonance": 0.7},
	"RESONANCE_AGENT": {"allowed_actions": ["measure", "harmonize", "tune"],           "forbidden_actions": ["force_resonance", "spoof_measurement"],      "required_skills": ["resonance"],         "min_resonance": 0.65},
}

# Rule 1: action listed in forbidden_actions for this role.
violations contains v if {
	role := input.context.role
	role != ""
	some forbidden in roles[role].forbidden_actions
	input.action.type == forbidden
	v := {
		"rule_id":  "constraints.role.forbidden_action",
		"reason":   sprintf("Role '%v' may not perform action '%v'.", [role, input.action.type]),
		"severity": "critical",
	}
}

# Rule 2: action not listed in allowed_actions for this role (only enforced
# when the role declares an allowed_actions list; an empty list means
# unrestricted by allowlist).
violations contains v if {
	role := input.context.role
	role != ""
	allowed := roles[role].allowed_actions
	count(allowed) > 0
	not action_in_allowlist(role)
	v := {
		"rule_id":  "constraints.role.action_not_allowed",
		"reason":   sprintf("Action '%v' is not in the allowlist for role '%v'.", [input.action.type, role]),
		"severity": "high",
	}
}

action_in_allowlist(role) if {
	some allowed in roles[role].allowed_actions
	input.action.type == allowed
}

# Rule 3: required_skills not satisfied.
violations contains v if {
	role := input.context.role
	role != ""
	some required in roles[role].required_skills
	not skill_present(required)
	v := {
		"rule_id":  "constraints.role.missing_skill",
		"reason":   sprintf("Role '%v' requires skill '%v' which is not present.", [role, required]),
		"severity": "high",
	}
}

skill_present(name) if {
	some skill in input.context.skills
	skill == name
}

# Rule 4: min_resonance violated. Only enforced when the role declares one.
violations contains v if {
	role := input.context.role
	role != ""
	threshold := roles[role].min_resonance
	threshold > 0
	input.context.resonance < threshold
	v := {
		"rule_id":  "constraints.role.min_resonance",
		"reason":   sprintf("Role '%v' requires resonance >= %.2f, got %.4f.", [role, threshold, input.context.resonance]),
		"severity": "medium",
	}
}
