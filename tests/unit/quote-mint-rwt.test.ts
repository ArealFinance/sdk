// Unit tests for `sdk/src/programs/rwt-engine/quote.ts`.
//
// 14 cases (QM-1 through QM-14) — pin every branch of the on-chain
// `mint_rwt::handler` math against the source-of-truth contract in
// `contracts/rwt-engine/src/instructions/mint_rwt.rs` plus the NAV
// guards in `contracts/rwt-engine/src/nav.rs`. Cases use parsed
// `RwtVault` fixtures (built directly as JS objects, not raw bytes)
// because `quoteMintRwt` consumes the parsed shape — the codegen
// parser is exercised separately by the e2e suite.

import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  applyMintSlippage,
  quoteMintRwt,
  type QuoteMintRwtArgs,
} from '../../src/programs/rwt-engine/quote.js';

const RWT_PLACEHOLDER = new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4');
const NON_PLACEHOLDER = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

interface VaultOverrides {
  totalInvestedCapital?: bigint;
  totalRwtSupply?: bigint;
  mintPaused?: boolean;
}

/**
 * Minimal RwtVault fixture covering the three fields `quoteMintRwt`
 * actually reads. Built directly (not via `parseRwtVault`) — the
 * helper takes a `Pick<RwtVault, ...>` so the rest of the parsed
 * struct is irrelevant to the math under test.
 */
function makeVault(o: VaultOverrides = {}): QuoteMintRwtArgs['vault'] {
  return {
    totalInvestedCapital: o.totalInvestedCapital ?? 0n,
    totalRwtSupply: o.totalRwtSupply ?? 0n,
    mintPaused: o.mintPaused ?? false,
  };
}

const NAV_SCALE = 1_000_000n;
const U64_MAX = (1n << 64n) - 1n;

// ─────────────────────────── happy paths ──────────────────────────────────

// QM-1
describe('quoteMintRwt — QM-1: bootstrap mint (supply=0, capital=0)', () => {
  it('uses INITIAL_NAV ($1.00) and returns rwt_out = net_deposit', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({ vault, amountIn: 100_000_000n });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // fee_total = 100_000_000 * 100 / 10_000 = 1_000_000
    expect(out.quote.fees.feeTotal).toBe(1_000_000n);
    expect(out.quote.fees.feeDao).toBe(500_000n);
    expect(out.quote.fees.feeVault).toBe(500_000n);
    expect(out.quote.netDeposit).toBe(99_000_000n);
    expect(out.quote.fees.netDeposit).toBe(99_000_000n);
    // nav = INITIAL_NAV = 1_000_000 (supply==0 branch)
    expect(out.quote.navAtQuote).toBe(NAV_SCALE);
    // rwt_out = 99_000_000 * 1_000_000 / 1_000_000 = 99_000_000
    expect(out.quote.rwtOut).toBe(99_000_000n);
    // capital_after = 0 + 99_000_000 + 500_000 = 99_500_000
    expect(out.quote.capitalAfter).toBe(99_500_000n);
    // supply_after = 99_000_000
    expect(out.quote.supplyAfter).toBe(99_000_000n);
    // nav_after = 99_500_000 * 1_000_000 / 99_000_000 ≈ 1_005_050
    expect(out.quote.navAfter).toBe(1_005_050n);
  });
});

// QM-2
describe('quoteMintRwt — QM-2: NAV=$1.00 identity (supply=capital=1_000_000)', () => {
  it('rwt_out equals net_deposit when nav == NAV_SCALE', () => {
    const vault = makeVault({
      totalInvestedCapital: 1_000_000n,
      totalRwtSupply: 1_000_000n,
    });
    const out = quoteMintRwt({ vault, amountIn: 1_000_000n });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quote.navAtQuote).toBe(NAV_SCALE);
    expect(out.quote.fees.feeTotal).toBe(10_000n);
    expect(out.quote.fees.feeDao).toBe(5_000n);
    expect(out.quote.fees.feeVault).toBe(5_000n);
    expect(out.quote.netDeposit).toBe(990_000n);
    // rwt_out = 990_000 * 1_000_000 / 1_000_000 = 990_000
    expect(out.quote.rwtOut).toBe(990_000n);
  });
});

