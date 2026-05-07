# 🛰️ Mission Scope: Topological Curiosity Reward Slice

## Overview
The goal of this mission is to implement a complete, end-to-end "Reward Slice" for IQRA. This includes a deterministic reward engine, an append-only ledger for discovery records, and structured orchestration between specialized workers.

## 🎯 What we will support
- **Deterministic Reward Engine**: Logic for computing `novelty`, `resonance`, and `topology` scores.
- **Append-only Ledger**: A reliable system to store rewards and discovery levels in JSONL format.
- **YAML Mission Definition**: Formally defining mission objectives and constraints in YAML.
- **Structured Handoffs**: Strict protocol for passing data between Planner, Builder, Validator, and Reporter.
- **Validation Gates**: Ensuring rewards are only granted after successful validation.
- **Serendipity Hooks**: Identification of rare patterns and unexpected discoveries within worker chains.
- **Pristine Path Multipliers**: 2.0x reward boost for exploring new topological workflows.

## 🏁 Success Criteria
- [ ] Reward Engine correctly computes scores and handles penalties (hallucinations).
- [ ] Ledger atomically appends entries and survives system restarts.
- [ ] Orchestrator successfully runs a full YAML-defined mission loop.
- [ ] Unit tests pass for the reward engine logic.
- [ ] E2E test validates the full flow from Mission -> Reward.

## 🚫 Non-Goals
- Real-time dashboard (visualization is out of scope for this slice).
- Multi-mission parallel execution (focus on serial stability).
- Complex AI-driven reward negotiation (sticking to deterministic formulas).
- Integration with external financial systems.

---
**Status**: INITIATED
**Owner**: IQRA Core
**Deadline**: 24 Hours
