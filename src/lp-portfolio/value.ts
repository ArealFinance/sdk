// Pure USDC valuation helper for an LP position.
//
// Single responsibility: given (shares, pool reserves, token prices,
// decimals), produce an `LpPositionValuation`. No RPC, no async, no
// mutation — this lets the snapshot reader compute valuations in a tight
// `map` after fetching all on-chain state in parallel.
//
// The underlying math (`shares → underlying tokens`) lives in
// `quoteLpRemove` (programs/native-dex/lp-quote.ts); this module only
// converts those raw amounts to USDC and computes the per-side split.

import type { PoolState } from '../programs/native-dex/accounts.generated.js';
import { quoteLpRemove } from '../programs/native-dex/lp-quote.js';
import type { LpPositionValuation } from './types.js';

export interface ValueLpPositionArgs {
  /** LpPosition.shares (u128). */
  shares: bigint;
  /** Subset of PoolState used by `quoteLpRemove`. */
  pool: Pick<PoolState, 'reserveA' | 'reserveB' | 'totalLpShares'>;
  /** Decimals of token A — used to convert raw → human for USDC math. */
  decimalsA: number;
  /** Decimals of token B. */
  decimalsB: number;
  /** USDC per 1 whole token A. null when unpriceable. */
  priceUsdcA: number | null;
  /** USDC per 1 whole token B. null when unpriceable. */
  priceUsdcB: number | null;
}

/**
 * Value an LP position in USDC.
 *
 * Steps:
 *   1. Burn-quote: `quoteLpRemove({shares, supply, reserveA, reserveB})`
 *      gives raw `(amountA, amountB)`. The helper itself returns
 *      `{0n, 0n}` when `supply == 0n` or `shares == 0n` — no special
 *      case needed here.
 *   2. Raw → human → USDC, per side. A `null` per-side price keeps that
 *      side's USDC null.
 *   3. `totalUsdc` is the sum ONLY when both sides resolved; if either
 *      side is null the total is null (we never silently zero a missing
 *      price).
 *   4. `pctA / pctB` (and the `ratioA` alias) are non-null only when
 *      `totalUsdc > 0` — the donut renderer must guard against null.
 */
export function valueLpPosition(args: ValueLpPositionArgs): LpPositionValuation {
  const { shares, pool, decimalsA, decimalsB, priceUsdcA, priceUsdcB } = args;

  const { amountA, amountB } = quoteLpRemove({
    shares,
    supply: pool.totalLpShares,
    reserveA: pool.reserveA,
    reserveB: pool.reserveB,
  });

  // Convert raw lamports → whole-token Number for USDC math. Precision
  // loss here is bounded by token decimals; bigints carry through to
  // amountA/amountB so callers needing exact base units still have them.
  const tokensA = Number(amountA) / 10 ** decimalsA;
  const tokensB = Number(amountB) / 10 ** decimalsB;

  const usdcA = priceUsdcA !== null ? tokensA * priceUsdcA : null;
  const usdcB = priceUsdcB !== null ? tokensB * priceUsdcB : null;

  const totalUsdc =
    usdcA !== null && usdcB !== null ? usdcA + usdcB : null;

  let pctA: number | null = null;
  let pctB: number | null = null;
  if (totalUsdc !== null && totalUsdc > 0) {
    // Both sides are guaranteed non-null when totalUsdc !== null.
    pctA = (usdcA as number) / totalUsdc;
    pctB = (usdcB as number) / totalUsdc;
  }

  return {
    amountA,
    amountB,
    usdcA,
    usdcB,
    totalUsdc,
    pctA,
    pctB,
    ratioA: pctA,
  };
}
