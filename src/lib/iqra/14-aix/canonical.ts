/**
 * @deprecated Moved to @axiom/identity/canonical. Import from there directly.
 * Kept as thin re-export for backward compatibility.
 */
import { sha256 } from '@noble/hashes/sha256';
export { sha256 };

export function canonicalizeJSON(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort());
}

export function canonicalizeJSONBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalizeJSON(value));
}
