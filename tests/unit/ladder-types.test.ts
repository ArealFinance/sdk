// Unit tests for `sdk/src/tx/native-dex/_ladder-types.ts`.
//
// Mirrors the relevant unit-test surface from
// `contracts/native-dex/src/concentrated.rs` and
// `contracts/native-dex/src/instructions/swap.rs::should_route_to_mint`.
//
// Coverage targets:
//   1. `powBps` matches the Rust `pow_bps` byte-for-byte for known cases.
//   2. `priceAtBin` agrees with `powBps` (it's a thin wrapper).
//   3. `navToBin` round-trips through `priceAtBin` cleanly.
//   4. `shouldRouteToMint` reproduces the contract's CP-6 gate matrix.

import { describe, expect, it } from 'vitest';

import {
  ACTIVE_ZONE_WIDTH,
  BPS_DENOMINATOR,
  CONCENTRATED_SCALE,
  MAX_BINS,
  MIN_PERMANENT_TAIL_OFFSET_BPS,
  MINT_ROUTE_PRICE_OFFSET_BPS,
  PERMANENT_TAIL_BIN_COUNT,
  navToBin,
  powBps,
  priceAtBin,
  shouldRouteToMint,
} from '../../src/tx/native-dex/_ladder-types.js';

// ─────────────────────────────── constants ────────────────────────────────

describe('_ladder-types constants', () => {
  it('mirror contracts/native-dex/src/constants.rs', () => {
    expect(BPS_DENOMINATOR).toBe(10_000n);
    expect(CONCENTRATED_SCALE).toBe(1_000_000_000_000n);
    expect(MAX_BINS).toBe(630);
    expect(ACTIVE_ZONE_WIDTH).toBe(40);
    expect(MINT_ROUTE_PRICE_OFFSET_BPS).toBe(50n);
    expect(MIN_PERMANENT_TAIL_OFFSET_BPS).toBe(30);
    expect(PERMANENT_TAIL_BIN_COUNT).toBe(70);
  });

  it('MAX_BINS keeps BinArray account size under Solana CPI realloc limit', () => {
    // Mirror of contracts/native-dex/src/state.rs::BinArray:
    //   pool ([u8;32])           = 32
    //   bins ([Bin; MAX_BINS])   = 16 × MAX_BINS    (Bin = 2 × u64 = 16 B)
    //   lower_bin_id (i32)       = 4
    //   bin_step_bps (u16)       = 2
    //   active_bin_id (i32)      = 4
    //   bump (u8)                = 1
    //   discriminator (arlex)    = 8
    // Total SPACE must stay ≤ 10_240 (MAX_PERMITTED_DATA_INCREASE).
    const BIN_BYTES = 16;
    const TRAILER_BYTES = 32 + 4 + 2 + 4 + 1; // 43
    const DISCRIMINATOR = 8;
    const SIZE = MAX_BINS * BIN_BYTES + TRAILER_BYTES;
    const SPACE = DISCRIMINATOR + SIZE;
    expect(SIZE).toBe(10_123);
    expect(SPACE).toBe(10_131);
    expect(SPACE).toBeLessThanOrEqual(10_240);
  });
});

// ─────────────────────────────── powBps ───────────────────────────────────

describe('powBps', () => {
  it('returns SCALE for exp == 0 (any bps)', () => {
    expect(powBps(10, 0)).toBe(CONCENTRATED_SCALE);
    expect(powBps(0, 0)).toBe(CONCENTRATED_SCALE);
    expect(powBps(9_999, 0)).toBe(CONCENTRATED_SCALE);
  });

  it('returns null for bps >= 10_000 (mirror of Rust 100% gate)', () => {
    expect(powBps(10_000, 1)).toBeNull();
    expect(powBps(20_000, 1)).toBeNull();
  });

  it('returns null for negative bps', () => {
    expect(powBps(-1, 1)).toBeNull();
  });

  it('returns null for i32::MIN exponent (overflow on -exp)', () => {
    expect(powBps(10, -(2 ** 31))).toBeNull();
  });

  it('round-trips through pow_bps fixture from concentrated.rs (10 bps, exp 1)', () => {
    // base = SCALE + 10 × SCALE / 10_000 = SCALE × 1.001 = 1_001_000_000_000
    const p1 = powBps(10, 1);
    expect(p1).toBe(1_001_000_000_000n);
  });

  it('round-trips (10 bps, exp 2) — squared base', () => {
    // 1.001 × 1.001 = 1.002001 → 1_002_001_000_000 (with rounding)
    const p2 = powBps(10, 2);
    expect(p2).toBe(1_002_001_000_000n);
  });

  it('negative exp inverts via SCALE^2 / forward', () => {
    // 1.001^-1 ≈ 0.999001 → ~999_000_999_000 in SCALE units
    const inv = powBps(10, -1);
    expect(inv).not.toBeNull();
    if (inv === null) return;
    // Allow ±1 ulp because the inversion truncates.
    const expected = (CONCENTRATED_SCALE * CONCENTRATED_SCALE) / 1_001_000_000_000n;
    expect(inv).toBe(expected);
  });
});

