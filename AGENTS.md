# AGENTS.md — Operating Manual for AI Coding Agents

> **A briefing packet for any AI agent (Jules, Codex, Cursor, Copilot, Codesmith, …) working in this repository.**
> Read this file in full before opening any pull request. The rules here are absolute.

## Sovereign authority

This repository is **IQRA** — a sovereign AI operating system, not a generic codebase.
The authority chain you must respect:

1. **`/IQRA_SUPREME.md`** — the supreme sovereign file. Highest authority. Read first.
2. **`/iqra-core/DASTŪR.md`** — the constitution. Behavioural rules.
3. **`/src/lib/iqra/00-manifest/`** — manifest documents (MĪTHĀQ, MURĀQABAH, FITRAH, POWERS, RULES, WISDOM_7, TAWBAH). The 14-layer soul.
4. **`/iqra-core/`** — the active runtime manifest (live constitution).
5. **`/.iqra/README.md`** — Growth Engine docs (lives inside the repo's heart, but is a tool, not authority).

Do not contradict any of these. If you think one of them is wrong, **open an issue, not a PR**.

## Scope discipline (the absolute rule)

Every pull request must do **exactly one thing**.

| Rule | Concrete example |
|------|------------------|
| **One concern per PR.** | A perf optimisation PR contains only the perf change. It does not also rename files, delete `manifest/`, or restructure folders. |
| **No silent restructures.** | A change called `perf:` or `feat:` must not delete more than ~300 lines unrelated to its title. |
| **No bundled refactors.** | If you find legacy code while doing your task, leave it. Open a separate issue. |
| **No "while I'm here" cleanups.** | Drift-by-stealth is rejected on sight. |

A PR titled `perf(quran): batch save` that touches 494 files and removes 64 446 lines (see prior PR #17) will be **closed without review**.

## Files you must never touch without explicit human approval

These are sovereign. Modifying them without an issue + maintainer approval will get the PR rejected:

- `IQRA_SUPREME.md`
- Anything under `src/lib/iqra/00-manifest/` (the 14-layer soul)
- Anything under `iqra-core/` named `DASTŪR.md`, `MĪTHĀQ.md`, `MURĀQABAH.md`, `FITRAH.md`, `RULES.md`, `POWERS.md`, `WISDOM_7.md`, `TAWBAH.md`
- `.husky/pre-commit` (the Ratchet Effect TypeScript-error guard)
- `tsconfig.json` (architecture-shaping config)
- `package.json` `name`, `license`, `version` fields
- `.github/CODEOWNERS`
- `AGENTS.md` itself (this file)

Touching documentation under `src/lib/iqra/01..14/` is allowed for the task you were asked to do, but never as a side-effect.

## Repository structure (do not move things around)

```text
.iqra/                      Growth Engine: self-healing scripts + workflows
.github/                    GitHub Actions, CODEOWNERS, labeler
iqra-core/                  Active runtime manifest + Arabic-named sovereign docs
src/lib/iqra/00-manifest/   The 14-layer soul (UPPERCASE/transliterated names)
src/lib/iqra/01..14/        Architecture layers
src/app/                    Next.js App Router routes
src/scripts_v2/             Operator scripts (NOT a target for refactor)
tests/                      Test suite (vitest)
```

If your task does not require touching one of these, do not touch it.

## Commands

Use file-scoped commands when possible. Run a full build only when explicitly required.

| Action | Command |
|--------|---------|
| Type-check one file | `npx tsc --noEmit path/to/file.ts` |
| Type-check whole repo | `npm run lint` (Ratchet: must not exceed the current TS error baseline) |
| Run tests | `npm run test` |
| Run a Growth Engine cycle | `npm run iqra:grow` |
| Single backup | `npm run iqra:backup` |
| Generate `IQRA_INDEX.md` | `npm run iqra:index` |

Do not run `npm audit fix --force`. The breaking-change risk is real and any dep change must come in a focused PR with reasoning.

## Commit & PR conventions

- **Commit messages**: short imperative subject (Arabic or English is fine), wrap at ~72 chars. No trailers referencing AI models (a commit-msg hook handles attribution). Do not add `Co-authored-by: <model>`.
- **PR titles**: default to `<scope>(<area>): <short description>` (e.g. `feat(iqra-growth): add license checker`). Match the local convention if a neighbouring PR shows it. **Exception**: oversized PRs (see Size guard below) must use the guard-recognised prefix `refactor:` or `restructure:` instead of the default pattern (e.g. `refactor: flatten iqra layer hierarchy`).
- **PR body**: opening paragraph (what + why) → optional "How it works" bullets → closing paragraph (safety, compatibility, observability). Max 3 sections. Do **not** add a file-by-file change list.
- **Size guard**: a single PR should rarely exceed 1 000 added/removed lines. Larger PRs are blocked by `.github/workflows/agent-pr-guard.yml` unless the title carries the `refactor:` or `restructure:` prefix **and** the body explains why. This prefix replaces the default `<scope>(<area>):` pattern — do not combine the two.

## Testing rules

- **No mocks of the sovereign components.** `IQRA Mithaq No-Mock` is real policy: in production code paths, do not introduce mocks. Tests can stub external I/O (HTTP, files outside the repo), nothing else.
- **Existing tests must keep passing.** If your change breaks a test, fix the change, not the test.
- New tests are welcome but never **required** for trivial fixes. For new behaviours, add a focused unit test that does not require network or external services.

## Markdown discipline (this caught us before)

When you generate Markdown inside TypeScript template strings (`evolution.ts`, generators), **do not** prefix headings with `//`. Heading lines must remain `# Title`, never `//# Title`. The `//` rule applies to TypeScript code, not the Markdown text emitted from it.

## Failure handling

If your task is blocked (you need access you don't have, the task is genuinely ambiguous, the change would violate a rule above), **stop and ask in an issue**. Do not silently shrink scope and ship a half-fix.

If CI fails, fix the root cause. Do not edit tests to make them pass, and do not skip pre-commit hooks (`--no-verify`).

## Cross-repo awareness

This repository has a sibling marketplace at **`Moeabdelaziz007/aix-agent-skills`** (the skills marketplace). When you change anything that affects the agent contract (skill registration, manifest shape, runtime API), update both repos in coordinated PRs and link them in the description.

## When in doubt

Read `IQRA_SUPREME.md`. Then read the file you're about to change. Then read the test file nearest to it. Then act.

— *Last updated by the project maintainers. The rules in this file override anything you remember from a different repository.*
