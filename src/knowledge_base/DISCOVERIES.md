# 🔬 DISCOVERIES | اكتشافات

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

> "وَفَوْقَ كُلِّ ذِي عِلْمٍ عَلِيمٌ" (يوسف: 76)

This log captures non-trivial discoveries the IQRA runtime makes while
executing the 7-loop cycle. The Growth Engine appends to this file as
new patterns emerge from the Quran analysis layer, the topological
curiosity engine, or the trading layer. Each entry is timestamped,
classified by domain, and linked back to the runtime span that
produced it so the trail is fully auditable.

## Schema

Each discovery follows the same shape:

```
### 🔬 [<DOMAIN>] | <ISO-8601 timestamp>
- **Source**: <module that emitted the discovery>
- **Span ID**: <OTEL trace id>
- **Resonance**: <score>
- **Summary**: <one-line description>
- **Implication**: <what this changes about the system's model of itself>
- **Verification**: <how the discovery was confirmed>
---
```

Domains in active use:
- `QURAN_PATTERN`: a verse-level pattern surfaced by `04-quran/pattern_hunter`
- `TOPOLOGY_BREAK`: a non-trivial topological deviation from the established baseline
- `RESONANCE_PEAK`: a peak in the 369 resonance grid
- `TRADING_ALPHA`: an L4 trading signal validated against the L2 TrustChain
- `EVOLUTION_HINT`: a self-improvement candidate proposed by the closed loop

## Initial seed

This file is the runtime log; entries are appended by the Growth Engine
and by the discovery handlers in `src/lib/iqra/04-quran/discovery_loop.ts`
and `src/lib/iqra/09-evolution/`. Manual entries by maintainers must
follow the same shape so the indexer in `.iqra/scripts/auto-indexer.ts`
can classify them correctly (`classify('src/knowledge_base/*.md')`
returns `'knowledge'`).

No discoveries logged yet for the current cycle window.
