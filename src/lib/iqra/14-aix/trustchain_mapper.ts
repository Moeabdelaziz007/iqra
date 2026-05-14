/**
 * @deprecated TrustChain mapping is now handled by @axiom/identity.
 * Kept as thin shim for backward compatibility.
 */
export interface IQRATrustChainEntry {
  action: string; actor_did: string; payload_hash: string;
  timestamp: string; prev_hash: string; human_approved: boolean;
}

export function mapEntry(
  entry: IQRATrustChainEntry,
  ownerDID: string
): IQRATrustChainEntry {
  return { ...entry, actor_did: entry.actor_did || ownerDID };
}

export function mapChain(
  entries: IQRATrustChainEntry[],
  ownerDID: string
): IQRATrustChainEntry[] {
  return entries.map(e => mapEntry(e, ownerDID));
}
