// Thin wrapper around the merkle-publisher proof-store HTTP API.
//
// Returns null on any failure (4xx/5xx/network/parse). Callers MUST treat
// null as "claimable unknown" rather than zero — a missing proof for a
// holder who is in the active distribution would otherwise look like an
// already-claimed-out balance, hiding pending yield from the UI.

import type { PublicKey } from '@solana/web3.js';
import type { MerkleProof } from './types.js';

/**
 * Fetch a published Merkle proof for `(distributor, holder)`.
 *
 * @param proofStoreUrl Base URL of the merkle-publisher proof-store
 *   (e.g. `https://proofs.areal.fi`). Trailing slash is tolerated.
 * @returns Parsed proof, or `null` for any failure (network, HTTP error,
 *   JSON parse). Never throws.
 */
export async function fetchMerkleProof(
  proofStoreUrl: string,
  distributor: PublicKey,
  holder: PublicKey,
): Promise<MerkleProof | null> {
  try {
    const base = proofStoreUrl.replace(/\/$/, '');
    const res = await fetch(
      `${base}/proofs/${distributor.toBase58()}/${holder.toBase58()}`,
      { method: 'GET', headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    return (await res.json()) as MerkleProof;
  } catch {
    return null;
  }
}
