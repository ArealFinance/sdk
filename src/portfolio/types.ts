// Public type surface for `@areal/sdk/portfolio`.
//
// Phase 6 — read-only composite portfolio: per-OT balance, distributor
// existence, on-chain claimed amount and (optionally) a published Merkle
// proof's cumulative entitlement. Bigints are used for raw token amounts so
// callers never lose precision; PDAs are exposed as `PublicKey` so callers
// can re-derive WS subscriptions without re-walking program seeds.

import type { PublicKey } from '@solana/web3.js';

/** Per-OT row in a holder's portfolio snapshot. */
export interface PortfolioRow {
  otMint: PublicKey;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
  /** Raw balance in OT base units. 0n if no ATA. */
  balance: bigint;
  /** MerkleDistributor PDA. null if no distributor exists. */
  distributor: PublicKey | null;
  /** Cumulative entitlement from latest published Merkle proof. null when unavailable. */
  cumulativeAmount: bigint | null;
  /** Already-claimed from on-chain ClaimStatus. 0n if PDA absent. */
  claimedAmount: bigint;
  /** cumulative - claimed when known, clamped to >= 0n. null if cumulative unknown. */
  claimableNow: bigint | null;
  /** Holder ATA — exposed for WS subscription. */
  ataAddress: PublicKey;
}

export interface PortfolioSnapshot {
  holder: PublicKey;
  rows: PortfolioRow[];
  /** ms since epoch */
  fetchedAt: number;
  /** slot taken AFTER all reads */
  slot: number;
}

/** Wire shape from merkle-publisher proof-store. */
export interface MerkleProof {
  distributor: string;
  epoch: number;
  holder: string;
  /** bigint as decimal string */
  cumulativeAmount: string;
  /** hex-encoded sibling hashes */
  proof: string[];
  /** hex-encoded root */
  merkleRoot: string;
  publishedAt: number;
}
