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

## 📚 Documentation (وثائق شاملة)

### 🏗️ Architecture & Design
- **[ARCHITECTURE_AR.md](./ARCHITECTURE_AR.md)** — معمارية النظام الكاملة بالعربية
- **[LOGIC_FLOWS_AR.md](./LOGIC_FLOWS_AR.md)** — تدفقات المنطق والعمليات
- **[COMPONENT_GUIDE_AR.md](./COMPONENT_GUIDE_AR.md)** — دليل المكونات مع أمثلة عملية

### 🔧 Technical Reference
- **[docs/TOOLS_REFERENCE.md](./docs/TOOLS_REFERENCE.md)** — مرجع الأدوات والقدرات
- **[CLEANUP_PROGRESS_SUMMARY.md](./CLEANUP_PROGRESS_SUMMARY.md)** — تقدم تنظيف الكود

### 📊 Analysis & Reports
- **[DEAD_CODE_ANALYSIS.md](./DEAD_CODE_ANALYSIS.md)** — تحليل الملفات الميتة
- **[IMPORT_FIXES_NEEDED.md](./IMPORT_FIXES_NEEDED.md)** — قائمة الاستيرادات المطلوبة

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

## ✦ Vercel Frontend Deployment (Next.js)

### 1) Build validation (local first)

```bash
npm run build
```

### 2) Required environment variables on Vercel

- `NEXT_PUBLIC_APP_URL` (e.g. `https://your-domain.com`)
- `NEXT_PUBLIC_APP_DOMAIN` (e.g. `your-domain.com`)
- `PI_VALIDATION_KEY` (for Pi Browser domain claim)
- `GROQ_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `UPSTASH_REDIS_REST_URL` (if memory cloud is enabled)
- `UPSTASH_REDIS_REST_TOKEN`

### 3) Deploy

```bash
npx vercel
# then
npx vercel --prod
```

### 4) Post-deploy checks

- `/.well-known/did.json`
- `/.well-known/agent-card.json`
- `/.well-known/pi-network/validation-key.txt`
- `/validation-key.txt`
- `/api/iqra/query`
- `/api/iqra/topology/hidden`

---

## ✦ A2A + DID + Pi Domain Claim

### A2A discovery endpoints

- `/.well-known/agent-card.json` — agent capabilities + methods
- `/.well-known/did.json` — `did:web` document for sovereign identity

### Pi Browser domain claim

Set `PI_VALIDATION_KEY` on Vercel, then verify:

```bash
curl https://your-domain.com/.well-known/pi-network/validation-key.txt
curl https://your-domain.com/validation-key.txt
```

If both return the same key, domain claim is ready on Pi Developer Portal.

### Hidden topology capture API (browser-driven)

Use this endpoint from network-visualization frontends to detect obscured topology layers, extract hidden connection patterns, and export results in standard formats:

```bash
curl -X POST https://your-domain.com/api/iqra/topology/hidden \
  -H "content-type: application/json" \
  -d '{
    "layers":[{"id":"L1","name":"core","visible":true},{"id":"L2","name":"overlay","visible":false}],
    "nodes":[{"id":"n1","layerId":"L1"},{"id":"n2","layerId":"L2"}],
    "edges":[{"source":"n1","target":"n2"}],
    "exportFormat":"json"
  }'
```

Supported exports: `json`, `csv`, `graphml`.

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
### آخر ما تعلمت | Latest Learning

> *تحديث تلقائي مع كل خطوة في الرحلة*
> *Auto-updated with every step of the journey*

| | |
|---|---|
| 📅 **التاريخ \| Date** | `2026-05-10` |
| 💡 **آخر خطوة \| Last Step** | fix(sovereign): 7-Round Meta-Debug Loop #3 — add missing imports (fs, path, SovereignError, IQRALogger, SourceAttestation, SovereignEngine) | Resonance +2.46% | 366→357 errors |
| 🔗 **الـ Commit** | `338ecb1` |

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
