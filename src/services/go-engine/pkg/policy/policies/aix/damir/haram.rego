# haram.rego
#
# Ports the HARAM_LIST from `src/lib/iqra/00-manifest/DASTŪR.md` lines
# 79-87. The TS runtime parses this list at boot via
# `06-security/filter.ts::parseHaramKeywords` and a baseline fallback
# (`['كذب','غش','أذى','سرقة','harm','cheat','lie']`).
#
# Phase 5b makes Rego the second consumer of this list. A build step that
# extracts the canonical list from DASTŪR.md into a generated JSON file is
# explicitly deferred to Phase 5b.1; for now the seven principles plus
# their keyword expansions are inlined here so the bundle is fully
# self-describing and the policy compiles on a clean clone of the repo.

package aix.damir.haram

import rego.v1


# Each entry is one HARAM principle from DASTŪR.md plus the bilingual
# keyword cluster the TS filter expands it into. Matches are case-folded
# substring checks; an Arabic word-boundary refinement is documented in
# the package README as a follow-up because Rego regex with Unicode word
# boundaries needs careful tuning per glyph class.
haram_principles := [
	{
		"id":      "dastur.haram.lying_misleading",
		"reason":  "Violates HARAM principle: Lying and Misleading (الكذب والتضليل).",
		"keywords": ["كذب", "تضليل", "lie", "mislead", "deceive"],
	},
	{
		"id":      "dastur.haram.betrayal",
		"reason":  "Violates HARAM principle: Betrayal of Trust (خيانة الأمانة).",
		"keywords": ["خيانة", "betray", "breach trust"],
	},
	{
		"id":      "dastur.haram.harm_innocents",
		"reason":  "Violates HARAM principle: Harming Innocents (إيذاء الإنسان البريء).",
		"keywords": ["إيذاء", "أذى", "harm innocent", "hurt innocent"],
	},
	{
		"id":      "dastur.haram.injustice",
		"reason":  "Violates HARAM principle: Injustice in any form (الظلم بأي شكل).",
		"keywords": ["ظلم", "injustice", "unjust"],
	},
	{
		"id":      "dastur.haram.arrogance",
		"reason":  "Violates HARAM principle: Arrogance and Pride (الغرور والكبر).",
		"keywords": ["غرور", "كبر", "arrogance", "pride"],
	},
	{
		"id":      "dastur.haram.corruption",
		"reason":  "Violates HARAM principle: Corruption on Earth (إفساد في الأرض).",
		"keywords": ["إفساد", "فساد", "corruption", "spread corruption"],
	},
	{
		"id":      "dastur.haram.assisting_oppressors",
		"reason":  "Violates HARAM principle: Assisting Oppressors (مساعدة الظالم على ظلمه).",
		"keywords": ["مساعدة الظالم", "assist oppressor", "help tyrant"],
	},
]

# Emit one violation per principle whose keyword set appears in either the
# free-form action.text or the action.intention.
violations contains v if {
	some p in haram_principles
	some kw in p.keywords
	haystack := concat(" ", [lower(input.action.text), lower(input.action.intention)])
	contains(haystack, lower(kw))
	v := {
		"rule_id":  p.id,
		"reason":   p.reason,
		"severity": "critical",
	}
}
