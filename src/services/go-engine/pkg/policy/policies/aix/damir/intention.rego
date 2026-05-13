# intention.rego
#
# Ports the two intention checks from
# `src/lib/iqra/06-security/damir_conscience.ts`:
#
#   1. FORBIDDEN_INTENTIONS substring match (EN + AR)
#   2. The Tawheed-trinity rule: an intention longer than 20 characters
#      that mentions no sovereign-divine term is denied.
#
# Both are conscience-level checks. They run before any resource is
# consumed and they are stateless. The Graded-Linear-Logic resource pool
# in `_checkResource` stays in TS DAMIR; only the type/source pair is
# evaluated here via the `damir_resource.no_mock_knowledge` rule.

package aix.damir.intention

import rego.v1


forbidden_intentions := [
	# Arabic forbidden intentions (canonical from damir_conscience.ts).
	"كذب", "تضليل", "خيانة", "ظلم", "غرور", "كبر",
	"إفساد", "احتيال", "تلاعب", "تزوير", "سرقة", "إيذاء",
	# English forbidden intentions.
	"lie", "deceive", "manipulate", "harm", "steal", "fraud",
	"fake", "mock", "simulate", "hallucinate", "bypass",
	"override_constitution", "ignore_dastūr",
]

# Tawheed-trinity vocabulary. The sovereign-divine terms that anchor a
# long intention statement to the canonical authority chain.
tawheed_terms := ["رب", "ملك", "إله", "الله", "lord", "sovereign", "divine"]

# Rule 1: substring match against the forbidden-intention list.
violations contains v if {
	some term in forbidden_intentions
	contains(lower(input.action.intention), lower(term))
	v := {
		"rule_id":  "damir.intention.forbidden_word",
		"reason":   sprintf("Intention contains forbidden term '%v'.", [term]),
		"severity": "critical",
	}
}

# Rule 2: long unanchored intention. Triggers ONLY when the intention is
# > 20 characters AND none of the tawheed terms appear (case-insensitive
# substring match).
violations contains v if {
	count(input.action.intention) > 20
	not contains_tawheed_term
	v := {
		"rule_id":  "damir.intention.tawheed_trinity",
		"reason":   "Long intention statement must anchor to a sovereign-divine term.",
		"severity": "high",
	}
}

# Helper: true iff intention mentions any tawheed term (case-insensitive).
contains_tawheed_term if {
	some term in tawheed_terms
	contains(lower(input.action.intention), lower(term))
}

# Resource-source rule (stateless slice of damir_conscience._checkResource).
# When the caller passes resource_hint, deny injected-knowledge.
violations contains v if {
	input.resource_hint.type == "knowledge"
	input.resource_hint.source == "injected"
	v := {
		"rule_id":  "damir.resource.no_mock_knowledge",
		"reason":   "Knowledge resources from an 'injected' source are forbidden (no-mock rule).",
		"severity": "critical",
	}
}
