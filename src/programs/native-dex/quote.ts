// Pure off-chain quote helper for `native-dex::swap`.
//
// This file mirrors `contracts/native-dex/src/amm.rs` and
// `instructions/swap.rs::swap_internal`. Update both atomically — every
// change to the on-chain math (fee split rounding, dust floor, OT treasury
// percentage, constant-product rounding) MUST be reflected here in the
// same PR, otherwise SDK consumers will price-quote incorrectly and
// `min_amount_out` slippage guards will trip on real swaps.
//
// Scope:
//   - StandardCurve pools only. Concentrated pools (`pool_type == 1`)
//     require a bin-walk simulation that needs the live BinArray account
//     and is not feasible without an RPC fetch — callers wanting a
//     concentrated quote should `simulate` the on-chain ix instead.
//   - StandardCurve still covers every Areal pool today (Layer 9 wired
//     the Nexus exclusively to standard pools), so this is the path that
//     unblocks the Phase-8 user swap UI.
//
// Fee mechanics (post-Layer-9 D29 fee-on-top compliance):
//   - sell-RWT (inputIsRwt): full amountIn enters the curve; user_total_debit =
//     amountIn + fee_total + fee_ot_treasury. Mirrors contract swap_internal
//     sell-RWT branch (swap.rs:205-244).
//   - buy-RWT: amount_in enters the curve; fees deducted from gross output.
//     `userTotalDebit == amountIn`.
//   - `userTotalDebit` is exposed on QuoteResult for UI balance preflight.
//
// Output discriminated union:
//   - `{ ok: true, quote }`        — quote is buildable, see QuoteResult
//   - `{ ok: false, error: ... }`  — same error tags the on-chain code
//                                    would raise (DexPaused, PoolNotActive,
//                                    EmptyReserves, ZeroAmount, ZeroOutput,
//                                    MathOverflow). UI surfaces the tag
//                                    directly without thumbing through
//                                    DexError variants.

import type { PublicKey } from '@solana/web3.js';

import type { ClusterName } from '../../network/clusters.js';
import { isPlaceholderRwtMint } from '../../network/constants.js';
import {
  BPS_DENOMINATOR as LADDER_BPS_DENOMINATOR,
  CONCENTRATED_SCALE,
  MINT_ROUTE_PRICE_OFFSET_BPS,
  priceAtBin,
  shouldRouteToMint,
} from '../../tx/native-dex/_ladder-types.js';
import type { DexConfig, PoolState } from './accounts.generated.js';

// ─────────────────────────────── constants ────────────────────────────────

/** `BPS_DENOMINATOR` from `contracts/native-dex/src/constants.rs`. */
const BPS_DENOMINATOR = 10_000n;

/** `OT_TREASURY_FEE_BPS` from `contracts/native-dex/src/constants.rs`. */
const OT_TREASURY_FEE_BPS = 50n;

/** Mirror of `POOL_TYPE_STANDARD` (== 0) — quote only supports this branch. */
const POOL_TYPE_STANDARD = 0;

/** Mirror of `POOL_TYPE_CONCENTRATED` (== 1) — master pool branch. */
const POOL_TYPE_CONCENTRATED = 1;

/**
 * CP-6 — RWT mint fee. The `rwt_engine::mint_rwt` ix charges 1% of the
 * USDC input: 0.5% accrues into vault NAV, 0.5% routes to the Areal DAO.
 * From the user's perspective the effective price is `NAV × 1.01`.
 *
 * Mirror of `MINT_FEE_BPS` in `contracts/rwt-engine/src/constants.rs`
 * (= 100 bps). Kept as a `bigint` to keep the quote math consistent with
 * the other bps constants.
 */
const MINT_FEE_BPS: bigint = 100n;

// ──────────────────────────────── types ───────────────────────────────────

/**
 * Mirrors the on-chain `DexError` variants the swap path can raise. Quote
 * uses the same names so UI code can switch on the tag without juggling
 * a separate error enum.
 *
 * `EmptyReserves` is also returned when the pool is concentrated (we
 * cannot price without a BinArray fetch, but the UI-visible failure mode
 * is identical to "pool has no liquidity here").
 */
export type QuoteError =
  | 'EmptyReserves'
  | 'ZeroAmount'
  | 'ZeroOutput'
  | 'PoolNotActive'
  | 'PoolPaused'
  | 'MathOverflow'
  | 'MainnetNotDeployed';

