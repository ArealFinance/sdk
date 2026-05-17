// Unit tests for `sdk/src/markets/pricing.ts`.
//
// 10 cases covering the three pure helpers: `spotPriceA`,
// `chainPriceToUsdc`, and `poolTvlUsdc`. We build parsed `PoolState`
// fixtures directly as JS objects (matching the codegen shape) — the
// real parser is exercised by the e2e suite.

import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  chainPriceToUsdc,
  poolTvlUsdc,
  spotPriceA,
} from '../../src/markets/pricing.js';
import type { PoolState } from '../../src/programs/native-dex/accounts.generated.js';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const RWT_MINT = new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4');
const OT_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const OTHER_MINT = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

function k(): PublicKey {
  return Keypair.generate().publicKey;
}

interface PoolOverrides {
  tokenAMint?: PublicKey;
  tokenBMint?: PublicKey;
  reserveA?: bigint;
  reserveB?: bigint;
}

function makePool(o: PoolOverrides = {}): PoolState {
  return {
    poolType: 0,
    tokenAMint: o.tokenAMint ?? RWT_MINT,
    tokenBMint: o.tokenBMint ?? USDC_MINT,
    vaultA: k(),
    vaultB: k(),
    reserveA: o.reserveA ?? 1_000_000n,
    reserveB: o.reserveB ?? 1_000_000n,
    totalLpShares: 1_000n,
    feeBps: 30,
    isActive: true,
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

// ─────────────────────── spotPriceA ───────────────────────

describe('spotPriceA', () => {
  // SP-1
  it('returns 1 for 1:1 reserves with equal decimals', () => {
    const price = spotPriceA(1_000_000n, 6, 1_000_000n, 6);
    expect(price).toBe(1);
  });

  // SP-2
  it('handles different decimals (RWT 6 / OT 8) correctly', () => {
    // 1 OT (10^8 base units) is worth 1 RWT (10^6 base units) when reserves
    // mirror the decimal-aware ratio:
    //   reserveA = 10^8 OT units (= 1 OT), decimalsA = 8
    //   reserveB = 10^6 RWT units (= 1 RWT), decimalsB = 6
    //   spotPrice(A in B) = (10^6 * 10^8) / (10^8 * 10^6) = 1
    const price = spotPriceA(100_000_000n, 8, 1_000_000n, 6);
    expect(price).toBe(1);
  });

  // SP-3
  it('returns 0 when reserveA is zero', () => {
    const price = spotPriceA(0n, 6, 1_000_000n, 6);
    expect(price).toBe(0);
  });
});

// ────────────────────── chainPriceToUsdc ──────────────────────

describe('chainPriceToUsdc', () => {
  // CP-1: USDC mint → 1
  it('returns priceUsdc=1, source=direct-usdc when mint is USDC', () => {
    const res = chainPriceToUsdc(USDC_MINT, 6, [], USDC_MINT, RWT_MINT, 6, 6);
    expect(res).toEqual({ priceUsdc: 1, source: 'direct-usdc' });
  });

  // CP-2: RWT direct USDC pool → spot
  it('returns spot price via direct RWT-USDC pool', () => {
    // RWT-USDC pool, RWT 1m / USDC 1m → 1 RWT = 1 USDC.
    const pool = makePool({
      tokenAMint: RWT_MINT,
      tokenBMint: USDC_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
    });
    const res = chainPriceToUsdc(RWT_MINT, 6, [pool], USDC_MINT, RWT_MINT, 6, 6);
    expect(res.source).toBe('direct-usdc');
    expect(res.priceUsdc).toBe(1);
  });

  // CP-3: OT-RWT pool + RWT-USDC pool → product
  it('chains via RWT when no direct USDC pool exists for OT', () => {
    // RWT-USDC: 1 RWT = 2 USDC (RWT 500k / USDC 1m).
    const rwtUsdcPool = makePool({
      tokenAMint: RWT_MINT,
      tokenBMint: USDC_MINT,
      reserveA: 500_000n,
      reserveB: 1_000_000n,
    });
    // OT-RWT: 1 OT = 1 RWT (1m / 1m).
    const otRwtPool = makePool({
      tokenAMint: OT_MINT,
      tokenBMint: RWT_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
    });
    const res = chainPriceToUsdc(
      OT_MINT,
      6,
      [rwtUsdcPool, otRwtPool],
      USDC_MINT,
      RWT_MINT,
      6,
      6,
    );
    expect(res.source).toBe('via-rwt');
    // 1 OT × 1 RWT/OT × 2 USDC/RWT = 2 USDC.
    expect(res.priceUsdc).toBe(2);
  });

  // CP-4: no chain → unpriceable
  it('returns null/unpriceable when no direct or RWT pool exists', () => {
    const res = chainPriceToUsdc(
      OTHER_MINT,
      6,
      [],
      USDC_MINT,
      RWT_MINT,
      6,
      6,
    );
    expect(res).toEqual({ priceUsdc: null, source: 'unpriceable' });
  });

  // CP-5: RWT itself with no direct USDC pool → unpriceable (no infinite recursion)
  it('returns unpriceable for RWT when no direct USDC pool exists', () => {
    // OT-RWT pool exists but no RWT-USDC pool → RWT is unpriceable.
    const otRwtPool = makePool({
      tokenAMint: OT_MINT,
      tokenBMint: RWT_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
    });
    const res = chainPriceToUsdc(
      RWT_MINT,
      6,
      [otRwtPool],
      USDC_MINT,
      RWT_MINT,
      6,
      6,
    );
    expect(res).toEqual({ priceUsdc: null, source: 'unpriceable' });
  });
});

// ────────────────────────── poolTvlUsdc ──────────────────────────

describe('poolTvlUsdc', () => {
  // TVL-1: both sides priced → exact
  it("returns 'exact' when both sides have a USDC price", () => {
    const pool = makePool({
      reserveA: 1_000_000n, // 1 RWT (6dp)
      reserveB: 2_000_000n, // 2 USDC (6dp)
    });
    const res = poolTvlUsdc(pool, 1, 1, 6, 6);
    // 1*1 + 2*1 = 3
    expect(res).toEqual({ tvl: 3, source: 'exact' });
  });

  // TVL-2: one side priced → mirrored (× 2)
  it("returns 'mirrored' (× 2) when only one side is priced", () => {
    const pool = makePool({
      reserveA: 1_000_000n, // 1 OT (6dp)
      reserveB: 1_000_000n, // 1 unknown (6dp)
    });
    // Only A priced at $5 → mirrored TVL = 5 * 2 = 10.
    const res = poolTvlUsdc(pool, 5, null, 6, 6);
    expect(res).toEqual({ tvl: 10, source: 'mirrored' });
  });

  // TVL-3: only B priced → mirrored (× 2)
  it('mirrors when only side B is priced', () => {
    const pool = makePool({
      reserveA: 1_000_000n,
      reserveB: 3_000_000n, // 3 USDC
    });
    const res = poolTvlUsdc(pool, null, 1, 6, 6);
    // 3 * 2 = 6
    expect(res).toEqual({ tvl: 6, source: 'mirrored' });
  });

  // TVL-4: neither priced → unpriceable
  it("returns 'unpriceable' when neither side has a price", () => {
    const pool = makePool();
    const res = poolTvlUsdc(pool, null, null, 6, 6);
    expect(res).toEqual({ tvl: null, source: 'unpriceable' });
  });
});
