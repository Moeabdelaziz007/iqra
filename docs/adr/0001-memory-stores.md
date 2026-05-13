# ADR 0001: Memory Stores

- **Status**: Proposed (pending maintainer ratification)
- **Date**: 2026-05-13
- **Deciders**: Repository owner via the hygiene-audit conversation
  that produced #71
- **Supersedes**: implicit prior architecture described in
  `src/lib/iqra/03-memory/memory.ts:6` ("Powered by Upstash Redis,
  Supabase, and Qdrant")

## Context

`package.json` currently depends on five competing memory and vector
stores with no documented decision about which is the source of
truth for which kind of data:

| Store | Direct imports | Indirect refs | Env vars |
|-------|----------------|---------------|----------|
| `@upstash/redis`           | 2 | 5 | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| `better-sqlite3`           | 9 | 8 | none |
| `@qdrant/js-client-rest`   | 1 | 6 | `QDRANT_URL`, `QDRANT_API_KEY` |
| `@supabase/supabase-js`    | 0 | 4 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `@lancedb/lancedb`         | 0 | 6 | none |
| `lancedb` (legacy 0.0.1)   | 0 | 0 | none |
| `sqlite-vec`               | 0 (npm) | 1 (docs) | none |

The codebase shows a half-completed migration in two opposing
directions:

- `03-memory/memory.ts:6` documents the *older* design: Upstash
  Redis (working memory, TTL 7 d) + Supabase (relational +
  embeddings) + Qdrant (remote vector). Lazy `_supabase` and
  `_qdrant` static fields suggest cloud-first reliance.
- `03-memory/micro_memory.ts:14-20` documents the *newer* intent:
  "Why SQLite and not Redis/Qdrant?" → portability, no server,
  fits on 8 GB RAM, sub-millisecond vector search via `sqlite-vec`.

Nobody has closed the migration. Five stores remain registered.
Two of them (`lancedb` and `sqlite-vec`) have zero direct npm
imports. The legacy `lancedb@0.0.1` is a deprecated placeholder.

## Decision

Adopt a **three-store hybrid with explicit role boundaries** and
remove the rest.

| Store | Role | When to use |
|-------|------|-------------|
| `@upstash/redis` | Working memory, distributed sessions, short-TTL cache | 7-day TTL slice of recent mission state, A2A heartbeat, market-data tickers in `11-trading`. Source of truth for transient state shared across instances. |
| `better-sqlite3` + `sqlite-vec` | Local source of truth: Quran patterns, experience buffer, reward ledger, Shannon-entropy cache, local vector search | Everything that lives on the sovereign node: Quran ingestion, pattern memory, RL experience replay. Wiring `sqlite-vec` via `Database.loadExtension()` becomes a follow-up (see Migration plan). |
| `@supabase/supabase-js` | Multi-tenant relational + long-term embeddings | Optional cloud persistence layer when a tenant opts in. May be omitted entirely for fully-sovereign deployments. Today this row stays only because env vars and dynamic imports already exist; if it remains unused six months from now, retire in a follow-up ADR. |

### Removed

- **`@lancedb/lancedb`** and **`lancedb@0.0.1`**. Local vector
  search is provided by `sqlite-vec` per the `micro_memory.ts`
  design. The plugin at `03-memory/lancedb_plugin.ts` and the
  references in `memory.ts`, `discovery_persistence.ts`, and
  `06-security/sovereign_identity.ts` are retired in a follow-up
  migration PR.
- **`@qdrant/js-client-rest`**. Remote-only vector search adds an
  external service dependency that the local-first design does
  not require. The single direct import in
  `12-infrastructure/memory_governor.ts` migrates to `sqlite-vec`.

## Consequences

### Positive

- Goes from five competing stores to two required + one optional.
  Onboarding a new contributor stops requiring four cloud accounts
  before they can run the runtime.
- Resolves the contradiction between `memory.ts:6` and
  `micro_memory.ts:14`. New code targets the local-first design;
  cloud reach is opt-in, not default.
- Removes one dead-weight dependency (`lancedb@0.0.1`).

### Negative / risks

- Anyone running against an existing Qdrant or LanceDB instance
  loses that path during the migration. Mitigation: each removal
  ships as a focused PR with a one-week observability window
  before the dependency is dropped from `package.json`.
- `sqlite-vec` wiring is currently declared in `micro_memory.ts`
  but not loaded as a `Database.loadExtension()` call. Confirming
  the extension works in CI and in the production runtime is a
  prerequisite for retiring Qdrant. Tracked as a separate task.
- Supabase staying on the roster as "optional" leaves a quiet
  cost (one entry in `package.json`, one set of env vars in
  `.env.example`). If it remains unused, retire in ADR 0002.

## Migration plan

Each phase is its own PR per the scope discipline in `AGENTS.md`.

1. **ADR ratification** (this PR). No code changes; merely records
   the decision.
2. **Verify `sqlite-vec` loads** in `micro_memory.ts`. Add a smoke
   test that opens the DB, calls `loadExtension`, and runs a
   trivial vector query. Block subsequent phases on this test
   passing in CI.
3. **Migrate Qdrant call site** to `sqlite-vec`. Touches
   `12-infrastructure/memory_governor.ts`. After this lands and
   the runtime has run for one week without regression, remove
   `@qdrant/js-client-rest` from `package.json` and delete
   `QDRANT_URL` / `QDRANT_API_KEY` from `.env.example`.
4. **Migrate LanceDB plugin** to `sqlite-vec`. Touches
   `03-memory/lancedb_plugin.ts`, `memory.ts`,
   `discovery_persistence.ts`, `06-security/sovereign_identity.ts`.
   Then remove both `@lancedb/lancedb` and `lancedb` from
   `package.json`.
5. **Update `memory.ts:6` docstring** to reflect the new
   three-store reality.
6. **Re-evaluate Supabase**. If unused, retire in ADR 0002.

## Alternatives considered

- **Local-first only** (drop Upstash too). Rejected because
  `11-trading/market_data.ts` and the A2A async-tadabbur API route
  rely on distributed cache semantics that SQLite cannot serve
  across instances without significant work.
- **Cloud-native only** (drop local SQLite). Rejected because
  Quran ingestion and Shannon-entropy cache benefit from the
  zero-dependency local SQLite path documented in
  `micro_memory.ts`, and because sovereign deployments need to
  work without any external service.
