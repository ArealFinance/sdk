// Unit tests for `sdk/src/markets/depth.ts`.
//
// `computeDepth` is a thin walker around `quoteSwap` — these tests check
// the walker's contract (bucket selection, monotonicity, truncation,
// concentrated-pool skip), not the underlying quote math (covered by
// `quote-swap.test.ts`).

import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import { computeDepth } from '../../src/markets/depth.js';
import type {
  DexConfig,
  PoolState,
} from '../../src/programs/native-dex/accounts.generated.js';

const RWT_MINT = new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4');
const NON_RWT_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

function k(): PublicKey {
  return Keypair.generate().publicKey;
}

interface PoolOverrides {
  poolType?: number;
  reserveA?: bigint;
  reserveB?: bigint;
  isActive?: boolean;
}

function makePool(o: PoolOverrides = {}): PoolState {
  return {
    poolType: o.poolType ?? 0,
    tokenAMint: RWT_MINT,
    tokenBMint: NON_RWT_MINT,
    vaultA: k(),
    vaultB: k(),
    reserveA: o.reserveA ?? 1_000_000n,
    reserveB: o.reserveB ?? 1_000_000n,
    totalLpShares: 1_000n,
    feeBps: 30,
    isActive: o.isActive ?? true,
    totalFeesAccumulated: 0n,
    binStepBps: 0,
    activeBinId: 0,
    otTreasuryFeeDestination: k(),
    hasOtTreasury: false,
    bump: 255,
    cumulativeFeesPerShareA: 0n,
    cumulativeFeesPerShareB: 0n,
    leftAnchorBin: 0,
    permanentTailFloorBin: 0,
    lastRebalanceNavBin: 0,
    activeZoneLower: 0,
    permanentTailOffsetBps: 0,
    _padMonotonic: new Uint8Array(2),
  };
}

function makeConfig(): DexConfig {
  return {
    authority: k(),
    pendingAuthority: k(),
    hasPending: false,
    pauseAuthority: k(),
    baseFeeBps: 30,
    lpFeeShareBps: 8000,
    arealFeeDestination: k(),
    rebalancer: k(),
    isActive: true,
    bump: 255,
  };
}

describe('computeDepth', () => {
  // D-1
  it('produces buckets with monotone-increasing impact for a Standard pool', () => {
    const pool = makePool({ reserveA: 1_000_000_000n, reserveB: 1_000_000_000n });
    const config = makeConfig();
    const res = computeDepth({ pool, config, rwtMint: RWT_MINT, cluster: 'devnet' });

    expect(res.askSide.length).toBeGreaterThan(0);
    expect(res.bidSide.length).toBeGreaterThan(0);

    // Each bucket's impact must be >= the previous (impact only grows
    // with size). We allow equality for the smallest dust-level buckets.
    for (let i = 1; i < res.askSide.length; i++) {
      expect(res.askSide[i]!.priceImpactBps).toBeGreaterThanOrEqual(
        res.askSide[i - 1]!.priceImpactBps,
      );
    }
    for (let i = 1; i < res.bidSide.length; i++) {
      expect(res.bidSide[i]!.priceImpactBps).toBeGreaterThanOrEqual(
        res.bidSide[i - 1]!.priceImpactBps,
      );
    }
  });

  // D-2
  it('returns empty sides for Concentrated pools (poolType !== 0)', () => {
    const pool = makePool({ poolType: 1 });
    const config = makeConfig();
    const res = computeDepth({ pool, config, rwtMint: RWT_MINT, cluster: 'devnet' });
    expect(res.askSide).toHaveLength(0);
    expect(res.bidSide).toHaveLength(0);
  });

  // D-3
  it('skips buckets that round to 0n on tiny reserves', () => {
    // Reserve so small (10n base units) that the smallest bucket
    // (0.001 = 0.01n) rounds to 0n; only larger buckets survive.
    const pool = makePool({ reserveA: 10n, reserveB: 10n });
    const config = makeConfig();
    const res = computeDepth({ pool, config, rwtMint: RWT_MINT, cluster: 'devnet' });

    // No slice may have amountIn === 0n.
    for (const slice of res.askSide) {
      expect(slice.amountIn).toBeGreaterThan(0n);
    }
    for (const slice of res.bidSide) {
      expect(slice.amountIn).toBeGreaterThan(0n);
    }
  });

  // D-4
  it('truncates the walk at the first failed bucket (paused pool)', () => {
    // Pool inactive → quoteSwap returns PoolNotActive on every bucket.
    // Walk should truncate immediately and produce empty sides.
    const pool = makePool({ isActive: false });
    const config = makeConfig();
    const res = computeDepth({ pool, config, rwtMint: RWT_MINT, cluster: 'devnet' });
    expect(res.askSide).toHaveLength(0);
    expect(res.bidSide).toHaveLength(0);
  });
});