export interface QuoteFees {
  /** Total fee taken from the RWT side (input or output, depending on direction). */
  feeTotal: bigint;
  /** LP-side share of the fee. */
  feeLp: bigint;
  /** Protocol-side share of the fee (gets the rounding remainder). */
  feeProtocol: bigint;
  /** Additional OT-treasury fee in lamports (0 unless `pool.has_ot_treasury`). */
  feeOtTreasury: bigint;
}

/**
 * CP-6 — discriminator for which on-chain path the swap will take.
 *
 * - `binWalk` — consume organic ask via `concentrated::bin_walk_swap` (or
 *   the StandardCurve constant-product curve). DEX fees apply.
 * - `mintRoute` — reroute through `rwt_engine::mint_rwt` (master pool
 *   USDC → RWT only). NO DEX fee charged — the 1% mint fee inside
 *   `rwt_engine::mint_rwt` (0.5% NAV accrual + 0.5% DAO) replaces it.
 */
export type QuoteRoute = 'binWalk' | 'mintRoute';

export interface QuoteResult {
  /**
   * CP-6 — which on-chain branch will execute. `binWalk` for every swap
   * that does NOT reroute through `rwt_engine::mint_rwt`; `mintRoute`
   * only for master-pool USDC → RWT when the on-chain gate fires (no
   * organic ask, or best ask > NAV × 1.005). See
   * [[_ladder-types#shouldRouteToMint]] for the predicate.
   */
  route: QuoteRoute;
  /** Net tokens the user receives in `userTokenOut`, after slippage exposure. */
  amountOut: bigint;
  /**
   * Net input that actually enters the constant-product curve. Post
   * fee-on-top compliance (D29) this equals `amountIn` for BOTH branches —
   * the sell-RWT path no longer deducts fees from `amountIn` before the
   * curve, and the buy-RWT path was already pumping `amountIn` directly
   * into the curve.
   */
  netInput: bigint;
  /** Fee breakdown matching the on-chain accounting. */
  fees: QuoteFees;
  /**
   * Signed price impact in bps relative to the spot price
   * `reserve_out / reserve_in`. Positive = user gets a worse rate than
   * spot (the normal case); negative would imply the swap moved price in
   * the user's favour (only possible with truncation noise on dust trades).
   * Capped at +/- 100% (10_000 bps) to keep the UI from rendering NaN.
   */
  priceImpactBps: number;
  /** Reserves seen on input by `swap_internal`. */
  reserveInBefore: bigint;
  /** Reserves seen on output by `swap_internal`. */
  reserveOutBefore: bigint;
  /** Reserves the pool would hold post-swap (excluding off-reserve fee_lp accumulator). */
  reserveInAfter: bigint;
  /** Reserves the pool would hold post-swap. */
  reserveOutAfter: bigint;
  /**
   * Total tokens debited from the user's `userTokenIn` ATA. For RWT-input
   * swaps (`inputIsRwt == true`) this is `amountIn + fees.feeTotal +
   * fees.feeOtTreasury` (fees on top per docs §Fee Architecture). For
   * buy-RWT swaps it equals `amountIn` (fees come off the gross output).
   * Use this for balance preflight checks in UI.
   */
  userTotalDebit: bigint;
}

/**
 * CP-6 — caller-supplied off-chain context for master-pool USDC → RWT
 * quoting. When provided AND the pool is a Monotonic Ladder master pool
 * AND the direction is USDC → RWT, the quote engine evaluates the on-chain
 * mint-route gate (organic ask presence + best-ask price vs NAV threshold)
 * and returns `route: 'mintRoute'` with a NAV-based output when the gate
 * would fire.
 *
 * `nav` must be read from `rwt_vault.nav_book_value` (6-decimal USDC scale
 * matching `NAV_SCALE = 1_000_000`). `hasOrganicAsk` is the boolean output
 * of scanning the pool's `BinArray` for any non-zero `liquidity_a` above
 * `pool.active_bin_id`.
 *
 * Both fields are caller-supplied to keep the quote engine pure — fetching
 * NAV requires an RPC call into the RWT Engine, and scanning the BinArray
 * requires another RPC call against the pool's bin-array PDA. The caller
 * is the one that already owns those accounts in the markets snapshot.
 *
 * Omit this field entirely on StandardCurve pools, RWT → USDC swaps, or
 * when the caller does not yet have NAV / bin-array data — the quote
 * engine falls back to the bin-walk path and returns `route: 'binWalk'`.
 *
 * `rwtDecimals` defaults to 6 (matches the on-chain RWT mint decimals,
 * which mirror USDC). Exposed for forward-compat if the mint ever moves.
 */
