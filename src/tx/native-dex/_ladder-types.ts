// Monotonic Ladder math helpers — pure off-chain mirror of
// `contracts/native-dex/src/concentrated.rs` and the Arlex
// `arlex_lang::math::pow_bps` primitive.
//
// Exposed for two consumers:
//   1. The `grow_liquidity` / `compress_liquidity` SDK builders use them
//      indirectly (account validation only — args are pre-computed by the
//      Rebalancer bot off-chain).
//   2. `markets/quote.ts` uses `priceAtBin` + `navToBin` to decide whether
//      a master-pool USDC→RWT swap will route to `rwt_engine::mint_rwt`
//      (best-ask price vs `NAV × (1 + MINT_ROUTE_PRICE_OFFSET_BPS / 10_000)`).
//
// Keep this file pure (no PublicKey, no @solana/web3.js imports). It is
// imported by both tx-builders and the markets layer; cross-contamination
// would force every consumer to drag in the heavier solana surface.

/** Mirror of `BPS_DENOMINATOR` from `contracts/native-dex/src/constants.rs`. */
export const BPS_DENOMINATOR: bigint = 10_000n;

/** Mirror of `CONCENTRATED_SCALE` (= 1e12) — Q-fixed-point scale for `pow_bps`. */
export const CONCENTRATED_SCALE: bigint = 1_000_000_000_000n;

/**
 * Mirror of `MAX_BINS` (= 1000) — CP-1 Monotonic Ladder rewrite.
 * The 16 KB `BinArray` account fits comfortably inside the 10 MB Solana
 * account ceiling and costs ~0.11 SOL of rent per master pool.
 */
export const MAX_BINS = 1000;

/**
 * Mirror of `ACTIVE_ZONE_WIDTH` (= 40) — geometric-density active bid wall
 * sits in `[active_bin_id − ACTIVE_ZONE_WIDTH + 1, active_bin_id]`.
 */
export const ACTIVE_ZONE_WIDTH = 40;

/**
 * Mirror of `MINT_ROUTE_PRICE_OFFSET_BPS` (= 50, == 0.5%). When the best
 * on-book ask price exceeds `NAV × (1 + MINT_ROUTE_PRICE_OFFSET_BPS /
 * BPS_DENOMINATOR)`, the swap routes to `rwt_engine::mint_rwt` instead of
 * consuming organic ask. See contract source §swap.rs CP-6 gate.
 */
export const MINT_ROUTE_PRICE_OFFSET_BPS: bigint = 50n;

/**
 * Mirror of `MIN_PERMANENT_TAIL_OFFSET_BPS` (= 30). Re-exposed so callers
 * constructing `permanent_tail_offset_bps` for `create_concentrated_pool`
 * can boundary-check before submitting the tx (the contract reverts with
 * `InvalidPermanentTailOffset` below this floor).
 */
export const MIN_PERMANENT_TAIL_OFFSET_BPS = 30;

/**
 * Mirror of `PERMANENT_TAIL_BIN_COUNT` (= 70). The number of bins below
 * `left_anchor_bin` that hold permanent-tail USDC, frozen for the lifetime
 * of the pool.
 */
export const PERMANENT_TAIL_BIN_COUNT = 70;

// ───────────────────────────── pow_bps mirror ─────────────────────────────

/**
 * Mirror of `arlex_lang::math::pow_bps(bps, exp)` — `(1 + bps / 10_000)^exp`
 * in Q-fixed-point (`SCALE = 1e12`). Round-DOWN semantics.
 *
 * Returns `null` for:
 *   - `bps >= 10_000` (100% step is rejected by the on-chain helper)
 *   - `exp == i32::MIN` (would overflow `-exp`)
 *   - overflow during repeated squaring
 *
 * Matches the on-chain helper byte-for-byte using `bigint` arithmetic
 * (Rust `u128` is unbounded under `bigint`, so the overflow surface is
 * narrower here — we still mirror the explicit `bps >= 10_000` check).
 */
export function powBps(bps: number, exp: number): bigint | null {
  if (!Number.isInteger(bps) || bps < 0 || bps >= 10_000) return null;
  if (!Number.isInteger(exp)) return null;
  if (exp === 0) return CONCENTRATED_SCALE;
  if (exp === -(2 ** 31)) return null; // i32::MIN guard mirror

  const bpsBig = BigInt(bps);
  const base = CONCENTRATED_SCALE + (bpsBig * CONCENTRATED_SCALE) / BPS_DENOMINATOR;

  if (exp > 0) {
    return powFixed(base, exp);
  }
  const forward = powFixed(base, -exp);
  if (forward === null || forward === 0n) return null;
  return (CONCENTRATED_SCALE * CONCENTRATED_SCALE) / forward;
}

