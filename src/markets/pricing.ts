// Pure pricing helpers for the markets reader.
//
// Three responsibilities:
//   1. `spotPriceA`         — convert a (reserveA, reserveB) pair into a
//      decimals-aware spot price of A in B units.
//   2. `chainPriceToUsdc`   — resolve a token's USDC-denominated price by
//      walking direct-USDC pools first, then falling back to a
//      `token → RWT → USDC` chain.
//   3. `poolTvlUsdc`        — combine per-side prices into a USDC TVL,
//      with a `'mirrored'` fallback for half-priced pools.
//
// All bigint math; the only Number coercion happens at the boundary where
// USD floats are returned to the UI. A single `1_000_000n` scale factor is
// used for spot-price precision (6 decimals — matches USDC granularity).

import type { PublicKey } from '@solana/web3.js';

import type { PoolState } from '../programs/native-dex/accounts.generated.js';
import type { ChainPriceResult } from './types.js';

/** Scale factor for `Number(...) / SCALE` precision. 6 dp → 1 USDC cent. */
const PRICE_SCALE = 1_000_000n;

/**
 * Spot price of token A in B units, accounting for decimals.
 *
 * Formula:
 *   priceA_in_B = (reserveB * 10^decimalsA) / (reserveA * 10^decimalsB)
 *
 * Both sides are scaled by `PRICE_SCALE` to keep 6dp precision through
 * the bigint divide; we cast to Number once at the end.
 *
 * Returns 0 when `reserveA === 0n` (the pool has no A side priced).
 */
export function spotPriceA(
  reserveA: bigint,
  decimalsA: number,
  reserveB: bigint,
  decimalsB: number,
): number {
  if (reserveA === 0n) return 0;
  const num = reserveB * 10n ** BigInt(decimalsA);
  const den = reserveA * 10n ** BigInt(decimalsB);
  if (den === 0n) return 0;
  // Multiply numerator by PRICE_SCALE BEFORE dividing so we keep 6dp.
  return Number((num * PRICE_SCALE) / den) / Number(PRICE_SCALE);
}

/**
 * Resolve a mint's USDC price by chaining through known pools.
 *
 * Resolution order:
 *   1. `mint === usdcMint`                            → `1, direct-usdc`
 *   2. Direct `mint-USDC` pool exists w/ both sides   → spot, `direct-usdc`
 *   3. Direct `mint-RWT` pool exists AND RWT has a
 *      USDC pool                                      → product, `via-rwt`
 *   4. Otherwise                                      → `null, unpriceable`
 *
 * Note: when `mint === rwtMint` and there is no direct RWT-USDC pool, we
 * return `unpriceable` rather than recursing. This avoids an infinite
 * recursion through case 3 when a token only has an RWT pool but no
 * RWT-USDC pool exists either.
 *
 * `pools` MUST be the parsed `PoolState` list (e.g. from
 * `enumeratePools`). Inactive pools are NOT pre-filtered here — callers
 * that want to ignore paused pools should filter the input list.
 */