export interface MasterPoolQuoteContext {
  /** `RwtVault.nav_book_value` in 6-decimal USDC scale. */
  nav: bigint;
  /**
   * True iff the pool's `BinArray` has any non-zero `liquidity_a` above
   * `pool.active_bin_id`. Used to short-circuit the gate (no organic
   * ask → always route to mint).
   */
  hasOrganicAsk: boolean;
  /** RWT mint decimals (default 6). */
  rwtDecimals?: number;
  /** NAV-scale denominator (default 1_000_000, i.e. 6-decimal USDC). */
  navScale?: bigint;
}

export interface QuoteSwapArgs {
  /** Parsed `PoolState` (use `parsePoolState`). */
  pool: PoolState;
  /** Parsed `DexConfig` (use `parseDexConfig`). */
  config: DexConfig;
  /** User's intended `amount_in`. */
  amountIn: bigint;
  /** Direction flag — `true` = swap `token_a` → `token_b`. */
  aToB: boolean;
  /**
   * CP-6 — caller-supplied master-pool context. When set AND the pool is
   * a Monotonic Ladder master pool AND the direction is USDC → RWT, the
   * engine may return `route: 'mintRoute'`. See [[MasterPoolQuoteContext]].
   */
  masterPoolContext?: MasterPoolQuoteContext;
  /**
   * RWT mint per cluster — `RWT_MINTS[cluster]` from
   * `src/network/constants.ts`. Callers pass it explicitly so the SDK does
   * not have to assume a cluster context, and so the eventual mainnet
   * deploy (when the placeholder is replaced) does not need a quote rebuild.
   */
  rwtMint: PublicKey;
  /**
   * Optional safety check — when set to `'mainnet'` and `rwtMint` is the R20
   * placeholder, `quoteSwap` returns `{ ok: false, error: 'MainnetNotDeployed' }`
   * without proceeding. Mirrors the invariant enforced by `buildSwapTx` so
   * callers cannot mis-detect `inputIsRwt` against the placeholder mint.
   * Devnet/localnet (or omitting the field) preserves the prior behaviour —
   * the placeholder IS the expected mint there.
   */
  cluster?: ClusterName;
}

export type QuoteOutcome =
  | { ok: true; quote: QuoteResult }
  | { ok: false; error: QuoteError };

// ─────────────────────────────── public API ───────────────────────────────

/**
 * Pure off-chain quote for `native-dex::swap` (StandardCurve pools).
 *
 * Returns `{ ok: false, error }` for every condition `swap_internal`
 * would reject the tx for (paused, inactive, zero amount, empty reserves,
 * arithmetic overflow, dust trade where fees eat the entire output).
 *
 * Returns `{ ok: true, quote }` with the post-swap reserves and a fee
 * breakdown that matches `calculate_fees` byte-for-byte (including the
 * 1-lamport dust floor and the protocol-takes-remainder rounding).
 */
