// Depth ladder builder.
//
// Walks ten reserve-fraction buckets per side (A→B = ask, B→A = bid)
// through the pure `quoteSwap` helper to render an order-book-style
// depth chart. Concentrated pools (`poolType !== 0`) are skipped here
// because `quoteSwap` cannot price them without a BinArray fetch.
//
// Each bucket fraction is converted to an `amountIn` via integer
// scaling against `1_000_000` so ratio precision survives the bigint
// math (the 1.0 bucket maps to 100% of the input-side reserve).

import type { PublicKey } from '@solana/web3.js';

import type { ClusterName } from '../network/clusters.js';
import type {
  DexConfig,
  PoolState,
} from '../programs/native-dex/accounts.generated.js';
import { quoteSwap } from '../programs/native-dex/quote.js';
import type { DepthResult, DepthSlice } from './types.js';

/**
 * Buckets walked per side. Designed to densely cover the small-impact
 * zone (where most retail orders live) and then quickly probe the tail
 * up to draining the entire reserve.
 */
const DEPTH_PCT_BUCKETS = [
  0.001, 0.005, 0.01, 0.025, 0.05, 0.10, 0.20, 0.35, 0.50, 1.0,
] as const;

/** 1e6 — matches PRICE_SCALE in pricing.ts; used for fraction → bigint conv. */
const FRACTION_SCALE = 1_000_000n;

export interface ComputeDepthArgs {
  pool: PoolState;
  config: DexConfig;
  rwtMint: PublicKey;
  cluster: ClusterName;
}

/**
 * Build a per-side depth ladder for a StandardCurve pool.
 *
 *   - Concentrated pools → empty ladders (UI displays the "needs RPC sim"
 *     hint instead).
 *   - Buckets that round to `0n` are silently skipped so tiny-reserve
 *     pools still produce SOMETHING for the larger buckets.
 *   - As soon as `quoteSwap` returns `{ ok: false, ... }` for a bucket,
 *     the walk truncates — every higher bucket would also fail (deeper
 *     amounts only worsen the outcome on every error tag).
 *
 * Why the cluster argument: `quoteSwap` itself enforces the mainnet RWT
 * placeholder guard. Forwarding the cluster lets callers compute depth
 * uniformly across networks without per-cluster branching here.
 */
export function computeDepth(args: ComputeDepthArgs): DepthResult {
  const { pool, config, rwtMint, cluster } = args;

  // Concentrated pools cannot be priced off-chain — see `quote.ts` notes.
  if (pool.poolType !== 0) {
    return { bidSide: [], askSide: [] };
  }

  const sideFor = (aToB: boolean): DepthSlice[] => {
    const reserveIn = aToB ? pool.reserveA : pool.reserveB;
    const slices: DepthSlice[] = [];

    for (const pct of DEPTH_PCT_BUCKETS) {
      // Fraction → bigint amount: round to 1e-6 of the reserve.
      const scaled = BigInt(Math.round(pct * Number(FRACTION_SCALE)));
      const amountIn = (reserveIn * scaled) / FRACTION_SCALE;
      if (amountIn === 0n) continue;

      const out = quoteSwap({ pool, config, amountIn, aToB, rwtMint, cluster });
      if (!out.ok) break; // truncate — higher buckets will also fail

      slices.push({
        amountIn,
        amountOut: out.quote.amountOut,
        priceImpactBps: out.quote.priceImpactBps,
        pctOfReserve: pct,
      });
    }

    return slices;
  };

  return {
    askSide: sideFor(true),
    bidSide: sideFor(false),
  };
}
