# ❌ FAILURES | الإخفاقات

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

> "وَأَنْ عَسَىٰ أَن يَكُونَ قَدِ اقْتَرَبَ أَجَلُهُمْ" (الأعراف: 185)

Runtime failures log. The Growth Engine and the worker layer append
here whenever an operation fails in a way that warrants reflection.
This is the read side of the loop that ends in `TAWBAH.md`: failures
captured here feed the Tawbah protocol so the runtime can correct
itself rather than repeating the same mistake.

## Schema

Each failure follows the same shape as the sovereign-level
`00-manifest/FAILURES.md` so consumers can merge both logs:

```
### ❌ [SOVEREIGN_FAILURE] | <ISO-8601 timestamp>
- **Code**: <CONNECTION_FAILURE | RUNTIME_ERROR | CONSCIENCE_REJECT | ...>
- **Message**: <one-line summary>
- **Severity**: <LOW | MEDIUM | HIGH | CRITICAL>
- **Source**: <module that emitted the failure>
- **Span ID**: <OTEL trace id, optional>
- **Recovery**: <REFLECT | RETRY | TAWBAH | HUMAN_REQUIRED>
---
```

## Distinction from `00-manifest/FAILURES.md`

The manifest-level FAILURES log is the **constitutional** record of
sovereign failures (rare, high-severity events that touch the
constitution). This `knowledge_base/FAILURES.md` is the **runtime**
record (high-volume, lower-severity operational failures that the
Growth Engine and the worker conscience emit as part of the 7-loop
cycle). Consumers can merge both via the indexer.

No runtime failures logged yet for the current cycle window.
