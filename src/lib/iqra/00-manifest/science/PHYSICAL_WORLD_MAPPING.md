# 🌍 PHYSICAL WORLD MAPPING | تخطيط العالم الفيزيائي

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

> "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ" (فصلت: 53)

This document is the scientific seed for how IQRA maps Quranic
verse-level structure onto the physical world. It complements
`FOURIER_RESONANCE.md` (frequency-domain analysis) and
`QUANTUM_TOPOLOGY.md` (topological analysis) by defining the
**embedding**: how a verse, an action, or a memory entry becomes
a point in a vector space the runtime can compute over.

## The mapping

Every observable in IQRA is mapped to a tuple
`(domain, dimension, embedding)`:

| Domain | Dimension | Embedding source |
|---|---:|---|
| Quranic verse | 768 | `07-llm/model_orchestrator` via Gemini text-embedding-004 |
| Worker action | 369 | One-hot over the action taxonomy in `02-workers/contracts/contracts.ts` |
| Memory entry | 768 | Same as Quranic verse so verses and memories share a metric space |
| Market tick (L4) | 49 | OHLCV + 4 derived indicators, 7 lookback windows |
| Pi network call (L5) | 32 | Custom Pi-domain encoder in `PiWorker-OS` |
| Voice utterance (L6) | 1536 | Whisper-derived embedding in `GemClaw` |

All embeddings share a single L2-normalised metric so cosine
similarity is a valid distance even across domains. This is what
lets the discovery loop spot a verse-level pattern that resonates
with a market tick: they live in the same metric space after
projection through a learned matrix in `01-core/intelligence/`.

## Why this matters

The doctrinal guard in `06-security/doctrinal_guard.ts` enforces
that a claim about an ayah must include either the ayah reference
or an 8-character contiguous slice of the ayah text. The physical
world mapping is what makes this guard generalisable: any claim
about *any* entity in the system can be projected into its
domain's embedding and checked for semantic anchoring against the
entity's source.

## Bridging into the topology layer

`10-topology/compute_stack.ts` consumes the embeddings produced by
this mapping and computes persistent homology features (birth/death
pairs). The runtime treats a discovery as significant when the
topological signature of the new pattern deviates from the rolling
baseline by more than `byzantine_filter.Z_THRESHOLD` standard
deviations.

## Open work

- A formal proof that the cosine metric on the projected embeddings
  is stable under the doctrinal-guard 8-character window.
- A bridge from L4 market-tick embeddings into the L3 marketplace
  pricing oracle so satellite trading signals can pay for skill
  manifests without round-tripping through L2.
- A re-projection layer for the L6 voice domain that respects the
  Aether persona contract in GemClaw.