// QM-3
describe('quoteMintRwt — QM-3: NAV=$2.00 (yield accrued, capital doubled)', () => {
  it('rwt_out halves vs identity NAV', () => {
    const vault = makeVault({
      totalInvestedCapital: 2_000_000n,
      totalRwtSupply: 1_000_000n,
    });
    const out = quoteMintRwt({ vault, amountIn: 1_000_000n });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quote.navAtQuote).toBe(2n * NAV_SCALE);
    // rwt_out = 990_000 * 1_000_000 / 2_000_000 = 495_000
    expect(out.quote.rwtOut).toBe(495_000n);
    // capital_after = 2_000_000 + 990_000 + 5_000 = 2_995_000
    expect(out.quote.capitalAfter).toBe(2_995_000n);
    // supply_after = 1_000_000 + 495_000 = 1_495_000
    expect(out.quote.supplyAfter).toBe(1_495_000n);
    // nav_after = 2_995_000 * 1_000_000 / 1_495_000 = 2_003_344 (floor div)
    expect(out.quote.navAfter).toBe(2_003_344n);
  });
});

// QM-4
describe('quoteMintRwt — QM-4: at MIN_MINT_AMOUNT exactly', () => {
  it('amount=1_000_000 succeeds via bootstrap (supply=0)', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({ vault, amountIn: 1_000_000n });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quote.fees.feeTotal).toBe(10_000n);
    expect(out.quote.netDeposit).toBe(990_000n);
    expect(out.quote.rwtOut).toBe(990_000n);
  });
});

// QM-5
describe('quoteMintRwt — QM-5: NAV clamp boundary (raw nav truncates to 0)', () => {
  it('clamps NAV to 1 when capital * NAV_SCALE / supply == 0', () => {
    // capital=1, supply=NAV_SCALE+1 → raw nav = 1_000_000 / 1_000_001 = 0
    // → clamped to 1. rwt_out = 990_000 * 1_000_000 / 1 = 990_000_000_000
    // (fits in u64 — u64::MAX is ~1.84e19 vs 9.9e11 here).
    const vault = makeVault({
      totalInvestedCapital: 1n,
      totalRwtSupply: 1_000_001n,
    });
    const out = quoteMintRwt({ vault, amountIn: 1_000_000n });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quote.navAtQuote).toBe(1n);
    expect(out.quote.rwtOut).toBe(990_000_000_000n);
  });
});

// QM-6
describe('quoteMintRwt — QM-6: capitalAfter math = capital + netDeposit + feeVault', () => {
  it('vault-side fee accrues to invested capital (yield)', () => {
    const vault = makeVault({
      totalInvestedCapital: 5_000_000n,
      totalRwtSupply: 4_000_000n,
    });
    const out = quoteMintRwt({ vault, amountIn: 2_000_000n });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // fee_total = 20_000; fee_dao = 10_000; fee_vault = 10_000
    // net = 1_980_000; capitalAfter = 5_000_000 + 1_980_000 + 10_000 = 6_990_000
    expect(out.quote.fees.feeTotal).toBe(20_000n);
    expect(out.quote.fees.feeDao).toBe(10_000n);
    expect(out.quote.fees.feeVault).toBe(10_000n);
    expect(out.quote.netDeposit).toBe(1_980_000n);
    expect(out.quote.capitalAfter).toBe(6_990_000n);
  });
});

// QM-7
describe('quoteMintRwt — QM-7: supplyAfter math = supply + rwtOut', () => {
  it('rwtOut adds directly to supply', () => {
    const vault = makeVault({
      totalInvestedCapital: 1_000_000n,
      totalRwtSupply: 1_000_000n,
    });
    const out = quoteMintRwt({ vault, amountIn: 1_000_000n });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.quote.supplyAfter).toBe(out.quote.rwtOut + 1_000_000n);
    expect(out.quote.supplyAfter).toBe(1_990_000n);
  });
});

// ─────────────────────────── error paths ──────────────────────────────────

// QM-8
describe('quoteMintRwt — QM-8: BelowMinMint (amount < 1_000_000)', () => {
  it('rejects amount=999_999', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({ vault, amountIn: 999_999n });
    expect(out).toEqual({ ok: false, error: 'BelowMinMint' });
  });
});

// QM-9
describe('quoteMintRwt — QM-9: ZeroAmount', () => {
  it('rejects amount=0', () => {
    const vault = makeVault();
    const out = quoteMintRwt({ vault, amountIn: 0n });
    expect(out).toEqual({ ok: false, error: 'ZeroAmount' });
  });
});

// QM-10
describe('quoteMintRwt — QM-10: MintPaused', () => {
  it('rejects when vault.mintPaused == true', () => {
    const vault = makeVault({ mintPaused: true });
    const out = quoteMintRwt({ vault, amountIn: 100_000_000n });
    expect(out).toEqual({ ok: false, error: 'MintPaused' });
  });

  it('pause check fires BEFORE ZeroAmount check', () => {
    // Order matters — contract checks mint_paused first.
    const vault = makeVault({ mintPaused: true });
    const out = quoteMintRwt({ vault, amountIn: 0n });
    expect(out).toEqual({ ok: false, error: 'MintPaused' });
  });
});

