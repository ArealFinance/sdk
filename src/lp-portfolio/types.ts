// Public type surface for `@areal/sdk/lp-portfolio`.
//
// Phase 1 — read-only composite reader for a holder's LP positions across
// every PoolState owned by the Native DEX program. Mirrors the layered shape
// used by `@areal/sdk/portfolio` (per-row enumeration + composite snapshot)
// and the USDC-pricing semantics of `@areal/sdk/markets`.
//
// Bigints carry every raw on-chain shares / reserve / amount so callers
// never lose precision; USD-side fields are `number` because the UI
// surfaces them formatted (and the maximum representable USDC TVL is
// well below 2^53).

import type { PublicKey } from '@solana/web3.js';
import type {
  LpPosition,
  PoolState,
} from '../programs/native-dex/accounts.generated.js';

/**
 * USDC valuation of a single LP position.
 *
 * `amountA / amountB` are raw on-chain units returned by `quoteLpRemove`
 * (i.e. lamports for the respective token decimals). Conversion to USDC
 * is done per-side: a missing per-token price (e.g. unpriceable mint) keeps
 * that side's USDC field `null` rather than coercing it to zero — the UI
 * must render `—` instead of `$0` for unpriceable rows.
 *
 * `pctA / pctB` are the share-of-total split by USDC value, in `[0, 1]`.
 * `ratioA` is an alias of `pctA` exposed under a more semantic name for
 * the TickWheel donut renderer.
 */
export interface LpPositionValuation {
  /** Raw token A amount the holder would receive on full burn. */
  amountA: bigint;
  /** Raw token B amount the holder would receive on full burn. */
  amountB: bigint;
  /** USDC value of the A side. null when `priceUsdcA` is null. */
  usdcA: number | null;
  /** USDC value of the B side. null when `priceUsdcB` is null. */
  usdcB: number | null;
  /** Sum of `usdcA + usdcB`. null when EITHER side is null. */
  totalUsdc: number | null;
  /** USDC share of the A side, in `[0, 1]`. null when `totalUsdc` is null or 0. */
  pctA: number | null;
  /** USDC share of the B side, in `[0, 1]`. null when `totalUsdc` is null or 0. */
  pctB: number | null;
  /** Alias of `pctA` — semantic for TickWheel donut consumers. */
  ratioA: number | null;
}

/** A single LP position joined with its parent pool, ready for UI rendering. */
export interface HolderLpRow {
  /** PDA address of the LpPosition account. Useful for WS subscriptions. */
  positionAddress: PublicKey;
  /** Parsed LpPosition state (raw on-chain shape). */
  position: LpPosition;
  /** Parsed PoolState of the pool this position belongs to. */
  pool: PoolState;
  /** PDA address of the parent pool. */
  poolAddress: PublicKey;
  /** OT-config-derived display symbol for token A (USDC/RWT registered explicitly). */
  symbolA: string;
  /** OT-config-derived display symbol for token B. */
  symbolB: string;
  /** Token A decimals (from OT config or USDC/RWT constants). */
  decimalsA: number;
  /** Token B decimals (from OT config or USDC/RWT constants). */
  decimalsB: number;
  /** USDC valuation of the position. */
  valuation: LpPositionValuation;
  /** True iff `position.shares === 0n`. Caller decides whether to filter. */
  isEmpty: boolean;
}

export interface HolderLpSnapshot {
  /** The wallet whose LP positions were enumerated. */
  holder: PublicKey;
  /** One row per joined (position, pool) pair. Orphan positions are dropped. */
  rows: HolderLpRow[];
  /**
   * Sum of `row.valuation.totalUsdc` across rows where it is non-null.
   * null when EVERY row contributed null (e.g. all rows unpriceable).
   */
  totalUsdc: number | null;
  /** ms since epoch — when the snapshot was assembled. */
  fetchedAt: number;
  /** slot taken AFTER all reads — see comment in `snapshot.ts`. */
  slot: number;
}
