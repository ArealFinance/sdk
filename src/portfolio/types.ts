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
  /**
   * Per-second emission rate for this holder, in RWT base units / sec.
   *
   * Mirrors the on-chain vesting math: while a fresh `fund_distributor`
   * window is open (`now - last_fund_ts < vesting_period`), the unclaimed
   * pile grows at a constant
   *
   *   `(total_funded - locked_vested) × cumulative / max_total_claim / vesting_period`
   *
   * per second. Once the window elapses the rate drops to `0n` — the
   * caller's `claimableNow` keeps the already-vested amount, but no new
   * unlocks happen until the next fund.
   *
   * `null` when `cumulativeAmount` is unknown (no proof) or no distributor
   * exists — caller should display "—" instead of misleading "0".
   */
  vestingRatePerSec: bigint | null;
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

/**
 * Wire shape from merkle-publisher proof-store.
 *
 * NOTE (Phase 6): the SDK does NOT verify this proof against the on-chain
 * MerkleDistributor root before surfacing `cumulativeAmount` to the UI —
 * it trusts the proof-store as a read-side cache. Holders cannot lose funds
 * from a wrong proof because the actual `claim` instruction is verified
 * on-chain at execution time against the distributor's root: a bad proof
 * simply fails the transaction. The worst-case impact of a bogus proof
 * here is a UI showing a `claimableNow` value that the user cannot actually
 * claim. Phase 7+ may add client-side proof verification (recompute the
 * root from `proof[]` and compare against the on-chain `merkle_root`) to
 * close that UI-display gap.
 */
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
