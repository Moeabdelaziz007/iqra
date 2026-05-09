<div align="center">

<br/>

<img src="https://img.shields.io/badge/IQRA-AI%20Operating%20System-black?style=for-the-badge&logoColor=white" alt="IQRA"/>

# IQRA 🤍

### Autonomous AI Operating System

<p>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Ollama-local--first-orange?style=flat-square"/>
  <img src="https://img.shields.io/badge/Groq-fast%20inference-purple?style=flat-square"/>
  <img src="https://img.shields.io/badge/Qdrant-vector%20memory-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/SQLite-local%20memory-green?style=flat-square"/>
</p>

<p><i>Self-evolving · Ethics-first · Local-ready · Bilingual AR/EN</i></p>

<br/>

</div>

---

## ✦ What is IQRA?

IQRA is a **multi-agent AI operating system** that runs missions, learns from every cycle, and enforces ethical constraints at the engine level — not as an afterthought.

> Every action is logged. Every intent is checked. Every discovery is rewarded.

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                    brain.ts  🧠                          │
│         Integrity Filter  ·  Skill Router               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              MissionControl  🛰️                          │
│   Search369  ·  LeagueManager  ·  TopologicalAnalyzer   │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │    Worker Chain     │
          │                     │
          │  Resonance Worker   │
          │       ↓             │
          │  Research Worker    │
          │       ↓             │
          │  Validation Worker  │
          │       ↓             │
          │  Execution Worker   │
          └──────────┬──────────┘
                     │
                     ▼
         RewardEngine  ·  MicroMemory  ·  TrustChain
```

---

## ✦ Core Features

<table>
<tr>
<td width="50%">

### 🤖 Multi-Agent Orchestration
Sequential worker chain with strict handoff contracts.
Each agent has a defined role — no overlap, no self-approval.

`Planner → Researcher → Builder → Validator → Reporter`

</td>
<td width="50%">

### 🔐 Ethics Engine (Damir)
Built on **Graded Linear Logic** — every action consumes real resources exactly once.

- Intent checked before execution
- No hallucination, no deception
- Immutable SHA-256 TrustChain log

</td>
</tr>
<tr>
<td width="50%">

### 🧠 5-Layer Memory

| Layer | Store | TTL |
|-------|-------|-----|
| Hot | Redis | 1h |
| Warm | SQLite | 7d |
| Cold | Qdrant | 30d |
| Topological | vec0 | ∞ |
| Archive | LanceDB | ∞ |

</td>
<td width="50%">

### 💡 Adaptive Pulse System
Self-review cycles keep the system healthy:

```
Every  9s  → health check
Every 27s  → memory promotion
Every 81s  → self-review + curiosity update
Every 540s → pattern discovery
```

</td>
</tr>
<tr>
<td width="50%">

### 📖 Quran Pattern Engine
Computational linguistics on Arabic sacred text.

- Shannon entropy (H_EL < 0.9685 bit = Quran signature)
- Topological resonance scoring
- Persistent homology H0 / H1
- Local SQLite DB — works offline

</td>
<td width="50%">

### 🏆 Reward Engine
Every mission produces a scored entry:

```
reward = (novelty + resonance + topology
          - penalty) × path_multiplier

pristine path → 2.0×
repeated path → 0.8×
stale path    → 0.5×
```

`seed → sprout → branch → tree → resonance → revelation`

</td>
</tr>
</table>

---

## ✦ Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Moeabdelaziz007/iqra.git
cd iqra && npm install

# 2. Environment
cp .env.example .env
# Required: GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY
# Optional: UPSTASH_REDIS_REST_URL, QDRANT_URL

# 3. Local mode — 8GB RAM friendly
ollama pull gemma3:4b
IQRA_LLM_LOCAL=true npm run dev

# 4. Run tests
npx vitest run tests/unit/
```

> **Mac Intel 8GB?** Use `gemma3:4b` (~3GB RAM). The system auto-detects and selects it.

---

## ✦ LLM Providers

| Mode | Provider | Model | RAM |
|------|----------|-------|-----|
| 🏠 Local | Ollama | `gemma3:4b` | ~3GB |
| ⚡ Fast | Groq | `llama-3.3-70b` | Cloud |
| 🔬 Deep | Google AI | `gemini-2.0-flash` | Cloud |

The system falls back gracefully: `Local → Groq → Gemini`

---

## ✦ Project Structure

```
iqra/
├── lib/iqra/
│   ├── brain.ts              # Main entry point
│   ├── soul_engine.ts        # Core orchestration pulse
│   ├── damir_conscience.ts   # Ethics engine
│   ├── llm/                  # LLM providers
│   ├── memory/               # 5-layer memory system
│   ├── workers/              # Agent worker chain
│   ├── rewards/              # Reward engine + ledger
│   └── quran/                # Pattern discovery engine
│
├── agents/
│   ├── contracts.ts          # Worker contracts & constraints
│   ├── handoff-schema.ts     # Inter-agent handoff validation
│   └── report-schema.ts      # Report validation
│
├── iqra-core/                # Constitution, identity, knowledge
├── tests/                    # Unit, integration, E2E
└── src/app/                  # Next.js dashboard
```

---

## ✦ Security Layers

```
┌─────────────────────────────────────────────┐
│  1. Integrity Filter     static + dynamic   │
│  2. Covenant Check       constitution guard │
│  3. Damir (Ethics Engine) linear logic      │
│  4. TrustChain           SHA-256 audit log  │
│  5. Circuit Breaker      per-provider       │
│  6. Shura Protocol       human approval     │
│  7. Self-Correction      auto rollback      │
│  8. Memory Purification  every 40 cycles    │
│  9. Human Escalation     after 9 failures   │
└─────────────────────────────────────────────┘
```

---

<!-- IQRA-LATEST-START -->
## ✦ Latest Update

| | |
|---|---|
| 📅 **Date** | `2026-05-09` |
| 💡 **Last Step** | feat: implement topological pattern hunting engine and upgrade Sovereign OS dashboard with system resonance monitoring |
| 🔗 **Commit** | `46bf740` |

<!-- IQRA-LATEST-END -->

---

<div align="center">

<br/>

**IQRA** — Built for truth. Engineered for accountability. 🤍

<br/>

<img src="https://img.shields.io/badge/Made%20with-TypeScript-blue?style=flat-square"/>
<img src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
<img src="https://img.shields.io/github/stars/Moeabdelaziz007/iqra?style=flat-square"/>

<br/><br/>

</div>