// QM-11
describe('quoteMintRwt — QM-11: MainnetNotDeployed (placeholder rwtMint guard)', () => {
  it('cluster=mainnet + placeholder rwtMint → MainnetNotDeployed', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({
      vault,
      amountIn: 100_000_000n,
      cluster: 'mainnet',
      rwtMint: RWT_PLACEHOLDER,
    });
    expect(out).toEqual({ ok: false, error: 'MainnetNotDeployed' });
  });

  it('cluster=mainnet + non-placeholder rwtMint → succeeds', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({
      vault,
      amountIn: 100_000_000n,
      cluster: 'mainnet',
      rwtMint: NON_PLACEHOLDER,
    });
    expect(out.ok).toBe(true);
  });

  it('cluster=devnet + placeholder rwtMint → succeeds (placeholder expected)', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({
      vault,
      amountIn: 100_000_000n,
      cluster: 'devnet',
      rwtMint: RWT_PLACEHOLDER,
    });
    expect(out.ok).toBe(true);
  });

  it('cluster omitted + placeholder rwtMint → succeeds (no guard)', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({
      vault,
      amountIn: 100_000_000n,
      rwtMint: RWT_PLACEHOLDER,
    });
    expect(out.ok).toBe(true);
  });
});

// QM-12
describe('quoteMintRwt — QM-12: MathOverflow on rwt_out > u64::MAX', () => {
  it('extreme NAV-clamp ratio with large amount overflows', () => {
    // capital=1, supply=NAV_SCALE+1 → nav=1 (clamped). With a huge
    // amount, rwt_out_wide overflows u64 (1.84e19).
    const vault = makeVault({
      totalInvestedCapital: 1n,
      totalRwtSupply: 1_000_001n,
    });
    // amount = u64::MAX → net_deposit ≈ 1.825e19, rwt_out ≈ 1.825e25 → overflow
    const out = quoteMintRwt({ vault, amountIn: U64_MAX });
    expect(out).toEqual({ ok: false, error: 'MathOverflow' });
  });

  it('amount > u64::MAX rejected directly', () => {
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    const out = quoteMintRwt({ vault, amountIn: U64_MAX + 1n });
    expect(out).toEqual({ ok: false, error: 'MathOverflow' });
  });
});

// QM-13: property — feeDao + feeVault == feeTotal AND feeVault >= feeDao
describe('quoteMintRwt — QM-13: fee remainder property', () => {
  it('feeDao + feeVault == feeTotal across 1000 random valid amounts', () => {
    // Random but reproducible (no PRNG seeding — use deterministic values).
    const vault = makeVault({ totalInvestedCapital: 0n, totalRwtSupply: 0n });
    for (let i = 0; i < 1000; i++) {
      // Sweep amounts above MIN_MINT_AMOUNT in a range that always
      // produces a valid quote against bootstrap state.
      const amount = 1_000_000n + BigInt(i) * 7n + BigInt(i * 31);
      const out = quoteMintRwt({ vault, amountIn: amount });
      expect(out.ok).toBe(true);
      if (!out.ok) continue;
      const { feeTotal, feeDao, feeVault } = out.quote.fees;
      // Conservation: dao + vault == total (no leakage).
      expect(feeDao + feeVault).toBe(feeTotal);
      // Vault gets the rounding remainder, so vault >= dao always.
      expect(feeVault >= feeDao).toBe(true);
      // Vault and dao are each at most ceil(total/2).
      expect(feeVault - feeDao).toBeLessThanOrEqual(1n);
    }
  });
});

// QM-14: applyMintSlippage smoke — re-export passthrough check.
describe('quoteMintRwt — QM-14: applyMintSlippage (re-exported helper)', () => {
  it('applies slippage tolerance correctly', () => {
    // 50 bps = 0.5% slippage on 1_000_000 → 995_000
    expect(applyMintSlippage(1_000_000n, 50)).toBe(995_000n);
    // 0 bps = no slippage
    expect(applyMintSlippage(1_000_000n, 0)).toBe(1_000_000n);
    // 100 bps = 1% slippage on 990_000 → 980_100
    expect(applyMintSlippage(990_000n, 100)).toBe(980_100n);
  });

  it('throws on out-of-range slippageBps', () => {
    expect(() => applyMintSlippage(1n, -1)).toThrow();
    expect(() => applyMintSlippage(1n, 5001)).toThrow();
    expect(() => applyMintSlippage(1n, 1.5)).toThrow();
  });
});

// Sanity — `_` Keypair import not needed; suppress lint warning by using it.
void Keypair;
