// Public type surface for `@areal/sdk/markets`.
//
// Phase 9 — read-only composite reader for the markets list + detail pages:
// pool enumeration, USDC pricing (direct or chained via RWT), TVL, and
// per-pool depth slices computed off the pure `quoteSwap` helper.
//
// Bigints carry every raw on-chain reserve / supply so callers never lose
// precision; USD-side fields are `number` because the UI surfaces them
// formatted (and the maximum representable USDC TVL is well below 2^53).

import type { PublicKey } from '@solana/web3.js';

import type { PoolState } from '../programs/native-dex/accounts.generated.js';

/**
 * How the SDK arrived at a token's USDC price:
 *   - `direct-usdc` — the token IS USDC (price = 1) OR a direct token-USDC
 *     pool was found and its spot rate is used.
 *   - `via-rwt`     — no direct pool; the SDK chained
 *     `token → RWT → USDC` using the spot rates of the two pools.
 *   - `unpriceable` — neither path resolved (no pools, or the chain hit a
 *     side with zero reserves). UI must render `—` rather than `$0`.
 */
export type PriceSource = 'direct-usdc' | 'via-rwt' | 'unpriceable';

export interface ChainPriceResult {
  priceUsdc: number | null;
  source: PriceSource;
}

export interface TokenRow {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  /**
   * UI-side category bucket inferred from the OT name/symbol prefix.
   * RWT is `'protocol'`; SPRK/STOCK/EQ-prefixed OTs are `'stock'`; every
   * other OT defaults to `'ownership'`. `'unknown'` is reserved for tokens
   * the markets reader sees in pools but that lack a known config.
   */
  category: 'protocol' | 'ownership' | 'stock' | 'unknown';
  /** USDC-denominated. null if no priceable pool exists. */
  priceUsdc: number | null;
  priceSource: PriceSource;
  /** RWT only — book NAV from RwtVault. null otherwise. */
  nav: bigint | null;
  /** True when the RWT mint matches the R20 placeholder (mainnet pre-deploy). */
  isPlaceholder: boolean;
}

export interface PoolRow {
  poolAddress: PublicKey;
  /** 0 = StandardCurve, 1 = Concentrated. Matches `PoolState.poolType`. */
  poolType: number;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  feeBps: number;
  isActive: boolean;
  hasOtTreasury: boolean;
  /** USDC-denominated TVL. null if neither side priceable. */
  tvlUsdc: number | null;
  /**
   * UI hint about TVL precision:
   *   - `'exact'`        — both sides have a known USDC price.
   *   - `'mirrored'`     — only one side is priced; the other side is
   *     valued via the constant-product equilibrium heuristic
   *     (`priced_side_usdc * 2`). Less reliable for skewed pools.
   *   - `'unpriceable'`  — neither side has a price.
   */
  tvlSource: 'exact' | 'mirrored' | 'unpriceable';
  /** Raw parsed PoolState — kept for downstream depth/quote callers. */
  rawPool: PoolState;
}

export interface DepthSlice {
  /** Input amount in base units of the side being sold. */
  amountIn: bigint;
  /** Output amount in base units of the side being bought. */
  amountOut: bigint;
  /** Signed price impact in bps, sign-preserving (positive = worse than spot). */
  priceImpactBps: number;
  /** Bucket fraction of the input-side reserve this slice represents (0-1). */
  pctOfReserve: number;
}

export interface DepthResult {
  /** B → A direction (selling token B, receiving token A). */
  bidSide: DepthSlice[];
  /** A → B direction (selling token A, receiving token B). */
  askSide: DepthSlice[];
}

export interface MarketsSnapshot {
  tokens: TokenRow[];
  pools: PoolRow[];
  /**
   * RwtVault state when `includeNav: true` AND the read succeeds; null
   * otherwise.
   *
   * Field semantics — important because two of these read like USDC totals
   * but only one is:
   *   * `navBookValue`        — NAV per RWT (USDC base units, 6 decimals).
   *                             $1.00 at launch; drifts as protocol revenue
   *                             flows into the vault.
   *   * `totalRwtSupply`      — RWT in circulation (RWT base units).
   *   * `totalInvestedCapital`— Cumulative USDC ever deposited into the
   *                             vault. THIS is the right field for
   *                             "USDC backing the vault" displays — multi-
   *                             plying `navBookValue × totalRwtSupply` is
   *                             not, because `navBookValue` is per-token,
   *                             not total.
   */
  rwtVault: {
    navBookValue: bigint;
    totalRwtSupply: bigint;
    totalInvestedCapital: bigint;
  } | null;
  /** ms since epoch — when the snapshot was assembled. */
  fetchedAt: number;
  /** slot taken AFTER all reads — see comment in `snapshot.ts`. */
  slot: number;
}

/** Result of enumerating one PoolState PDA on-chain. */
export interface EnumeratedPool {
  poolAddress: PublicKey;
  pool: PoolState;
}
