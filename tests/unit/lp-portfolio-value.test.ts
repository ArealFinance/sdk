// Unit tests for `sdk/src/lp-portfolio/value.ts`.
//
// We trust `quoteLpRemove` (covered by tests/unit/lp-quote.test.ts) and
// only assert the integration: USDC conversion, null-price propagation,
// totalUsdc/pct semantics, edge cases (empty pool, zero supply, balanced
// vs. skewed splits).

import { describe, expect, it } from 'vitest';

import { valueLpPosition } from '../../src/lp-portfolio/value.js';
import type { PoolState } from '../../src/programs/native-dex/accounts.generated.js';

/** Minimal pool stub matching the `Pick<PoolState, ...>` argument shape. */
function poolStub(args: {
  reserveA: bigint;
  reserveB: bigint;
  totalLpShares: bigint;
}): Pick<PoolState, 'reserveA' | 'reserveB' | 'totalLpShares'> {
  return args;
}

describe('valueLpPosition', () => {
  // VLP-1: balanced pool, both sides priced at $1.
  it('values a balanced pool at the expected USDC total and 50/50 split', () => {
    // Pool: 1M A + 1M B with 1M shares; user holds 100k shares (10%).
    const out = valueLpPosition({
      shares: 100_000n,
      pool: poolStub({
        reserveA: 1_000_000n,
        reserveB: 1_000_000n,
        totalLpShares: 1_000_000n,
      }),
      decimalsA: 6,
      decimalsB: 6,
      priceUsdcA: 1,
      priceUsdcB: 1,
    });

    expect(out.amountA).toBe(100_000n);
    expect(out.amountB).toBe(100_000n);
    // 100_000 raw / 10^6 decimals = 0.1 token; 0.1 × $1 = $0.10 per side.
    expect(out.usdcA).toBeCloseTo(0.1, 12);
    expect(out.usdcB).toBeCloseTo(0.1, 12);
    expect(out.totalUsdc).toBeCloseTo(0.2, 12);
    expect(out.pctA).toBeCloseTo(0.5, 12);
    expect(out.pctB).toBeCloseTo(0.5, 12);
    expect(out.ratioA).toBe(out.pctA);
  });

  // VLP-2: skewed 80/20 pool — pcts reflect USDC, not raw token amounts.
  it('reports USDC-share split for a skewed pool', () => {
    // Reserve A worth $80, Reserve B worth $20: priceA=$0.80, priceB=$0.20
    // with both 1M raw and 6 decimals → 1 token each side.
    const out = valueLpPosition({
      shares: 1n,
      pool: poolStub({
        reserveA: 1_000_000n,
        reserveB: 1_000_000n,
        totalLpShares: 1n, // user owns 100% — quote returns full reserves
      }),
      decimalsA: 6,
      decimalsB: 6,
      priceUsdcA: 0.8,
      priceUsdcB: 0.2,
    });

    expect(out.amountA).toBe(1_000_000n);
    expect(out.amountB).toBe(1_000_000n);
    expect(out.usdcA).toBeCloseTo(0.8, 12);
    expect(out.usdcB).toBeCloseTo(0.2, 12);
    expect(out.totalUsdc).toBeCloseTo(1.0, 12);
    expect(out.pctA).toBeCloseTo(0.8, 12);
    expect(out.pctB).toBeCloseTo(0.2, 12);
  });

  // VLP-3: half-priced (B unpriceable) → totalUsdc null, pcts null.
  it('returns null totalUsdc and pcts when one side is unpriceable', () => {
    const out = valueLpPosition({
      shares: 100n,
      pool: poolStub({
        reserveA: 1_000_000n,
        reserveB: 2_000_000n,
        totalLpShares: 1_000n,
      }),
      decimalsA: 6,
      decimalsB: 6,
      priceUsdcA: 1,
      priceUsdcB: null, // unpriceable
    });

    expect(out.amountA).toBe(100_000n); // 100/1000 of 1M
    expect(out.amountB).toBe(200_000n); // 100/1000 of 2M
    expect(out.usdcA).toBeCloseTo(0.1, 12);
    expect(out.usdcB).toBeNull();
    expect(out.totalUsdc).toBeNull();
    expect(out.pctA).toBeNull();
    expect(out.pctB).toBeNull();
    expect(out.ratioA).toBeNull();
  });

  // VLP-4: empty pool (totalLpShares == 0) → quoteLpRemove returns {0,0}.
  it('handles empty pool (totalLpShares == 0n) without throwing', () => {
    const out = valueLpPosition({
      shares: 0n,
      pool: poolStub({
        reserveA: 0n,
        reserveB: 0n,
        totalLpShares: 0n,
      }),
      decimalsA: 6,
      decimalsB: 6,
      priceUsdcA: 1,
      priceUsdcB: 1,
    });

    expect(out.amountA).toBe(0n);
    expect(out.amountB).toBe(0n);
    expect(out.usdcA).toBe(0);
    expect(out.usdcB).toBe(0);
    expect(out.totalUsdc).toBe(0);
    // totalUsdc == 0 → pcts should be null (avoid div-by-zero).
    expect(out.pctA).toBeNull();
    expect(out.pctB).toBeNull();
  });

  // VLP-5: zero shares → zero amounts, zero USDC, null pcts.
  it('returns zero amounts and null pcts when shares == 0n', () => {
    const out = valueLpPosition({
      shares: 0n,
      pool: poolStub({
        reserveA: 1_000_000n,
        reserveB: 1_000_000n,
        totalLpShares: 1_000n,
      }),
      decimalsA: 6,
      decimalsB: 6,
      priceUsdcA: 1,
      priceUsdcB: 1,
    });

    expect(out.amountA).toBe(0n);
    expect(out.amountB).toBe(0n);
    expect(out.totalUsdc).toBe(0);
    expect(out.pctA).toBeNull();
    expect(out.pctB).toBeNull();
  });

  // VLP-6: both sides null → totalUsdc null.
  it('returns null totalUsdc when both prices are null', () => {
    const out = valueLpPosition({
      shares: 100n,
      pool: poolStub({
        reserveA: 1_000_000n,
        reserveB: 1_000_000n,
        totalLpShares: 1_000n,
      }),
      decimalsA: 6,
      decimalsB: 6,
      priceUsdcA: null,
      priceUsdcB: null,
    });

    expect(out.usdcA).toBeNull();
    expect(out.usdcB).toBeNull();
    expect(out.totalUsdc).toBeNull();
  });

  // VLP-7: different decimals on each side — conversion respects per-side dp.
  it('respects per-side decimals when converting raw → human', () => {
    // Side A: 9 decimals (e.g. SPL with native 9dp); side B: 6 decimals.
    // Reserves: 1e9 raw A (= 1 token) and 1e6 raw B (= 1 token).
    // Burn 100% (shares = supply).
    const out = valueLpPosition({
      shares: 1n,
      pool: poolStub({
        reserveA: 1_000_000_000n,
        reserveB: 1_000_000n,
        totalLpShares: 1n,
      }),
      decimalsA: 9,
      decimalsB: 6,
      priceUsdcA: 2,
      priceUsdcB: 1,
    });

    expect(out.amountA).toBe(1_000_000_000n);
    expect(out.amountB).toBe(1_000_000n);
    expect(out.usdcA).toBeCloseTo(2, 12); // 1 token × $2
    expect(out.usdcB).toBeCloseTo(1, 12); // 1 token × $1
    expect(out.totalUsdc).toBeCloseTo(3, 12);
    expect(out.pctA).toBeCloseTo(2 / 3, 12);
    expect(out.pctB).toBeCloseTo(1 / 3, 12);
  });
});