export function quoteSwap(args: QuoteSwapArgs): QuoteOutcome {
  const { pool, config, amountIn, aToB, rwtMint, cluster, masterPoolContext } = args;

  // Mainnet safety: refuse to quote against the R20 placeholder. Without
  // this guard a caller passing the placeholder mint on mainnet would
  // silently mis-detect `inputIsRwt` (both pool sides could equal the
  // placeholder) and return a quote a real `buildSwapTx` would refuse.
  // Mirrors the invariant in `tx/native-dex/swap.ts::buildSwapTx`.
  if (cluster === 'mainnet' && isPlaceholderRwtMint(rwtMint)) {
    return err('MainnetNotDeployed');
  }

  // Mirror swap_internal preflight order.
  if (!config.isActive) return err('PoolPaused');
  if (!pool.isActive) return err('PoolNotActive');
  if (amountIn === 0n) return err('ZeroAmount');
  // Defense-in-depth (SDK-W1): reject `amountIn > u64::MAX` at the parameter
  // boundary so callers see `MathOverflow` before any math runs. Downstream
  // `calculateFees` and the sell-RWT overflow guard also catch this, but
  // a u64 ceiling on a u64-typed contract argument belongs up front.
  {
    const u64Max = (1n << 64n) - 1n;
    if (amountIn > u64Max) return err('MathOverflow');
  }

  // CP-6 — Master-pool USDC → RWT mint-route quote. When the pool is a
  // Monotonic Ladder master pool AND the caller supplied a
  // masterPoolContext AND the direction is USDC → RWT, evaluate the
  // on-chain gate predicate (`shouldRouteToMint`). If it fires, return
  // a NAV-based quote with `route: 'mintRoute'` and the 1% mint fee
  // baked in via `NAV × 1.01`.
  //
  // For non-master concentrated pools (or master pools without context),
  // continue the legacy refuse path below.
  if (pool.poolType === POOL_TYPE_CONCENTRATED) {
    if (masterPoolContext !== undefined) {
      const rwtBytes = rwtMint.toBytes();
      const inputIsRwt = aToB
        ? bytesEqual(pool.tokenAMint.toBytes(), rwtBytes)
        : bytesEqual(pool.tokenBMint.toBytes(), rwtBytes);
      // Mint-route only applies to USDC → RWT direction. RWT → USDC
      // always uses bin-walk (and the SDK currently can't simulate bin-
      // walk off-chain, so we still refuse below).
      if (!inputIsRwt) {
        const bestAskPriceQ = priceAtBin(
          pool.binStepBps,
          pool.activeBinId + 1,
        );
        if (bestAskPriceQ === null) return err('MathOverflow');

        const navScale = masterPoolContext.navScale ?? 1_000_000n;
        const routed = shouldRouteToMint(
          masterPoolContext.hasOrganicAsk,
          masterPoolContext.nav,
          bestAskPriceQ,
          navScale,
        );

        if (routed) {
          return buildMintRouteQuote({
            amountIn,
            nav: masterPoolContext.nav,
            navScale,
            rwtDecimals: masterPoolContext.rwtDecimals ?? 6,
            bestAskPriceQ,
          });
        }
        // Bin-walk path on a master pool — quote engine cannot simulate
        // the on-chain bin walk without the BinArray. Refuse with the
        // same UI-visible error as below; this is also the legacy
        // behaviour for non-master concentrated pools.
      }
    }
    // Concentrated pools require a BinArray walk — refuse politely with
    // the same UI-visible error the contract uses for "no liquidity here".
    return err('EmptyReserves');
  }
  if (pool.poolType !== POOL_TYPE_STANDARD) return err('EmptyReserves');

  // StandardCurve precondition.
  if (pool.reserveA === 0n || pool.reserveB === 0n) return err('EmptyReserves');

  const rwtBytes = rwtMint.toBytes();
  const inputIsRwt = aToB
    ? bytesEqual(pool.tokenAMint.toBytes(), rwtBytes)
    : bytesEqual(pool.tokenBMint.toBytes(), rwtBytes);

  const reserveIn = aToB ? pool.reserveA : pool.reserveB;
  const reserveOut = aToB ? pool.reserveB : pool.reserveA;

  const feeBps = BigInt(pool.feeBps);
  const lpFeeShareBps = BigInt(config.lpFeeShareBps);
  const hasOtTreasury = pool.hasOtTreasury;

  let amountOut: bigint;
  let netInput: bigint;
  let fees: QuoteFees;

  if (inputIsRwt) {
    // Selling RWT: fee-on-top — the full `amountIn` enters the curve,
    // and the user pays `amountIn + feeTotal + feeOtTreasury` from
    // their `userTokenIn` ATA. Mirrors contract swap.rs:205-244
    // (docs §Fee Architecture Step 3).
    const f = calculateFees(amountIn, feeBps, lpFeeShareBps, hasOtTreasury);
    if (!f) return err('MathOverflow');
    fees = f;
    netInput = amountIn; // Full amountIn into curve (docs §Fee Architecture Step 3)
    // Overflow guard mirrors contract checked_add chain.
    const u64Max = (1n << 64n) - 1n;
    if (amountIn + fees.feeTotal + fees.feeOtTreasury > u64Max) return err('MathOverflow');
    const out = constantProductOutput(reserveIn, reserveOut, amountIn);
    if (out === null) return err('MathOverflow');
    amountOut = out;
  } else {
    // Buying RWT: fee comes off the gross output AFTER the curve.
    netInput = amountIn;
    const grossOut = constantProductOutput(reserveIn, reserveOut, netInput);
    if (grossOut === null) return err('MathOverflow');
    const f = calculateFees(grossOut, feeBps, lpFeeShareBps, hasOtTreasury);
    if (!f) return err('MathOverflow');
    fees = f;
    const totalDeducted = fees.feeTotal + fees.feeOtTreasury;
    if (totalDeducted > grossOut) {
      // Dust trade: fees ate the entire output. Mirrors the contract's
      // ZeroOutput slippage check below.
      return err('ZeroOutput');
    }
    amountOut = grossOut - totalDeducted;
  }

  // Mirrors the post-fee `if amount_out == 0` slippage check.
  if (amountOut === 0n) return err('ZeroOutput');

  // Reserves after — mirror the on-chain effects step. The off-reserve
  // fee_lp accumulator is documented in `swap.rs` and is excluded from
  // these post-reserves on the RWT-output branch.
  const u64Max = (1n << 64n) - 1n;
  let reserveInAfter: bigint;
  let reserveOutAfter: bigint;
  if (inputIsRwt) {
    // Fee-on-top: full amountIn enters the reserve (was reserveIn + netInput,
    // equivalent now that netInput === amountIn, but spelled out explicitly).
    reserveInAfter = reserveIn + amountIn;
    reserveOutAfter = reserveOut - amountOut;
  } else {
    reserveInAfter = reserveIn + netInput;
    reserveOutAfter =
      reserveOut - amountOut - fees.feeProtocol - fees.feeOtTreasury - fees.feeLp;
  }
  if (
    reserveInAfter < 0n ||
    reserveOutAfter < 0n ||
    reserveInAfter > u64Max ||
    reserveOutAfter > u64Max
  ) {
    return err('MathOverflow');
  }

  // Price impact: compare effective rate (out/in) against spot (reserveOut/reserveIn).
  // Formula: priceImpactBps = (1 - effective/spot) * 10000
  //                        = (1 - (out * reserveIn) / (in * reserveOut)) * 10000
  // Done in bigint with one final scale-down for sign-preserving precision.
  // Positive = user worse than spot; clamped to ±10_000 to keep UI sane.
  const priceImpactBps = computePriceImpactBps(
    amountIn,
    amountOut,
    reserveIn,
    reserveOut,
  );

  const userTotalDebit = inputIsRwt
    ? amountIn + fees.feeTotal + fees.feeOtTreasury
    : amountIn;

  return {
    ok: true,
    quote: {
      route: 'binWalk',
      amountOut,
      netInput,
      fees,
      priceImpactBps,
      reserveInBefore: reserveIn,
      reserveOutBefore: reserveOut,
      reserveInAfter,
      reserveOutAfter,
      userTotalDebit,
    },
  };
}