// ─────────────────────────────── priceAtBin ───────────────────────────────

describe('priceAtBin', () => {
  it('returns null for binStepBps == 0', () => {
    expect(priceAtBin(0, 1)).toBeNull();
  });

  it('returns null for binStepBps > u16::MAX', () => {
    expect(priceAtBin(0x10000, 1)).toBeNull();
  });

  it('returns null for non-integer bin', () => {
    expect(priceAtBin(10, 1.5)).toBeNull();
  });

  it('delegates to powBps (== powBps for valid inputs)', () => {
    const a = priceAtBin(10, 5);
    const b = powBps(10, 5);
    expect(a).toBe(b);
  });

  it('at active_bin+1 with step=10: returns SCALE × 1.001', () => {
    expect(priceAtBin(10, 1)).toBe(1_001_000_000_000n);
  });
});

// ─────────────────────────────── navToBin ────────────────────────────────

describe('navToBin', () => {
  it('returns null for nav <= 0', () => {
    expect(navToBin(0n, 10)).toBeNull();
    expect(navToBin(-1n, 10)).toBeNull();
  });

  it('returns null for out-of-range binStepBps', () => {
    expect(navToBin(1_000_000n, 0)).toBeNull();
    expect(navToBin(1_000_000n, 10_000)).toBeNull();
  });

  it('returns 0 for NAV = $1.00 at any positive step (SCALE × 1.0)', () => {
    // navQ = 1_000_000 × 1e6 = 1e12 (CONCENTRATED_SCALE) → matches bin 0.
    expect(navToBin(1_000_000n, 10)).toBe(0);
  });

  it('round-trips priceAtBin → navToBin for small positive bins (±1 ulp tolerance)', () => {
    // bin 5 → price = (1.001)^5 ≈ 1.00501 → NAV ≈ 1_005_010
    const p = priceAtBin(10, 5);
    expect(p).not.toBeNull();
    if (p === null) return;
    // Convert from CONCENTRATED_SCALE → NAV scale (6-decimal USDC). The
    // two truncating divisions (CONCENTRATED_SCALE→NAV here, then
    // navToBin's binary search through priceAtBin) can shave the result
    // by 1 ulp — round-trip lands at `bin` or `bin - 1`. The on-chain
    // Rebalancer is documented to do the same off-chain log-based round
    // and uses `floor`, so this matches the spec.
    const navAt5 = p / 1_000_000n;
    const reverse = navToBin(navAt5, 10);
    expect(reverse).not.toBeNull();
    if (reverse === null) return;
    expect(reverse === 5 || reverse === 4).toBe(true);
  });
});

// ─────────────────────── shouldRouteToMint matrix ────────────────────────
//
// Mirror of contracts/native-dex/src/instructions/swap.rs tests
// `master_usdc_to_rwt_*` and friends. We exercise the boolean decision
// rule across the {organic-ask × price vs threshold × NAV value} matrix.

describe('shouldRouteToMint', () => {
  it('empty organic ask → always routes (regardless of price)', () => {
    // Best ask priced way below threshold — gate should still route.
    expect(shouldRouteToMint(false, 1_000_000n, 1n, 1_000_000n)).toBe(true);
  });

  it('ask present, price below threshold → bin-walk', () => {
    // Best ask at NAV × 1.001 — well below NAV × 1.005 threshold.
    const nav = 1_000_000n;
    const navQ = (nav * CONCENTRATED_SCALE) / 1_000_000n;
    const belowThreshold = (navQ * 10_010n) / 10_000n;
    expect(shouldRouteToMint(true, nav, belowThreshold)).toBe(false);
  });

  it('ask present, price above threshold → mint route', () => {
    // Best ask at NAV × 1.01 — above NAV × 1.005 threshold.
    const nav = 1_000_000n;
    const navQ = (nav * CONCENTRATED_SCALE) / 1_000_000n;
    const aboveThreshold = (navQ * 10_100n) / 10_000n;
    expect(shouldRouteToMint(true, nav, aboveThreshold)).toBe(true);
  });

  it('price EXACTLY at threshold → bin-walk (strict > boundary)', () => {
    const nav = 1_000_000n;
    const navQ = (nav * CONCENTRATED_SCALE) / 1_000_000n;
    const exactThreshold =
      (navQ * (BPS_DENOMINATOR + MINT_ROUTE_PRICE_OFFSET_BPS)) / BPS_DENOMINATOR;
    expect(shouldRouteToMint(true, nav, exactThreshold)).toBe(false);
  });

  it('price one ulp above threshold → mint route', () => {
    const nav = 1_000_000n;
    const navQ = (nav * CONCENTRATED_SCALE) / 1_000_000n;
    const exactThreshold =
      (navQ * (BPS_DENOMINATOR + MINT_ROUTE_PRICE_OFFSET_BPS)) / BPS_DENOMINATOR;
    expect(shouldRouteToMint(true, nav, exactThreshold + 1n)).toBe(true);
  });

  it('NAV == 0 → threshold collapses to 0, any positive ask routes', () => {
    expect(shouldRouteToMint(true, 0n, 1n)).toBe(true);
  });
});
