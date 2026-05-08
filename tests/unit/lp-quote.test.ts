// Unit tests for `sdk/src/programs/native-dex/lp-quote.ts`.
//
// The on-chain math we are mirroring lives in
// `contracts/native-dex/src/amm.rs::{calculate_lp_shares, calculate_remove_amounts}`.
// Each test pins a single branch of those functions; if any branch drifts
// (rounding, MIN_LIQUIDITY constant, sqrt impl) the corresponding test fails.

import { describe, expect, it } from 'vitest';

import {
  LP_MIN_LIQUIDITY,
  bigintIsqrt,
  quoteLpRemove,
  quoteLpShares,
} from '../../src/programs/native-dex/lp-quote.js';

// ─────────────────────────── quoteLpShares ───────────────────────────

describe('quoteLpShares — first deposit (supply == 0)', () => {
  it('returns isqrt(amountA * amountB) - LP_MIN_LIQUIDITY when above threshold', () => {
    // amountA = amountB = 1_000_000 → sqrt(1e12) = 1_000_000 → shares = 999_000.
    const out = quoteLpShares({
      reserveA: 0n,
      reserveB: 0n,
      supply: 0n,
      amountA: 1_000_000n,
      amountB: 1_000_000n,
    });
    expect(out.isFirstDeposit).toBe(true);
    expect(out.shares).toBe(1_000_000n - LP_MIN_LIQUIDITY);
  });

  it('matches the contract formula for asymmetric first-deposit amounts', () => {
    // sqrt(4 * 9) = 6 → shares = 6 - 1000 → clamped to 0n (deposit too small).
    const tiny = quoteLpShares({
      reserveA: 0n,
      reserveB: 0n,
      supply: 0n,
      amountA: 4n,
      amountB: 9n,
    });
    expect(tiny.isFirstDeposit).toBe(true);
    expect(tiny.shares).toBe(0n);

    // sqrt(2_500 * 4_000_000) = sqrt(10^10) = 100_000 → shares = 99_000.
    const big = quoteLpShares({
      reserveA: 0n,
      reserveB: 0n,
      supply: 0n,
      amountA: 2_500n,
      amountB: 4_000_000n,
    });
    expect(big.isFirstDeposit).toBe(true);
    expect(big.shares).toBe(100_000n - LP_MIN_LIQUIDITY);
  });

  it('returns zero shares when amountA is zero (sqrt(0) = 0)', () => {
    const out = quoteLpShares({
      reserveA: 0n,
      reserveB: 0n,
      supply: 0n,
      amountA: 0n,
      amountB: 1_000_000n,
    });
    expect(out.isFirstDeposit).toBe(true);
    expect(out.shares).toBe(0n);
  });

  it('returns zero shares when amountB is zero (sqrt(0) = 0)', () => {
    const out = quoteLpShares({
      reserveA: 0n,
      reserveB: 0n,
      supply: 0n,
      amountA: 1_000_000n,
      amountB: 0n,
    });
    expect(out.isFirstDeposit).toBe(true);
    expect(out.shares).toBe(0n);
  });
});

describe('quoteLpShares — subsequent deposit (supply > 0)', () => {
  it('returns proportional shares for a balanced add', () => {
    // Pool 50/50, supply 100. Add 5/5 (5% of each side) → shares = 5.
    const out = quoteLpShares({
      reserveA: 100n,
      reserveB: 100n,
      supply: 100n,
      amountA: 5n,
      amountB: 5n,
    });
    expect(out.isFirstDeposit).toBe(false);
    expect(out.shares).toBe(5n);
  });

  it('takes the min ratio for an imbalanced add', () => {
    // Pool 100/100, supply 100. Add 10A + 5B → A-ratio = 10, B-ratio = 5
    // → contract returns min = 5 (only the B side bound is honoured).
    const out = quoteLpShares({
      reserveA: 100n,
      reserveB: 100n,
      supply: 100n,
      amountA: 10n,
      amountB: 5n,
    });
    expect(out.isFirstDeposit).toBe(false);
    expect(out.shares).toBe(5n);
  });

  it('matches the formula for an asymmetric pool with proportional input', () => {
    // Pool 200_000A / 50_000B, supply 100_000.
    // Balanced add of 4A + 1B (4 : 1 ratio same as reserves) →
    //   sharesA = 4 * 100_000 / 200_000 = 2
    //   sharesB = 1 * 100_000 /  50_000 = 2
    //   min = 2.
    const out = quoteLpShares({
      reserveA: 200_000n,
      reserveB: 50_000n,
      supply: 100_000n,
      amountA: 4n,
      amountB: 1n,
    });
    expect(out.shares).toBe(2n);
  });

  it('floors fractional ratios (mirrors checked_mul_div_u128 truncation)', () => {
    // sharesA = 7 * 100 / 9 = floor(77.78) = 77
    // sharesB = 7 * 100 / 9 = 77
    // min = 77.
    const out = quoteLpShares({
      reserveA: 9n,
      reserveB: 9n,
      supply: 100n,
      amountA: 7n,
      amountB: 7n,
    });
    expect(out.shares).toBe(77n);
  });
});

