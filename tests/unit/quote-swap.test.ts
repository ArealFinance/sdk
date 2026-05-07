// Unit tests for `sdk/src/programs/native-dex/quote.ts`.
//
// 14 cases (QM-1 through QM-14) — each pins one branch of the math
// against the on-chain `swap_internal` + `calculate_fees` formulas in
// `contracts/native-dex/src/{instructions/swap.rs,amm.rs}`. Cases use
// parsed `PoolState` / `DexConfig` fixtures (built directly as JS
// objects, not raw bytes) because `quoteSwap` consumes the parsed
// shape — the codegen parser is exercised separately by the e2e suite.

import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  applySlippage,
  quoteSwap,
} from '../../src/programs/native-dex/quote.js';
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
  tokenAMint?: PublicKey;
  tokenBMint?: PublicKey;
  reserveA?: bigint;
  reserveB?: bigint;
  feeBps?: number;
  isActive?: boolean;
  hasOtTreasury?: boolean;
}

function makePool(o: PoolOverrides = {}): PoolState {
  return {
    poolType: o.poolType ?? 0,
    tokenAMint: o.tokenAMint ?? RWT_MINT,
    tokenBMint: o.tokenBMint ?? NON_RWT_MINT,
    vaultA: k(),
    vaultB: k(),
    reserveA: o.reserveA ?? 1_000_000n,
    reserveB: o.reserveB ?? 1_000_000n,
    totalLpShares: 1_000n,
    feeBps: o.feeBps ?? 30, // 0.30%
    isActive: o.isActive ?? true,
    totalFeesAccumulated: 0n,
    binStepBps: 0,
    activeBinId: 0,
    otTreasuryFeeDestination: k(),
    hasOtTreasury: o.hasOtTreasury ?? false,
    bump: 255,
    cumulativeFeesPerShareA: 0n,
    cumulativeFeesPerShareB: 0n,
  };
}

function makeConfig(o: { isActive?: boolean; lpFeeShareBps?: number } = {}): DexConfig {
  return {
    authority: k(),
    pendingAuthority: k(),
    hasPending: false,
    pauseAuthority: k(),
    baseFeeBps: 30,
    lpFeeShareBps: o.lpFeeShareBps ?? 8000, // 80% to LP, 20% to protocol
    arealFeeDestination: k(),
    rebalancer: k(),
    isActive: o.isActive ?? true,
    bump: 255,
  };
}

