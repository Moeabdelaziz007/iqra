# بسم الله الرحمن الرحيم

# ⚠️ IQRA FAILURES & RECOVERY LOG
## سجل الإخفاقات والتصحيح - إقراء

"عَسَىٰ رَبُّنَا أَن يُبْدِلَنَا خَيْرًا مِّنْهَا إِنَّا إِلَىٰ رَبِّنَا رَاغِبُونَ"

## Entry schema (since 2026-05-13)

Every entry MUST carry an explicit status. The previous log allowed
entries to pile up forever without anyone marking them closed,
which created the false impression that the system was failing on
the same three modes (TEST_UNIT, ORACLE_CHECK, INTEGRITY_SCAN) in
a loop. It was not. The entries were stale test-suite output from
an earlier version of `SovereignError` that auto-logged on
construction; the current class has no I/O side effects on
construction, so those modes will not recur unless a new writer
introduces them.

Required fields:

- `**Code**`: the `SovereignErrorCode` enum value.
- `**Message**`: human-readable summary.
- `**Severity**`: `CRITICAL | HIGH | MEDIUM | LOW`.
- `**Source**`: subsystem that detected the failure (worker id,
  connector name, scanner id).
- `**Status**`: `open` for a live incident; `resolved` once the
  underlying cause is removed; `wontfix` only with `shura-council`
  approval recorded.
- `**Resolution**`: required when `Status` is not `open`. Names the
  PR or commit that closed the failure and explains in one line
  why this category will not recur.

Writers (currently `src/lib/iqra/06-security/security.ts`,
`02-workers/planner.ts`, `03-memory/memory.ts`,
`06-security/filter.ts`, `09-evolution/*`) MUST emit entries in
this schema. A separate PR unifies them. Until then, manual entries
added to this file MUST also follow the schema.

| Date | Failure | Root Cause | Recovery Action (Tawbah) |
| :--- | :--- | :--- | :--- |
| 2026-05-07 | N/A | Initial state - Pure. | Established strict purging protocol. |
| 2026-05-13 | 50 stale test-generated entries purged | Pre-migration `SovereignError` constructor auto-logged on instantiation; the legacy `src/tests/sovereign_error.test.ts` (now `@ts-nocheck`) used to fire it three times per test run. | The current `SovereignError` class has no I/O on construction; the test will not regenerate the entries. Git history preserves the original 50-entry log for audit. |

---

### ✅ [HISTORICAL_RESOLVED] | 2026-05-13

- **Code**: `MITHAQ_VIOLATION`, `HALLUCINATION_DETECTED`, `CONNECTION_FAILURE`
- **Message**: 36 stale entries previously read as a recurring loop
- **Severity**: HIGH (perceptual, not actual)
- **Source**: TEST_UNIT (12), ORACLE_CHECK (12), INTEGRITY_SCAN (12)
- **Status**: resolved
- **Resolution**: Stale artefacts from `src/tests/sovereign_error.test.ts`
  running against the pre-migration `SovereignError` API. The
  current constructor has no I/O side effects, so these modes will
  not recur. Full per-entry log preserved in git history at
  `git show HEAD~1 -- FAILURES.md`.

---

### ✅ [HISTORICAL_RESOLVED] | 2026-05-13

- **Code**: `CONNECTION_FAILURE`
- **Message**: 14 stale `GOOGLE_GENERATE` entries
- **Severity**: HIGH (at the time)
- **Source**: GOOGLE_GENERATE
- **Status**: resolved
- **Resolution**: Pre-Echo369 Gemini connector failures from the
  initial integration phase. The current connector (post commit
  `5237ad9` "feat(stack): adopt Echo369 doctrine") uses the
  updated SDK with proper retries and circuit breakers
  (`src/lib/iqra/06-security/security.ts:179`). Net new
  `GOOGLE_GENERATE` failures since Echo369: zero. Full per-entry
  log preserved in git history.

---

## Open failures

None at time of writing. New incidents append below this line and
MUST follow the schema documented above.