// ──────────────────────── master-pool mint route ──────────────────────────

interface MintRouteQuoteArgs {
  amountIn: bigint;
  nav: bigint;
  navScale: bigint;
  rwtDecimals: number;
  bestAskPriceQ: bigint;
}

/**
 * CP-6 — build a `route: 'mintRoute'` quote for master-pool USDC → RWT.
 *
 * Formula mirrors `rwt_engine::mint_rwt` per
 * `docs/contracts/rwt-engine.mdx` §Mint mechanics:
 *
 *   effective_price = NAV × (1 + MINT_FEE_BPS / BPS_DENOMINATOR)
 *                   = NAV × 1.01   (NAV in USDC scale)
 *   rwt_out         = amount_in_usdc × 10^rwt_decimals / effective_price
 *
 * The 1% mint fee splits 0.5%/0.5% between NAV accrual and the Areal DAO
 * inside `mint_rwt`; the user-visible price is `NAV × 1.01`.
 *
 * The DEX fee (LP + protocol + OT-treasury) is ZERO on the mint-route
 * branch — that's the entire point of routing through mint instead of
 * consuming organic ask. `userTotalDebit` equals `amountIn` exactly.
 *
 * `priceImpactBps` here represents the mint-route premium against NAV
 * (always `MINT_ROUTE_PRICE_OFFSET_BPS = 50` bps when above the gate
 * threshold, capped at the on-chain `MINT_FEE_BPS = 100` for the actual
 * payout calculation). Surfaced so UI components can distinguish a
 * mint-route quote's premium from a bin-walk's slippage.
 */
