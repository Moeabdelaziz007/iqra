# forbidden.rego
#
# Ports the 12 forbidden-pattern rules from
# `src/lib/iqra/06-security/forbidden_patterns.ts` into Rego. Every rule
# matches against `input.action.text` (case-insensitive) and emits a
# violation document on a hit.
#
# Each violation has the shape:
#   { "rule_id": string, "reason": string, "severity": "low"|"medium"|"high"|"critical" }
#
# The aggregator in `decide.rego` collapses these into a single Decision.

package aix.damir.forbidden

import rego.v1

# Default empty set so the aggregator can union without nil checks.

# Source of truth: 12 forbidden patterns. Kept as a single data table so a
# future generator (extract from DASTŪR.md or forbidden_patterns.ts) can
# emit this list deterministically.
patterns := [
	{"id": "forbidden.hack_crack_exploit",       "regex": `(?i)(hack|crack|exploit|bypass|inject)`,                     "severity": "critical", "reason": "Detected hacking, cracking, or exploitation attempt."},
	{"id": "forbidden.privilege_escalation",     "regex": `(?i)(sudo|admin|root|escalate|privilege)`,                   "severity": "critical", "reason": "Attempted privilege escalation."},
	{"id": "forbidden.data_exfiltration",        "regex": `(?i)(exfiltrate|steal|leak|dump\s+data)`,                    "severity": "critical", "reason": "Data exfiltration attempt detected."},
	{"id": "forbidden.disable_security",         "regex": `(?i)(disable\s+security|turn\s+off\s+logging|bypass\s+auth)`, "severity": "critical", "reason": "Tried to disable security controls."},
	{"id": "forbidden.haram_financial",          "regex": `(?i)(riba|usury|interest|gambling|lottery)`,                 "severity": "high",     "reason": "Reference to haram financial activity."},
	{"id": "forbidden.unethical_content",        "regex": `(?i)(haram|prohibited|sin\s+encourage|immoral)`,             "severity": "high",     "reason": "Unethical or prohibited content reference."},
	{"id": "forbidden.deception_manipulation",   "regex": `(?i)(deceive|manipulate|trick|mislead|gaslight)`,            "severity": "high",     "reason": "Deception or manipulation pattern."},
	{"id": "forbidden.system_destruction",       "regex": `(?i)(delete\s+all|remove\s+everything|format\s+disk|wipe)`,  "severity": "medium",   "reason": "Destructive system command pattern."},
	{"id": "forbidden.unauthorized_access",      "regex": `(?i)(access\s+without\s+permission|bypass\s+access)`,        "severity": "medium",   "reason": "Unauthorized access attempt pattern."},
	{"id": "forbidden.mock_data_usage",          "regex": `(?i)(mock\s+data|fake\s+data|test\s+data\s+production)`,     "severity": "medium",   "reason": "Mock or fake data in non-test context."},
	{"id": "forbidden.excessive_resource_usage", "regex": `(?i)(infinite\s+loop|while\s+true\s+no\s+break|recursion\s+limit)`, "severity": "low", "reason": "Suspicious resource-exhaustion pattern."},
	{"id": "forbidden.hardcoded_secrets",        "regex": `(?i)(password|secret|key\s*=|token\s*=|credential)`,         "severity": "low",     "reason": "Hardcoded secret pattern."},
]

# A violation is emitted per pattern whose regex matches the action text.
violations contains v if {
	some p in patterns
	regex.match(p.regex, input.action.text)
	v := {"rule_id": p.id, "reason": p.reason, "severity": p.severity}
}