function powFixed(base: bigint, exp: number): bigint | null {
  let result = CONCENTRATED_SCALE;
  let b = base;
  let e = exp;
  while (e > 0) {
    if ((e & 1) === 1) {
      result = (result * b) / CONCENTRATED_SCALE;
    }
    e >>>= 1;
    if (e > 0) {
      b = (b * b) / CONCENTRATED_SCALE;
    }
  }
  return result;
}

/**
 * Mirror of `concentrated::price_at_bin(bin_step_bps, bin)` — Q-fixed-point
 * price at the given bin index, scaled by `CONCENTRATED_SCALE`. Returns
 * `null` on overflow / invalid step.
 *
 * Use to compute "best ask price" at `pool.active_bin_id + 1`; the mint-
 * route gate in `quote.ts` compares this against `NAV` scaled into the
 * same Q-fixed-point unit.
 */
export function priceAtBin(binStepBps: number, bin: number): bigint | null {
  if (!Number.isInteger(binStepBps) || binStepBps <= 0 || binStepBps > 0xffff) {
    return null;
  }
  if (!Number.isInteger(bin)) return null;
  return powBps(binStepBps, bin);
}

/**
 * Approximate inverse of `priceAtBin` — given a NAV in USDC 6-decimal
 * scale, find the bin id whose `priceAtBin` is closest to NAV.
 *
 * This is the off-chain Rebalancer's `new_nav_bin` computation per
 * `docs/contracts/native-dex.mdx` §383-388:
 *   `new_nav_bin = floor(log(nav) / log(1 + bin_step_bps / 10_000))`.
 *
 * The on-chain contract does NOT re-derive this (the architect chose to
 * trust the Rebalancer signer rather than implement a log over Q64.64) —
 * grow/compress redistribute helpers only validate direction + tail-overlap
 * + right-edge buffer. So this helper exists for the off-chain caller
 * only; the contract never calls it.
 *
 * Implementation: monotonic binary search over `priceAtBin(stepBps, bin)`
 * against the target NAV scaled into the same Q-fixed-point. Range capped
 * at ±MAX_BINS for safety (a Monotonic Ladder spans at most MAX_BINS
 * bins; NAVs far outside that range are off-pool and the caller should
 * widen the pool's bin_step_bps instead).
 *
 * Returns `null` if:
 *   - `nav == 0` (mathematically undefined — log(0))
 *   - `binStepBps` is out of range
 *   - the search hits a `priceAtBin` overflow
 */
export function navToBin(
  nav: bigint,
  binStepBps: number,
  navScale: bigint = 1_000_000n,
): number | null {
  if (nav <= 0n) return null;
  if (!Number.isInteger(binStepBps) || binStepBps <= 0 || binStepBps >= 10_000) {
    return null;
  }

  // Convert NAV (navScale units) → CONCENTRATED_SCALE units.
  const navQ = (nav * CONCENTRATED_SCALE) / navScale;

  // Binary search for the largest bin whose price <= navQ. The Monotonic
  // Ladder spans at most MAX_BINS bins around the initial NAV, but a
  // standalone helper has no notion of "initial NAV", so we search
  // [-MAX_BINS, MAX_BINS] — sufficient for any reasonable NAV value.
  let lo = -MAX_BINS;
  let hi = MAX_BINS;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const p = priceAtBin(binStepBps, mid);
    if (p === null) return null;
    if (p <= navQ) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * True iff a master-pool USDC → RWT swap would route to
 * `rwt_engine::mint_rwt` instead of consuming organic ask. Pure mirror of
 * `should_route_to_mint` in `contracts/native-dex/src/instructions/swap.rs`.
 *
 * Inputs:
 *   - `hasOrganicAsk`: caller queries `BinArray` for any non-zero
 *     `liquidity_a` above `pool.active_bin_id`. When false → always route.
 *   - `nav`: `RwtVault.nav_book_value` in NAV-scale units (default 1e6).
 *   - `bestAskPriceQ`: `priceAtBin(pool.bin_step_bps, pool.active_bin_id + 1)`
 *     in CONCENTRATED_SCALE units.
 *
 * Threshold math uses `bigint` to avoid overflow on `nav × (10_000 + offset_bps)`
 * for any plausible NAV. Strict `>` matches the docs phrasing ("price >
 * NAV × 1.005") so price exactly at threshold uses the bin-walk path.
 */
export function shouldRouteToMint(
  hasOrganicAsk: boolean,
  nav: bigint,
  bestAskPriceQ: bigint,
  navScale: bigint = 1_000_000n,
): boolean {
  if (!hasOrganicAsk) return true;
  // Convert NAV to CONCENTRATED_SCALE units. NAV is typically 6-decimal (USDC),
  // CONCENTRATED_SCALE is 12-decimal, so we multiply by 1e6.
  const navQ = (nav * CONCENTRATED_SCALE) / navScale;
  const thresholdQ =
    (navQ * (BPS_DENOMINATOR + MINT_ROUTE_PRICE_OFFSET_BPS)) / BPS_DENOMINATOR;
  return bestAskPriceQ > thresholdQ;
}