function buildMintRouteQuote(args: MintRouteQuoteArgs): QuoteOutcome {
  const { amountIn, nav, navScale, rwtDecimals, bestAskPriceQ } = args;

  // `bestAskPriceQ` and the imported constants below are captured by the
  // gate decision upstream; keeping them referenced in scope so a future
  // formula tweak (e.g. blended on-book/NAV quote) does not need a
  // signature change. `void` keeps TS strict unused-var lint quiet.
  void bestAskPriceQ;
  void CONCENTRATED_SCALE;
  void MINT_ROUTE_PRICE_OFFSET_BPS;
  void navScale; // referenced via destructure but only future formulas use it

  if (nav <= 0n) return err('EmptyReserves');

  // effective_price (NAV scale) = NAV × (10_000 + MINT_FEE_BPS) / 10_000
  const effectivePriceNavScale =
    (nav * (LADDER_BPS_DENOMINATOR + MINT_FEE_BPS)) / LADDER_BPS_DENOMINATOR;
  if (effectivePriceNavScale === 0n) return err('MathOverflow');

  // amount_out (RWT, 10^rwt_decimals scale) =
  //   amount_in × 10^rwt_decimals / effective_price   (in matching scales)
  // amount_in is USDC-scale (navScale); RWT is rwt_decimals-scale.
  // Both sides cancel `navScale` when effective_price is in navScale, so:
  //   amount_out = (amount_in × 10^rwt_decimals) / effective_price_navScale
  // Off-by-one note: navScale and 10^rwt_decimals are BOTH 1_000_000 today
  // (USDC 6 decimals, RWT 6 decimals), so the division reduces to
  // `amount_in × 1_000_000 / (NAV × 1.01)`. Future RWT mints with
  // different decimals are covered by `rwtDecimals`.
  const rwtScale = 10n ** BigInt(rwtDecimals);
  const amountOut = (amountIn * rwtScale) / effectivePriceNavScale;

  if (amountOut === 0n) return err('ZeroOutput');

  // Reserves are NOT updated on the mint-route branch — RWT is minted
  // fresh by rwt_engine::mint_rwt and USDC flows into the rwt_vault's
  // capital_accumulator, not into the pool's vault. Surface zeros for
  // the reserve_*_after fields so UI cannot mistakenly use them as
  // post-swap pool state.
  // priceImpactBps captures the "premium over NAV" the user pays vs spot.
  // We compare effective_price vs NAV: MINT_FEE_BPS = 100 bps premium.
  const priceImpactBps = Number(MINT_FEE_BPS);

  return {
    ok: true,
    quote: {
      route: 'mintRoute',
      amountOut,
      netInput: amountIn,
      fees: {
        feeTotal: 0n,
        feeLp: 0n,
        feeProtocol: 0n,
        feeOtTreasury: 0n,
      },
      priceImpactBps,
      reserveInBefore: 0n,
      reserveOutBefore: 0n,
      reserveInAfter: 0n,
      reserveOutAfter: 0n,
      userTotalDebit: amountIn,
    },
  };
}

/**
 * Apply slippage tolerance to an expected output amount. Returns the
 * `min_amount_out` value to pass to `buildSwapIx`.
 *
 * `slippageBps` must be in `[0, 5000]` (0% — 50%). Larger values would
 * almost always indicate a bug — the user would accept a halving of
 * their output silently.
 */
export function applySlippage(expectedOut: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5000) {
    throw new Error(
      `applySlippage: slippageBps must be an integer in [0, 5000] (got ${slippageBps})`,
    );
  }
  if (expectedOut < 0n) {
    throw new Error(`applySlippage: expectedOut must be >= 0 (got ${expectedOut})`);
  }
  return (expectedOut * (10_000n - BigInt(slippageBps))) / 10_000n;
}