// ─────────────────────────── quoteLpRemove ───────────────────────────

describe('quoteLpRemove', () => {
  it('returns half the reserves when shares == supply / 2', () => {
    // Pool 1_000_000 / 2_000_000, supply 100_000. Burn 50_000 → exactly half.
    const out = quoteLpRemove({
      shares: 50_000n,
      supply: 100_000n,
      reserveA: 1_000_000n,
      reserveB: 2_000_000n,
    });
    expect(out.amountA).toBe(500_000n);
    expect(out.amountB).toBe(1_000_000n);
  });

  it('returns the full reserves when shares == supply (drain)', () => {
    const out = quoteLpRemove({
      shares: 100_000n,
      supply: 100_000n,
      reserveA: 999_999n,
      reserveB: 123_456n,
    });
    expect(out.amountA).toBe(999_999n);
    expect(out.amountB).toBe(123_456n);
  });

  it('floors fractional outputs (matches contract truncation)', () => {
    // 7 * 1_000 / 30 = floor(233.33) = 233
    const out = quoteLpRemove({
      shares: 7n,
      supply: 30n,
      reserveA: 1_000n,
      reserveB: 1_000n,
    });
    expect(out.amountA).toBe(233n);
    expect(out.amountB).toBe(233n);
  });

  it('returns 0/0 when shares is zero', () => {
    const out = quoteLpRemove({
      shares: 0n,
      supply: 100n,
      reserveA: 1_000n,
      reserveB: 2_000n,
    });
    expect(out.amountA).toBe(0n);
    expect(out.amountB).toBe(0n);
  });

  it('returns 0/0 (never divides) when supply is zero', () => {
    // Contract would error with InsufficientLiquidity. SDK clamps to 0/0
    // so consumers can pre-flight against a drained pool without a throw.
    const out = quoteLpRemove({
      shares: 100n,
      supply: 0n,
      reserveA: 1_000n,
      reserveB: 2_000n,
    });
    expect(out.amountA).toBe(0n);
    expect(out.amountB).toBe(0n);
  });
});

// ─────────────────────────── bigintIsqrt ───────────────────────────

describe('bigintIsqrt', () => {
  it('returns 0 for 0', () => {
    expect(bigintIsqrt(0n)).toBe(0n);
  });

  it('returns 1 for 1, 2, 3', () => {
    expect(bigintIsqrt(1n)).toBe(1n);
    expect(bigintIsqrt(2n)).toBe(1n);
    expect(bigintIsqrt(3n)).toBe(1n);
  });

  it('returns 2 for 4, 5, 6, 7, 8', () => {
    expect(bigintIsqrt(4n)).toBe(2n);
    expect(bigintIsqrt(5n)).toBe(2n);
    expect(bigintIsqrt(8n)).toBe(2n);
  });

  it('returns the floor of sqrt for perfect squares', () => {
    expect(bigintIsqrt(100n)).toBe(10n);
    expect(bigintIsqrt(10_000n)).toBe(100n);
    expect(bigintIsqrt(1_000_000n)).toBe(1_000n);
    expect(bigintIsqrt(1_000_000_000_000n)).toBe(1_000_000n);
  });

  it('returns the floor for non-perfect squares', () => {
    expect(bigintIsqrt(99n)).toBe(9n);
    expect(bigintIsqrt(10_001n)).toBe(100n);
    expect(bigintIsqrt(15n)).toBe(3n);
  });

  it('handles large u128-range inputs', () => {
    // (2^63)^2 = 2^126 — well within bigint, mirrors a u128 isqrt.
    const big = 1n << 63n;
    expect(bigintIsqrt(big * big)).toBe(big);
    expect(bigintIsqrt(big * big - 1n)).toBe(big - 1n);
  });

  it('treats negative inputs as 0 (defensive)', () => {
    expect(bigintIsqrt(-1n)).toBe(0n);
    expect(bigintIsqrt(-100n)).toBe(0n);
  });
});

// ─────────────────────────── constant pin ───────────────────────────

describe('LP_MIN_LIQUIDITY', () => {
  it('matches the contract constant (1_000)', () => {
    // Pinned vs contracts/native-dex/src/constants.rs:10. If the contract
    // changes this constant, this test fails and the SDK must follow.
    expect(LP_MIN_LIQUIDITY).toBe(1_000n);
  });
});