export function chainPriceToUsdc(
  mint: PublicKey,
  decimals: number,
  pools: PoolState[],
  usdcMint: PublicKey,
  rwtMint: PublicKey,
  rwtDecimals: number,
  usdcDecimals: number,
): ChainPriceResult {
  // Case 1 — token IS USDC.
  if (mint.equals(usdcMint)) {
    return { priceUsdc: 1, source: 'direct-usdc' };
  }

  // Case 2 — direct USDC pool.
  const directPool = pools.find(
    (p) =>
      (p.tokenAMint.equals(mint) && p.tokenBMint.equals(usdcMint)) ||
      (p.tokenBMint.equals(mint) && p.tokenAMint.equals(usdcMint)),
  );
  if (directPool) {
    const isAMint = directPool.tokenAMint.equals(mint);
    const reserveMint = isAMint ? directPool.reserveA : directPool.reserveB;
    const reserveUsdc = isAMint ? directPool.reserveB : directPool.reserveA;
    if (reserveMint === 0n || reserveUsdc === 0n) {
      return { priceUsdc: null, source: 'unpriceable' };
    }
    const price = spotPriceA(reserveMint, decimals, reserveUsdc, usdcDecimals);
    return { priceUsdc: price, source: 'direct-usdc' };
  }

  // Case 3 — RWT chain. If `mint` IS RWT and we got here, there is no
  // direct RWT-USDC pool, so RWT itself is unpriceable on this graph.
  if (mint.equals(rwtMint)) {
    return { priceUsdc: null, source: 'unpriceable' };
  }

  const rwtPool = pools.find(
    (p) =>
      (p.tokenAMint.equals(mint) && p.tokenBMint.equals(rwtMint)) ||
      (p.tokenBMint.equals(mint) && p.tokenAMint.equals(rwtMint)),
  );
  if (rwtPool) {
    const isAMint = rwtPool.tokenAMint.equals(mint);
    const reserveMint = isAMint ? rwtPool.reserveA : rwtPool.reserveB;
    const reserveRwt = isAMint ? rwtPool.reserveB : rwtPool.reserveA;
    if (reserveMint === 0n || reserveRwt === 0n) {
      return { priceUsdc: null, source: 'unpriceable' };
    }

    // Resolve RWT price recursively. By the case-1/case-3 guard above,
    // this hits case 2 (direct RWT-USDC pool) or returns unpriceable —
    // it cannot loop back through this branch.
    const rwtPrice = chainPriceToUsdc(
      rwtMint,
      rwtDecimals,
      pools,
      usdcMint,
      rwtMint,
      rwtDecimals,
      usdcDecimals,
    );
    if (rwtPrice.priceUsdc === null) {
      return { priceUsdc: null, source: 'unpriceable' };
    }

    const priceMintInRwt = spotPriceA(
      reserveMint,
      decimals,
      reserveRwt,
      rwtDecimals,
    );
    return {
      priceUsdc: priceMintInRwt * rwtPrice.priceUsdc,
      source: 'via-rwt',
    };
  }

  return { priceUsdc: null, source: 'unpriceable' };
}

/**
 * Compute USDC TVL of a pool.
 *
 *   - Both sides priced  → `reserveA * priceA + reserveB * priceB`, source `'exact'`.
 *   - One side priced    → `priced_side_usdc * 2`, source `'mirrored'`. Mirrors
 *     the constant-product equilibrium heuristic (a balanced pool has
 *     equal USD value on each side); use sparingly, callers should warn
 *     the UI when this is the case.
 *   - Neither priced     → `null`, source `'unpriceable'`.
 *
 * `priceUsdcOfA / B` are USDC per 1 token (the natural shape returned by
 * `chainPriceToUsdc`). We rescale by `10^decimals` to convert raw
 * reserves to whole-token units before multiplying.
 */
export function poolTvlUsdc(
  pool: PoolState,
  priceUsdcOfA: number | null,
  priceUsdcOfB: number | null,
  decimalsA: number,
  decimalsB: number,
): { tvl: number | null; source: 'exact' | 'mirrored' | 'unpriceable' } {
  const tokensA = Number(pool.reserveA) / 10 ** decimalsA;
  const tokensB = Number(pool.reserveB) / 10 ** decimalsB;

  const aSideUsdc = priceUsdcOfA !== null ? tokensA * priceUsdcOfA : null;
  const bSideUsdc = priceUsdcOfB !== null ? tokensB * priceUsdcOfB : null;

  if (aSideUsdc !== null && bSideUsdc !== null) {
    return { tvl: aSideUsdc + bSideUsdc, source: 'exact' };
  }
  if (aSideUsdc !== null) {
    return { tvl: aSideUsdc * 2, source: 'mirrored' };
  }
  if (bSideUsdc !== null) {
    return { tvl: bSideUsdc * 2, source: 'mirrored' };
  }
  return { tvl: null, source: 'unpriceable' };
}