// QM-1
describe('quoteSwap — QM-1: selling RWT, 1:1 reserves, no OT treasury', () => {
  it('matches calculate_fees + constant_product_output for input-side fees', () => {
    const pool = makePool({
      tokenAMint: RWT_MINT,
      tokenBMint: NON_RWT_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      feeBps: 30,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    const out = quoteSwap({ pool, config, amountIn: 10_000n, aToB: true, rwtMint: RWT_MINT });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // fee_total = 10_000 * 30 / 10000 = 30
    // fee_lp = 30 * 8000 / 10000 = 24; fee_protocol = 6
    expect(out.quote.fees.feeTotal).toBe(30n);
    expect(out.quote.fees.feeLp).toBe(24n);
    expect(out.quote.fees.feeProtocol).toBe(6n);
    expect(out.quote.fees.feeOtTreasury).toBe(0n);
    // net_input = 10_000 - 30 = 9_970
    expect(out.quote.netInput).toBe(9_970n);
    // amount_out = (1_000_000 * 9970) / (1_000_000 + 9970) = 9_871_553_555 / 1_009_970 = 9_871
    const expected = (1_000_000n * 9_970n) / (1_000_000n + 9_970n);
    expect(out.quote.amountOut).toBe(expected);
    // post reserves: input side gains net_input, output side loses amount_out (no extra fee deduction in input-RWT branch)
    expect(out.quote.reserveInAfter).toBe(1_000_000n + 9_970n);
    expect(out.quote.reserveOutAfter).toBe(1_000_000n - expected);
  });
});

// QM-2
describe('quoteSwap — QM-2: buying RWT, 1:1 reserves, no OT treasury', () => {
  it('matches gross-then-fee output-side branch', () => {
    const pool = makePool({
      tokenAMint: RWT_MINT,
      tokenBMint: NON_RWT_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      feeBps: 30,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    // aToB=false here means input is token_b (NON_RWT), output is token_a (RWT) — so input is non-RWT.
    const out = quoteSwap({ pool, config, amountIn: 10_000n, aToB: false, rwtMint: RWT_MINT });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // gross_out = (1_000_000 * 10_000) / (1_000_000 + 10_000) = 9_900
    const grossOut = (1_000_000n * 10_000n) / (1_000_000n + 10_000n);
    // fee_total = gross_out * 30 / 10000
    const feeTotal = (grossOut * 30n) / 10_000n;
    const feeLp = (feeTotal * 8000n) / 10_000n;
    const feeProtocol = feeTotal - feeLp;

    expect(out.quote.fees.feeTotal).toBe(feeTotal);
    expect(out.quote.fees.feeLp).toBe(feeLp);
    expect(out.quote.fees.feeProtocol).toBe(feeProtocol);
    expect(out.quote.fees.feeOtTreasury).toBe(0n);
    expect(out.quote.netInput).toBe(10_000n);
    expect(out.quote.amountOut).toBe(grossOut - feeTotal);
    // Output-RWT branch: reserves lose amount_out + fee_protocol + fee_lp + fee_ot_treasury (== gross_out)
    expect(out.quote.reserveInAfter).toBe(1_000_000n + 10_000n);
    expect(out.quote.reserveOutAfter).toBe(1_000_000n - grossOut);
  });
});

// QM-3
describe('quoteSwap — QM-3: dust-fee floor (amount=1, fee_bps=30)', () => {
  it('rounds fee_total up to 1 lamport when raw mul/div would yield 0', () => {
    const pool = makePool({ feeBps: 30, reserveA: 1_000_000n, reserveB: 1_000_000n });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    // amount = 1, fee_bps = 30 → raw = 1*30/10000 = 0; dust floor → 1
    const out = quoteSwap({ pool, config, amountIn: 1n, aToB: true, rwtMint: RWT_MINT });
    // 1 lamport input — fees take all of it, net_input = 0 → output = 0 → ZeroOutput
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('ZeroOutput');
  });

  it('selling RWT with amount that exercises dust floor but still has positive net_input', () => {
    // amount = 100, fee_bps = 30 → raw = 100*30/10000 = 0; dust floor → 1
    // net_input = 99
    const pool = makePool({ feeBps: 30, reserveA: 1_000_000n, reserveB: 1_000_000n });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    const out = quoteSwap({ pool, config, amountIn: 100n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quote.fees.feeTotal).toBe(1n);
    // feeLp = 1 * 8000 / 10000 = 0; feeProtocol = 1 - 0 = 1
    expect(out.quote.fees.feeLp).toBe(0n);
    expect(out.quote.fees.feeProtocol).toBe(1n);
    expect(out.quote.netInput).toBe(99n);
  });
});

// QM-4
describe('quoteSwap — QM-4: remainder pattern (lp_share=5000, odd fee_total)', () => {
  it('protocol receives ceil(fee_total/2) when split is uneven', () => {
    // fee_total = 1000 * 30 / 10000 = 3 (odd)
    // fee_lp = 3 * 5000 / 10000 = 1; fee_protocol = 3 - 1 = 2 (== ceil(3/2))
    const pool = makePool({ feeBps: 30, reserveA: 1_000_000n, reserveB: 1_000_000n });
    const config = makeConfig({ lpFeeShareBps: 5000 });
    const out = quoteSwap({ pool, config, amountIn: 1_000n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quote.fees.feeTotal).toBe(3n);
    expect(out.quote.fees.feeLp).toBe(1n);
    expect(out.quote.fees.feeProtocol).toBe(2n);
  });
});

// QM-5
describe('quoteSwap — QM-5: OT treasury fee', () => {
  it('adds amount * 50 / 10000 when has_ot_treasury=true (input-RWT branch)', () => {
    const pool = makePool({
      feeBps: 30,
      hasOtTreasury: true,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    const out = quoteSwap({ pool, config, amountIn: 10_000n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // fee_ot_treasury = 10_000 * 50 / 10000 = 50
    expect(out.quote.fees.feeOtTreasury).toBe(50n);
    // net_input = 10_000 - 30 - 50 = 9_920
    expect(out.quote.netInput).toBe(9_920n);
  });

  it('adds amount * 50 / 10000 of GROSS OUT in output-RWT branch', () => {
    const pool = makePool({
      feeBps: 30,
      hasOtTreasury: true,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    // aToB=false → input is token_b (non-RWT) → output-RWT branch
    const out = quoteSwap({ pool, config, amountIn: 10_000n, aToB: false, rwtMint: RWT_MINT });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const grossOut = (1_000_000n * 10_000n) / (1_000_000n + 10_000n);
    // ot fee in output branch = grossOut * 50 / 10000
    expect(out.quote.fees.feeOtTreasury).toBe((grossOut * 50n) / 10_000n);
  });
});

// QM-6
describe('quoteSwap — QM-6: EmptyReserves (standard pool reserve_a=0)', () => {
  it('returns EmptyReserves when reserve_a==0', () => {
    const pool = makePool({ reserveA: 0n, reserveB: 1_000_000n });
    const config = makeConfig();
    const out = quoteSwap({ pool, config, amountIn: 1_000n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('EmptyReserves');
  });

  it('returns EmptyReserves when reserve_b==0', () => {
    const pool = makePool({ reserveA: 1_000_000n, reserveB: 0n });
    const config = makeConfig();
    const out = quoteSwap({ pool, config, amountIn: 1_000n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('EmptyReserves');
  });
});

// QM-7
describe('quoteSwap — QM-7: ZeroAmount', () => {
  it('returns ZeroAmount when amount_in == 0', () => {
    const pool = makePool();
    const config = makeConfig();
    const out = quoteSwap({ pool, config, amountIn: 0n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('ZeroAmount');
  });
});

// QM-8
describe('quoteSwap — QM-8: ZeroOutput (tiny amount vs huge reserve, fee eats output)', () => {
  it('returns ZeroOutput when fees consume the entire output (input-RWT)', () => {
    // amount=1, dust floor → fee=1, net_input=0 → out=0
    const pool = makePool({
      reserveA: 10n ** 18n,
      reserveB: 10n ** 18n,
      feeBps: 30,
    });
    const config = makeConfig();
    const out = quoteSwap({ pool, config, amountIn: 1n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('ZeroOutput');
  });

  it('returns ZeroOutput when gross_out rounds to zero on output-RWT branch', () => {
    // Output-RWT branch: input is non-RWT, output is RWT. Make reserveIn huge,
    // reserveOut tiny so the curve `(Rout * 1) / (Rin + 1)` rounds to zero.
    // Setup: tokenA=non-RWT, tokenB=RWT, aToB=true → reserveIn=reserveA, reserveOut=reserveB.
    const pool = makePool({
      tokenAMint: NON_RWT_MINT,
      tokenBMint: RWT_MINT,
      reserveA: 10n ** 18n, // reserveIn — huge
      reserveB: 1n, // reserveOut — tiny
      feeBps: 30,
    });
    const config = makeConfig();
    const out = quoteSwap({ pool, config, amountIn: 1n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('ZeroOutput');
  });
});

// QM-9
describe('quoteSwap — QM-9: DexPaused', () => {
  it('returns PoolPaused when config.is_active=false (mirrors DexError::DexPaused)', () => {
    const pool = makePool();
    const config = makeConfig({ isActive: false });
    const out = quoteSwap({ pool, config, amountIn: 1_000n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('PoolPaused');
  });
});

// QM-10
describe('quoteSwap — QM-10: PoolNotActive', () => {
  it('returns PoolNotActive when pool.is_active=false', () => {
    const pool = makePool({ isActive: false });
    const config = makeConfig();
    const out = quoteSwap({ pool, config, amountIn: 1_000n, aToB: true, rwtMint: RWT_MINT });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('PoolNotActive');
  });
});

// QM-11
describe('quoteSwap — QM-11: big-number parity (no JS Number coercion)', () => {
  it('handles amount_in = u64::MAX/4 against reserves = u64::MAX/2', () => {
    const u64Max = (1n << 64n) - 1n;
    const big = u64Max / 2n; // half of u64::MAX
    const amountIn = u64Max / 4n; // quarter of u64::MAX
    const pool = makePool({
      reserveA: big,
      reserveB: big,
      feeBps: 30,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    const out = quoteSwap({ pool, config, amountIn, aToB: true, rwtMint: RWT_MINT });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Recompute via the same bigint formula and assert exact match —
    // proves no Number coercion mid-calc.
    const feeTotal = (amountIn * 30n) / 10_000n;
    const feeLp = (feeTotal * 8000n) / 10_000n;
    const feeProtocol = feeTotal - feeLp;
    const netInput = amountIn - feeTotal; // no OT treasury
    const expected = (big * netInput) / (big + netInput);
    expect(out.quote.fees.feeTotal).toBe(feeTotal);
    expect(out.quote.fees.feeLp).toBe(feeLp);
    expect(out.quote.fees.feeProtocol).toBe(feeProtocol);
    expect(out.quote.amountOut).toBe(expected);
    // Sanity: result fits in u64.
    expect(out.quote.amountOut).toBeLessThanOrEqual(u64Max);
  });
});

// QM-12
describe('applySlippage — QM-12: applySlippage(1000n, 50) === 995n', () => {
  it('50 bps = 0.5% slippage off 1000 = 995', () => {
    expect(applySlippage(1_000n, 50)).toBe(995n);
  });
});

// QM-13
describe('applySlippage — QM-13: bounds', () => {
  it('slippage 0 returns expectedOut unchanged', () => {
    expect(applySlippage(12_345n, 0)).toBe(12_345n);
  });

  it('slippage 5000 (50%) returns expectedOut / 2', () => {
    expect(applySlippage(1_000n, 5000)).toBe(500n);
    expect(applySlippage(12_345n, 5000)).toBe(6_172n); // 12345 / 2 truncated
  });

  it('throws on slippageBps > 5000', () => {
    expect(() => applySlippage(1_000n, 5001)).toThrow(/in \[0, 5000\]/);
  });

  it('throws on negative slippageBps', () => {
    expect(() => applySlippage(1_000n, -1)).toThrow(/in \[0, 5000\]/);
  });

  it('throws on non-integer slippageBps', () => {
    expect(() => applySlippage(1_000n, 12.5)).toThrow(/in \[0, 5000\]/);
  });

  it('throws on negative expectedOut', () => {
    expect(() => applySlippage(-1n, 50)).toThrow(/expectedOut/);
  });
});

// QM-15
describe('quoteSwap — QM-15: mainnet placeholder guard', () => {
  it('returns MainnetNotDeployed when cluster=mainnet and rwtMint is the R20 placeholder', () => {
    // RWT_MINT here equals the R20 placeholder bytes pinned in
    // `src/network/constants.ts`. Mirrors the invariant enforced by
    // `buildSwapTx` so quotes cannot mis-detect inputIsRwt during the
    // pre-mainnet placeholder window.
    const pool = makePool({
      tokenAMint: RWT_MINT,
      tokenBMint: NON_RWT_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      feeBps: 30,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    const out = quoteSwap({
      pool,
      config,
      amountIn: 10_000n,
      aToB: true,
      rwtMint: RWT_MINT,
      cluster: 'mainnet',
    });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe('MainnetNotDeployed');
  });

  it('proceeds normally when cluster=mainnet and rwtMint is a real mint (non-placeholder)', () => {
    // A real mainnet RWT mint is just a non-placeholder PublicKey — quote
    // path runs identically to the no-cluster case.
    const realMainnetRwt = Keypair.generate().publicKey;
    const pool = makePool({
      tokenAMint: realMainnetRwt,
      tokenBMint: NON_RWT_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      feeBps: 30,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    const out = quoteSwap({
      pool,
      config,
      amountIn: 10_000n,
      aToB: true,
      rwtMint: realMainnetRwt,
      cluster: 'mainnet',
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Same numerics as QM-1 — the guard is a pure short-circuit, the math
    // path is unchanged.
    expect(out.quote.fees.feeTotal).toBe(30n);
    expect(out.quote.netInput).toBe(9_970n);
    const expected = (1_000_000n * 9_970n) / (1_000_000n + 9_970n);
    expect(out.quote.amountOut).toBe(expected);
  });
});

// QM-14
describe('quoteSwap — QM-14: side-B RWT (aToB=false, token_b is RWT)', () => {
  it('input_is_rwt=true when token_b is RWT and aToB=false (selling RWT)', () => {
    const pool = makePool({
      tokenAMint: NON_RWT_MINT,
      tokenBMint: RWT_MINT,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      feeBps: 30,
    });
    const config = makeConfig({ lpFeeShareBps: 8000 });
    // aToB=false → input is token_b (RWT). Should hit input-side fee branch.
    const out = quoteSwap({ pool, config, amountIn: 10_000n, aToB: false, rwtMint: RWT_MINT });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Identical numbers to QM-1 since reserves match and direction is symmetric.
    expect(out.quote.fees.feeTotal).toBe(30n);
    expect(out.quote.netInput).toBe(9_970n);
    const expected = (1_000_000n * 9_970n) / (1_000_000n + 9_970n);
    expect(out.quote.amountOut).toBe(expected);
    // Reserves: input side is B (gains netInput), output side is A (loses amountOut).
    expect(out.quote.reserveInBefore).toBe(1_000_000n);
    expect(out.quote.reserveOutBefore).toBe(1_000_000n);
  });
});
