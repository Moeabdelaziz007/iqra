/**
 * 🔗 TrustChain Mapper — IQRA → AIX
 *
 * IQRA's `TrustChainEntry` carries `action / input / output / score /
 * timestamp / hash / prev_hash`. AIX's `trustchain.entries[*]` carries
 * `action / actor_did / payload_hash / timestamp / prev_hash / human_approved`.
 *
 * Mapping rules:
 *   - action       → action (verbatim)
 *   - actor_did    → supplied by the exporter (the manifest's identity)
 *   - payload_hash → IQRA's `hash` (SHA-256 hex, 64 chars). If the legacy
 *                    field is shorter, this mapper pads/recomputes from
 *                    the (input,output,score) canonical tuple so the
 *                    schema invariant holds.
 *   - timestamp    → IQRA ms epoch → ISO 8601 string
 *   - prev_hash    → IQRA's `prev_hash` if available, else "0".repeat(64)
 *                    (genesis convention per the AIX schema examples)
 *   - human_approved → false unless the entry name encodes a SHURA event.
 */

import { sha256 } from '@noble/hashes/sha256';
import { canonicalizeJSON } from './canonical';
import { codec } from './ed25519_signer';
import type { AIXTrustChain, AIXTrustChainEntry, DID } from './types';

/**
 * IQRA's TrustChainEntry shape (mirrors `06-security/security.ts`).
 *
 * The authoritative shape uses `auditHash` (not `hash`), `inputHash`
 * + `outputHash` (not `input` + `output`), and `safetyScore` (not
 * `score`). The mapper still accepts the legacy/loose names as
 * optional aliases so historical exports keep working, but for any
 * real IQRA entry it MUST read the canonical fields so the chained
 * `auditHash` is preserved end-to-end. Recomputing a fresh hash from
 * a subset of fields would silently break audit traceability across
 * IQRA ↔ AIX.
 */
export interface IQRATrustChainEntry {
  // Canonical fields (IQRA security.ts)
  action?: string;
  auditHash?: string;
  inputHash?: string;
  outputHash?: string;
  safetyScore?: number;
  timestamp?: number;
  intention?: string;

  // Legacy aliases (older exports / hand-built records)
  type?: string;
  input?: string;
  output?: string;
  score?: number;
  hash?: string;
  prev_hash?: string;
}

const GENESIS_HASH = '0'.repeat(64);

function isFullSha256(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s);
}

function recomputeHash(entry: IQRATrustChainEntry): string {
  // Last-resort recomputation when an entry truly has no auditHash AND
  // no legacy hash to mirror. We include both the canonical and
  // legacy field aliases so a derived hash is at least stable across
  // export reruns of the same input.
  const canonical = canonicalizeJSON({
    action: entry.action ?? entry.type ?? '',
    inputHash: entry.inputHash ?? '',
    outputHash: entry.outputHash ?? '',
    input: entry.input ?? '',
    output: entry.output ?? '',
    safetyScore: typeof entry.safetyScore === 'number'
      ? entry.safetyScore
      : (typeof entry.score === 'number' ? entry.score : 0),
    timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : 0,
  });
  return codec.bytesToHex(sha256(new TextEncoder().encode(canonical)));
}

/**
 * Deterministic timestamp coercion.
 *
 * If the source entry has no usable timestamp, we MUST NOT fall back to
 * `new Date()` — that would inject wall-clock non-determinism into the
 * canonical payload and break signature stability across reruns of the
 * same input. Instead we use a fixed sentinel (Unix epoch) so the same
 * input always hashes the same way. Upstream code should set real
 * timestamps; this sentinel is a typed loud signal that one was missing.
 */
const SENTINEL_ISO = '1970-01-01T00:00:00.000Z';

function tsToISO(ms: number | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return SENTINEL_ISO;
  return new Date(ms).toISOString();
}

/** Heuristic: actions originating from a SHURA event count as human-approved. */
function inferHumanApproved(action: string): boolean {
  const a = action.toUpperCase();
  return a.startsWith('SHURA:') || a.includes(':APPROVED') || a.includes(':HUMAN_OK');
}

/**
 * Pick the strongest hash signal the entry carries.
 *
 * Order of preference (high → low):
 *   1) auditHash      — canonical IQRA chained hash (security.ts)
 *   2) hash           — legacy alias on hand-built / older exports
 *   3) recomputeHash  — derived last resort
 *
 * This preserves the original IQRA audit value when present, so the
 * AIX TrustChain section is byte-for-byte traceable back to the IQRA
 * security log instead of being silently re-derived.
 */
function pickPayloadHash(entry: IQRATrustChainEntry): string {
  if (isFullSha256(entry.auditHash)) return (entry.auditHash as string).toLowerCase();
  if (isFullSha256(entry.hash)) return (entry.hash as string).toLowerCase();
  return recomputeHash(entry);
}

/** Translate one IQRA entry to one AIX entry. */
export function mapEntry(entry: IQRATrustChainEntry, actorDID: DID): AIXTrustChainEntry {
  const action = entry.action ?? entry.type ?? 'UNKNOWN';
  const payload_hash = pickPayloadHash(entry);
  return {
    action,
    actor_did: actorDID,
    payload_hash,
    timestamp: tsToISO(entry.timestamp),
    prev_hash: isFullSha256(entry.prev_hash) ? (entry.prev_hash as string).toLowerCase() : GENESIS_HASH,
    human_approved: inferHumanApproved(action),
  };
}

/**
 * Translate the full IQRA chain to an AIX TrustChain section. Preserves
 * the chronological order from the input. The first entry's prev_hash
 * defaults to GENESIS_HASH; subsequent entries point at the previous
 * entry's `payload_hash` so the section is self-consistent regardless
 * of how the source log was assembled.
 */
export function mapChain(entries: IQRATrustChainEntry[], actorDID: DID): AIXTrustChain {
  let prev = GENESIS_HASH;
  const out: AIXTrustChainEntry[] = [];
  for (const raw of entries) {
    const mapped = mapEntry(raw, actorDID);
    mapped.prev_hash = prev;
    out.push(mapped);
    prev = mapped.payload_hash;
  }
  return { entries: out };
}

export const __trustchain_internals = { recomputeHash, GENESIS_HASH };
