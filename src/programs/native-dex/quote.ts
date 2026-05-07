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
// Output discriminated union:
//   - `{ ok: true, quote }`        — quote is buildable, see QuoteResult
//   - `{ ok: false, error: ... }`  — same error tags the on-chain code
//                                    would raise (DexPaused, PoolNotActive,
//                                    EmptyReserves, ZeroAmount, ZeroOutput,
//                                    MathOverflow). UI surfaces the tag
//                                    directly without thumbing through
//                                    DexError variants.

import type { PublicKey } from '@solana/web3.js';

import type { DexConfig, PoolState } from './accounts.generated.js';

// ─────────────────────────────── constants ────────────────────────────────

/** `BPS_DENOMINATOR` from `contracts/native-dex/src/constants.rs`. */
const BPS_DENOMINATOR = 10_000n;

/** `OT_TREASURY_FEE_BPS` from `contracts/native-dex/src/constants.rs`. */
const OT_TREASURY_FEE_BPS = 50n;

/** Mirror of `POOL_TYPE_STANDARD` (== 0) — quote only supports this branch. */
const POOL_TYPE_STANDARD = 0;

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
  | 'MathOverflow';

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

export interface QuoteResult {
  /** Net tokens the user receives in `userTokenOut`, after slippage exposure. */
  amountOut: bigint;
  /**
   * Net input that actually enters the constant-product curve. For RWT-input
   * swaps this equals `amountIn - feeTotal - feeOtTreasury`; for RWT-output
   * swaps `netInput == amountIn` (fees come off the gross output).
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
   * RWT mint per cluster — `RWT_MINTS[cluster]` from
   * `src/network/constants.ts`. Callers pass it explicitly so the SDK does
   * not have to assume a cluster context, and so the eventual mainnet
   * deploy (when the placeholder is replaced) does not need a quote rebuild.
   */
  rwtMint: PublicKey;
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
  const { pool, config, amountIn, aToB, rwtMint } = args;

  // Mirror swap_internal preflight order.
  if (!config.isActive) return err('PoolPaused');
  if (!pool.isActive) return err('PoolNotActive');
  if (amountIn === 0n) return err('ZeroAmount');

  // Concentrated pools require a BinArray walk — refuse politely with
  // the same UI-visible error the contract uses for "no liquidity here".
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
    // Selling RWT: fee comes off the input BEFORE the curve.
    const f = calculateFees(amountIn, feeBps, lpFeeShareBps, hasOtTreasury);
    if (!f) return err('MathOverflow');
    fees = f;
    const totalDeducted = fees.feeTotal + fees.feeOtTreasury;
    if (totalDeducted > amountIn) return err('MathOverflow');
    netInput = amountIn - totalDeducted;
    const out = constantProductOutput(reserveIn, reserveOut, netInput);
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
    reserveInAfter = reserveIn + netInput;
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

  return {
    ok: true,
    quote: {
      amountOut,
      netInput,
      fees,
      priceImpactBps,
      reserveInBefore: reserveIn,
      reserveOutBefore: reserveOut,
      reserveInAfter,
      reserveOutAfter,
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
