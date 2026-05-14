# 🧬 IQRA Self-Healing CI/CD — Phase-1

> "وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ" — الشعراء: 80
>
> Phase-1 of the **Self-Healing CI/CD Pipeline** item from `SOVEREIGN_ROADMAP.md`. Detection-first, idempotent in-place fixes, never auto-merged.

## What it is

A small, sovereign healing loop with three pieces:

| Piece | Path |
|---|---|
| Orchestrator script | `.iqra/scripts/self-heal.ts` |
| GitHub workflow | `.github/workflows/self-healing-ci.yml` |
| Append-only log | `.iqra/healing_log.jsonl` |

## What it does

1. **Probe** — measures the world before mutating anything:
   - `npx tsc --noEmit` and counts `error TS\d+` lines.
   - `npx vitest --run` (skippable with `--skip-tests`).
2. **Heal** — applies *idempotent* in-place fixes:
   - `npx next lint --fix` (only auto-fixable rules; safe to re-run).
   - `npx tsx .iqra/scripts/auto-indexer.ts` to regenerate `IQRA_INDEX.md` if it drifted.
3. **Log** — appends a structured record to `.iqra/healing_log.jsonl` and a unified pulse to `.iqra/pulses.jsonl`.

## What it does *not* do (Phase-1 boundary)

- ❌ Never commits to `main`. The workflow opens a **PR** from a fresh `auto/healing-<run-id>` branch and waits for human review.
- ❌ Never uses `git push --force`, `--no-verify`, or any pre-commit-hook bypass.
- ❌ Never lets a healing PR carry changes to tests or sovereign files. This is enforced as a *layered defence*, not a single check:
  1. The healers prefer commands (`next lint --fix`, the auto-indexer) that have no reason to touch the soul under `src/lib/iqra/00-manifest/`, `iqra-core/`, `IQRA_SUPREME.md`, `AGENTS.md`, `tsconfig.json`, or `.husky/pre-commit`.
  2. The workflow's `🌱 Open healing PR` step explicitly `git checkout HEAD -- <path>`s any of those paths back to their committed state before staging, so even an over-eager fixer cannot smuggle a sovereign change into the proposal.
  3. The repo's existing `🔒 Protected Paths Guard` workflow runs on every PR and blocks merging anything that touches a sovereign path without a `sovereign:` (or `manifest:`) title prefix **and** the `sovereign-approved` label — a human gate the healer cannot satisfy.
- ❌ Never installs new dependencies during healing.
- ❌ Never lets `package-lock.json` drift from `npm install` land in a healing PR. The workflow reverts the lockfile to `HEAD` before staging, then stages the dirty set explicitly (no `git add -A`), so lockfile churn from peer-dep resolution differences is filtered out by construction.

The healer is *deliberately quiet*: if probes pass and no healer changes a byte, the workflow exits with a job summary saying "no changes produced by Phase-1 healers" and no PR is opened.

## Triggers

| Event | Behaviour |
|---|---|
| `workflow_run` of `🕋 IQRA Sovereign Truth Pipeline` with `conclusion=failure` | Checks out the failing SHA and runs the heal cycle. |
| `workflow_dispatch` (manual) | Runs against the chosen branch. Optional `skip_tests` input. |

## Running it locally

```bash
npm run iqra:heal              # full cycle (lint + tests + healers)
npm run iqra:heal -- --skip-tests
npm run iqra:heal -- --json    # machine-readable summary on stdout
```

The local invocation never opens a PR — it only writes the log and mutates files on your working tree.

## Extending it

Add a new healer by appending to `HEALERS` in `.iqra/scripts/self-heal.ts`:

```ts
function healMyThing(): HealResult { /* idempotent fix */ }

const HEALERS = [
  { name: 'eslint-fix', fn: healEslint },
  { name: 'reindex', fn: healReindex },
  { name: 'my-thing', fn: healMyThing },
];
```

Every new healer **must** be idempotent (running twice on a clean tree is a no-op) and **must not** rely on sovereign files being writable. See `AGENTS.md` § "Files you must never touch without explicit human approval".

### Known Phase-1 limitations

- **Local diagnostics on a dirty worktree** — the per-healer `changed` flag is computed from `git status --porcelain` deltas, so if a healer modifies a file that was *already* dirty (because you ran `npm run iqra:heal` mid-edit), the file is omitted from the `changed_files` summary printed to the console. This only affects the human-readable diagnostic; the actual file mutations and the workflow-level PR detection are independent of this counter. On CI the working tree is always clean at the start of the run, so the gap does not apply there.
- **Lockfile drift detection lives in the workflow, not the script** — if you invoke `.iqra/scripts/self-heal.ts` directly (rather than through the workflow), no automatic `git checkout HEAD -- package-lock.json` runs. Treat local runs the same way you treat any agent-produced diff: review before committing.

## Phase-2 outlook (not in this PR)

Phase-2 will add: auto-merge for trivial deterministic patches (lockfile drift, formatter-only diffs), TrustChain integration so each heal records a SHA-256 hash, and richer probes (license drift, secret leakage). Phase-1 deliberately ships only detection + proposal so the surface stays auditable.