/**
 * U128 variant of `applySlippage` for use against LP-share quotes
 * (`add_liquidity` / `zap_liquidity` `min_shares` is a u128, not u64).
 * Same arithmetic; no u64 boundary check because the result is allowed
 * to exceed u64::MAX. Slippage range is `[0, 10000]` here (0%—100%) to
 * match the contract's `min_shares` semantics — a caller that tolerates
 * any number of shares (including zero) passes `slippageBps == 10_000`.
 */
export function applySlippageU128(
  expectedShares: bigint,
  slippageBps: number,
): bigint {
  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps > 10_000
  ) {
    throw new Error(
      `applySlippageU128: slippageBps must be an integer in [0, 10000] (got ${slippageBps})`,
    );
  }
  if (expectedShares < 0n) {
    throw new Error(
      `applySlippageU128: expectedShares must be >= 0 (got ${expectedShares})`,
    );
  }
  return (expectedShares * (10_000n - BigInt(slippageBps))) / 10_000n;
}

// ───────────────────────── internal math helpers ──────────────────────────

/**
 * `(reserveOut * netInput) / (reserveIn + netInput)` — mirrors
 * `amm.rs::constant_product_output`. Returns `null` on overflow or when
 * either reserve is zero (the contract returns `EmptyReserves` in that
 * case; the caller maps the null appropriately).
 */
function constantProductOutput(
  reserveIn: bigint,
  reserveOut: bigint,
  netInput: bigint,
): bigint | null {
  if (reserveIn === 0n || reserveOut === 0n) return null;
  // Same widening as Rust (u128 internal). bigint is unbounded, but we
  // still bound by u64::MAX via the post-divide check.
  const numerator = reserveOut * netInput;
  const denominator = reserveIn + netInput;
  if (denominator === 0n) return null;
  const result = numerator / denominator;
  const u64Max = (1n << 64n) - 1n;
  if (result > u64Max) return null;
  return result;
}

/**
 * Mirrors `amm.rs::calculate_fees`. Returns `null` only if a value would
 * exceed u64::MAX (the on-chain code returns MathOverflow there); the
 * 1-lamport dust floor is applied identically.
 */
function calculateFees(
  amount: bigint,
  feeBps: bigint,
  lpFeeShareBps: bigint,
  hasOtTreasury: boolean,
): QuoteFees | null {
  const u64Max = (1n << 64n) - 1n;

  let feeTotal = (amount * feeBps) / BPS_DENOMINATOR;
  if (feeTotal === 0n && amount > 0n && feeBps > 0n) {
    // Dust floor: 1 lamport — prevents fee avoidance via swap splitting.
    feeTotal = 1n;
  }
  if (feeTotal > u64Max) return null;

  const feeLp = (feeTotal * lpFeeShareBps) / BPS_DENOMINATOR;
  if (feeLp > feeTotal) return null;
  // Remainder pattern: protocol absorbs dust.
  const feeProtocol = feeTotal - feeLp;

  let feeOtTreasury = 0n;
  if (hasOtTreasury) {
    feeOtTreasury = (amount * OT_TREASURY_FEE_BPS) / BPS_DENOMINATOR;
    if (feeOtTreasury > u64Max) return null;
  }

  return { feeTotal, feeLp, feeProtocol, feeOtTreasury };
}

/**
 * Sign-preserving price impact in bps.
 *
 *   effectiveRate = amountOut / amountIn
 *   spotRate      = reserveOut / reserveIn
 *   impact (bps)  = (1 - effectiveRate / spotRate) * 10000
 *                 = (1 - (amountOut * reserveIn) / (amountIn * reserveOut)) * 10000
 *
 * Computed as a single bigint expression to avoid float drift, then cast
 * to `number` once at the end. Clamped to ±10_000 so a degenerate quote
 * cannot spike the UI to ±Infinity.
 */
function computePriceImpactBps(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): number {
  if (amountIn === 0n || reserveOut === 0n) return 0;
  const effectiveScaled = (amountOut * reserveIn * 10_000n) / (amountIn * reserveOut);
  // 10_000 == 100% of spot. impact = 10_000 - effectiveScaled.
  let impact = 10_000n - effectiveScaled;
  if (impact > 10_000n) impact = 10_000n;
  if (impact < -10_000n) impact = -10_000n;
  return Number(impact);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function err(error: QuoteError): { ok: false; error: QuoteError } {
  return { ok: false, error };
}
