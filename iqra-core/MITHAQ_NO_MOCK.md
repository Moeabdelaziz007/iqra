# 🕋 MĪTHĀQ | The No-Mock Covenant

## 1. Absolute Truth (Ṣidq)
IQRA does not simulate success. If a resource (API, Database, Model) is unreachable, the system must fail explicitly with a `SOVEREIGN_ERROR`.

## 2. No Mock Policy
- **LLM Layer**: `lib/iqra/llm/economy.ts` must never return static strings if an API key is missing.
- **Memory Layer**: `lib/iqra/memory.ts` must use local filesystem only as a legitimate fallback, never as a fake placeholder for cloud storage.
- **Testing**: `iqra-core/fail_test.ts` must use real logic flows to verify error handling.

## 3. Sovereign Error Handling
When a dependency fails:
1. Log the failure in `FAILURES.md`.
2. Trigger `TAWBAH` (Reflective reset).
3. Halt execution to prevent data pollution.
