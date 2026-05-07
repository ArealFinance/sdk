// Unit tests for the four user-signed LP tx-builders in
// `sdk/src/tx/native-dex/`:
//   - add-liquidity.ts        (BAL-*)
//   - zap-liquidity.ts        (BZL-*)
//   - remove-liquidity.ts     (BRL-*)
//   - claim-lp-fees.ts        (BCLF-*)
//
// Each section verifies:
//   1. Account list byte-for-byte parity with the contract handler.
//   2. Discriminator + arg encoding via codegen.
//   3. Range checks (zero, u64::MAX boundaries).
//   4. Tx-level wrappers — mainnet placeholder guard and ATA prepend
//      where applicable.

import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  buildAddLiquidityIx,
  buildAddLiquidityTx,
  type AddLiquidityAccountContext,
} from '../../src/tx/native-dex/add-liquidity.js';
import {
  buildZapLiquidityIx,
  buildZapLiquidityTx,
  type ZapLiquidityAccountContext,
} from '../../src/tx/native-dex/zap-liquidity.js';
import {
  buildRemoveLiquidityIx,
  buildRemoveLiquidityTx,
  type RemoveLiquidityAccountContext,
} from '../../src/tx/native-dex/remove-liquidity.js';
import {
  buildClaimLpFeesIx,
  buildClaimLpFeesTx,
  type ClaimLpFeesAccountContext,
} from '../../src/tx/native-dex/claim-lp-fees.js';
import {
  ADD_LIQUIDITY_DISCRIMINATOR,
  CLAIM_LP_FEES_DISCRIMINATOR,
  REMOVE_LIQUIDITY_DISCRIMINATOR,
  ZAP_LIQUIDITY_DISCRIMINATOR,
} from '../../src/programs/native-dex/instructions.generated.js';
import {
  RWT_MINTS,
  SPL_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
} from '../../src/network/constants.js';
import { NATIVE_DEX_PROGRAM_ID } from '../../src/network/program-ids.js';

const k = () => Keypair.generate().publicKey;

function makeMockConn(opts: { ataExists: boolean | boolean[] }) {
  // When `ataExists` is a single boolean, every getAccountInfo returns
  // the same shape. When it is an array, calls are answered in order
  // (used for the "ATA-A missing, ATA-B present" cases).
  let callIdx = 0;
  const conn = {
    getAccountInfo: vi.fn(async (_key: PublicKey) => {
      const exists = Array.isArray(opts.ataExists)
        ? opts.ataExists[callIdx++]!
        : opts.ataExists;
      return exists
        ? {
            data: Buffer.alloc(0),
            executable: false,
            lamports: 1,
            owner: SPL_TOKEN_PROGRAM_ID,
            rentEpoch: 0,
          }
        : null;
    }),
  };
  return conn;
}

function readU128LE(buf: Buffer, off: number): bigint {
  // bigint reconstruction without DataView — keeps the test deterministic.
  let val = 0n;
  for (let i = 0; i < 16; i++) {
    val |= BigInt(buf[off + i]!) << BigInt(i * 8);
  }
  return val;
}

// ─────────────────────────── add_liquidity ────────────────────────────────

function makeAddCtx(
  overrides: Partial<AddLiquidityAccountContext> = {},
): AddLiquidityAccountContext {
  return {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    provider: k(),
    pool: k(),
    lpPosition: k(),
    providerTokenA: k(),
    providerTokenB: k(),
    vaultA: k(),
    vaultB: k(),
    dexConfig: k(),
    ...overrides,
  };
}

describe('buildAddLiquidityIx', () => {
  // BAL-1
  it('account list: 11 keys in exact order with correct signer/writable flags', () => {
    const ctx = makeAddCtx();
    const ix = buildAddLiquidityIx({
      ctx,
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
    });

    expect(ix.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(11);

    // 0: provider — signer, !writable
    expect(ix.keys[0]!.pubkey.equals(ctx.provider)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);

    // 1: payer — signer, writable; defaults to provider
    expect(ix.keys[1]!.pubkey.equals(ctx.provider)).toBe(true);
    expect(ix.keys[1]!.isSigner).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(true);

    // 2: dex_config — read
    expect(ix.keys[2]!.pubkey.equals(ctx.dexConfig)).toBe(true);
    expect(ix.keys[2]!.isWritable).toBe(false);

    // 3: pool_state — writable
    expect(ix.keys[3]!.pubkey.equals(ctx.pool)).toBe(true);
    expect(ix.keys[3]!.isWritable).toBe(true);

    // 4: lp_position — writable
    expect(ix.keys[4]!.pubkey.equals(ctx.lpPosition)).toBe(true);
    expect(ix.keys[4]!.isWritable).toBe(true);

    // 5/6: provider_token_a/b — writable
    expect(ix.keys[5]!.pubkey.equals(ctx.providerTokenA)).toBe(true);
    expect(ix.keys[5]!.isWritable).toBe(true);
    expect(ix.keys[6]!.pubkey.equals(ctx.providerTokenB)).toBe(true);
    expect(ix.keys[6]!.isWritable).toBe(true);

    // 7/8: vault_a/b — writable
    expect(ix.keys[7]!.pubkey.equals(ctx.vaultA)).toBe(true);
    expect(ix.keys[7]!.isWritable).toBe(true);
    expect(ix.keys[8]!.pubkey.equals(ctx.vaultB)).toBe(true);
    expect(ix.keys[8]!.isWritable).toBe(true);

    // 9: token_program
    expect(ix.keys[9]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[9]!.isWritable).toBe(false);

    // 10: system_program
    expect(ix.keys[10]!.pubkey.equals(SYSTEM_PROGRAM_ID)).toBe(true);
    expect(ix.keys[10]!.isWritable).toBe(false);
  });

  // BAL-2
  it('payer override: distinct payer pubkey is used at slot 1, provider at slot 0', () => {
    const provider = k();
    const sponsor = k();
    const ctx = makeAddCtx({ provider, payer: sponsor });
    const ix = buildAddLiquidityIx({
      ctx,
      amountA: 1n,
      amountB: 1n,
      minShares: 0n,
    });
    expect(ix.keys[0]!.pubkey.equals(provider)).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);
    expect(ix.keys[1]!.pubkey.equals(sponsor)).toBe(true);
    expect(ix.keys[1]!.isSigner).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(true);
  });

  // BAL-3
  it('discriminator + LE u64 amount_a + LE u64 amount_b + LE u128 min_shares', () => {
    const ix = buildAddLiquidityIx({
      ctx: makeAddCtx(),
      amountA: 1_234_567n,
      amountB: 7_654_321n,
      minShares: (1n << 80n) + 999n, // exercises the upper u128 bytes
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 8 + 8 + 16);

    expect(data.subarray(0, 8).equals(Buffer.from(ADD_LIQUIDITY_DISCRIMINATOR))).toBe(
      true,
    );
    expect(data.readBigUInt64LE(8)).toBe(1_234_567n);
    expect(data.readBigUInt64LE(16)).toBe(7_654_321n);
    expect(readU128LE(data, 24)).toBe((1n << 80n) + 999n);
  });

  // BAL-4: range checks
  it('throws when amount_a == 0', () => {
    expect(() =>
      buildAddLiquidityIx({
        ctx: makeAddCtx(),
        amountA: 0n,
        amountB: 1n,
        minShares: 0n,
      }),
    ).toThrow(/amount_a/);
  });

  it('throws when amount_b == 0', () => {
    expect(() =>
      buildAddLiquidityIx({
        ctx: makeAddCtx(),
        amountA: 1n,
        amountB: 0n,
        minShares: 0n,
      }),
    ).toThrow(/amount_b/);
  });

  it('throws when amount_a > u64::MAX', () => {
    expect(() =>
      buildAddLiquidityIx({
        ctx: makeAddCtx(),
        amountA: 1n << 64n,
        amountB: 1n,
        minShares: 0n,
      }),
    ).toThrow(/u64::MAX/);
  });

  it('throws when min_shares < 0', () => {
    expect(() =>
      buildAddLiquidityIx({
        ctx: makeAddCtx(),
        amountA: 1n,
        amountB: 1n,
        minShares: -1n,
      }),
    ).toThrow(/min_shares/);
  });

  it('throws when min_shares > u128::MAX', () => {
    expect(() =>
      buildAddLiquidityIx({
        ctx: makeAddCtx(),
        amountA: 1n,
        amountB: 1n,
        minShares: 1n << 128n,
      }),
    ).toThrow(/u128::MAX/);
  });
});

describe('buildAddLiquidityTx', () => {
  it('cluster=mainnet + placeholder rwtMint → throws', async () => {
    const conn = makeMockConn({ ataExists: true });
    await expect(
      buildAddLiquidityTx({
        connection: conn as any,
        ctx: makeAddCtx(),
        amountA: 1_000n,
        amountB: 1_000n,
        minShares: 0n,
        cluster: 'mainnet',
        rwtMint: RWT_MINTS.mainnet,
      }),
    ).rejects.toThrow(/placeholder; mainnet RWT mint not yet deployed/);
  });

  it('cluster=devnet + placeholder rwtMint → does NOT throw', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildAddLiquidityTx({
      connection: conn as any,
      ctx: makeAddCtx(),
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
      cluster: 'devnet',
      rwtMint: RWT_MINTS.devnet,
    });
    expect(tx.instructions.length).toBe(1);
  });

  it('ensureProviderAtas=true + both missing → 3 ix (createATA*2 prepended)', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildAddLiquidityTx({
      connection: conn as any,
      ctx: makeAddCtx(),
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
      ensureProviderAtas: true,
      tokenAMint: k(),
      tokenBMint: k(),
    });
    expect(tx.instructions.length).toBe(3);
    expect(tx.instructions[0]!.programId.toBase58()).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );
    expect(tx.instructions[1]!.programId.toBase58()).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );
    expect(tx.instructions[2]!.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(conn.getAccountInfo).toHaveBeenCalledTimes(2);
  });

  it('ensureProviderAtas=true + only A missing → 2 ix (createATA-A + add_liquidity)', async () => {
    const conn = makeMockConn({ ataExists: [false, true] });
    const tx = await buildAddLiquidityTx({
      connection: conn as any,
      ctx: makeAddCtx(),
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
      ensureProviderAtas: true,
      tokenAMint: k(),
      tokenBMint: k(),
    });
    expect(tx.instructions.length).toBe(2);
    expect(tx.instructions[0]!.programId.toBase58()).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );
    expect(tx.instructions[1]!.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
  });

  it('ensureProviderAtas=true + both present → 1 ix (just add_liquidity)', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildAddLiquidityTx({
      connection: conn as any,
      ctx: makeAddCtx(),
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
      ensureProviderAtas: true,
      tokenAMint: k(),
      tokenBMint: k(),
    });
    expect(tx.instructions.length).toBe(1);
  });

  it('ensureProviderAtas=true without mints → throws', async () => {
    const conn = makeMockConn({ ataExists: false });
    await expect(
      buildAddLiquidityTx({
        connection: conn as any,
        ctx: makeAddCtx(),
        amountA: 1_000n,
        amountB: 1_000n,
        minShares: 0n,
        ensureProviderAtas: true,
      }),
    ).rejects.toThrow(/tokenAMint and tokenBMint/);
  });

  it('ensureProviderAtas omitted → never reads ATA, single ix', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildAddLiquidityTx({
      connection: conn as any,
      ctx: makeAddCtx(),
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
    });
    expect(tx.instructions.length).toBe(1);
    expect(conn.getAccountInfo).not.toHaveBeenCalled();
  });
});

// ─────────────────────────── zap_liquidity ────────────────────────────────

function makeZapCtx(
  overrides: Partial<ZapLiquidityAccountContext> = {},
): ZapLiquidityAccountContext {
  return {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    provider: k(),
    pool: k(),
    lpPosition: k(),
    providerTokenA: k(),
    providerTokenB: k(),
    vaultA: k(),
    vaultB: k(),
    dexConfig: k(),
    arealFeeAccount: k(),
    ...overrides,
  };
}

describe('buildZapLiquidityIx', () => {
  // BZL-1
  it('account list: 12 keys in exact order without OT treasury', () => {
    const ctx = makeZapCtx();
    const ix = buildZapLiquidityIx({
      ctx,
      amountA: 1n,
      amountB: 1n,
      minShares: 0n,
    });

    expect(ix.keys.length).toBe(12);

    expect(ix.keys[0]!.pubkey.equals(ctx.provider)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);

    expect(ix.keys[1]!.pubkey.equals(ctx.provider)).toBe(true); // payer defaults
    expect(ix.keys[1]!.isWritable).toBe(true);

    expect(ix.keys[2]!.pubkey.equals(ctx.dexConfig)).toBe(true);
    expect(ix.keys[3]!.pubkey.equals(ctx.pool)).toBe(true);
    expect(ix.keys[4]!.pubkey.equals(ctx.lpPosition)).toBe(true);
    expect(ix.keys[5]!.pubkey.equals(ctx.providerTokenA)).toBe(true);
    expect(ix.keys[6]!.pubkey.equals(ctx.providerTokenB)).toBe(true);
    expect(ix.keys[7]!.pubkey.equals(ctx.vaultA)).toBe(true);
    expect(ix.keys[8]!.pubkey.equals(ctx.vaultB)).toBe(true);

    // 9: areal_fee_account — writable
    expect(ix.keys[9]!.pubkey.equals(ctx.arealFeeAccount)).toBe(true);
    expect(ix.keys[9]!.isWritable).toBe(true);

    // 10: token_program
    expect(ix.keys[10]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    // 11: system_program
    expect(ix.keys[11]!.pubkey.equals(SYSTEM_PROGRAM_ID)).toBe(true);
  });

  // BZL-2
  it('OT treasury appended at index 12 (writable) when provided', () => {
    const otAccount = k();
    const ctx = makeZapCtx({ otTreasuryFeeDestination: otAccount });
    const ix = buildZapLiquidityIx({
      ctx,
      amountA: 1n,
      amountB: 1n,
      minShares: 0n,
    });
    expect(ix.keys.length).toBe(13);
    expect(ix.keys[12]!.pubkey.equals(otAccount)).toBe(true);
    expect(ix.keys[12]!.isSigner).toBe(false);
    expect(ix.keys[12]!.isWritable).toBe(true);
  });

  // BZL-3
  it('discriminator + LE u64 amount_a + LE u64 amount_b + LE u128 min_shares', () => {
    const ix = buildZapLiquidityIx({
      ctx: makeZapCtx(),
      amountA: 100n,
      amountB: 200n,
      minShares: 12345n,
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 8 + 8 + 16);
    expect(data.subarray(0, 8).equals(Buffer.from(ZAP_LIQUIDITY_DISCRIMINATOR))).toBe(
      true,
    );
    expect(data.readBigUInt64LE(8)).toBe(100n);
    expect(data.readBigUInt64LE(16)).toBe(200n);
    expect(readU128LE(data, 24)).toBe(12345n);
  });

  it('throws when amount_a == 0', () => {
    expect(() =>
      buildZapLiquidityIx({
        ctx: makeZapCtx(),
        amountA: 0n,
        amountB: 1n,
        minShares: 0n,
      }),
    ).toThrow(/amount_a/);
  });

  it('throws when amount_b > u64::MAX', () => {
    expect(() =>
      buildZapLiquidityIx({
        ctx: makeZapCtx(),
        amountA: 1n,
        amountB: 1n << 64n,
        minShares: 0n,
      }),
    ).toThrow(/u64::MAX/);
  });

  it('throws when min_shares > u128::MAX', () => {
    expect(() =>
      buildZapLiquidityIx({
        ctx: makeZapCtx(),
        amountA: 1n,
        amountB: 1n,
        minShares: 1n << 128n,
      }),
    ).toThrow(/u128::MAX/);
  });
});

describe('buildZapLiquidityTx', () => {
  it('cluster=mainnet + placeholder rwtMint → throws', async () => {
    const conn = makeMockConn({ ataExists: true });
    await expect(
      buildZapLiquidityTx({
        connection: conn as any,
        ctx: makeZapCtx(),
        amountA: 1_000n,
        amountB: 1_000n,
        minShares: 0n,
        cluster: 'mainnet',
        rwtMint: RWT_MINTS.mainnet,
      }),
    ).rejects.toThrow(/placeholder; mainnet RWT mint not yet deployed/);
  });

  it('ensureProviderAtas=true + both present → 1 ix', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildZapLiquidityTx({
      connection: conn as any,
      ctx: makeZapCtx(),
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
      ensureProviderAtas: true,
      tokenAMint: k(),
      tokenBMint: k(),
    });
    expect(tx.instructions.length).toBe(1);
  });

  it('OT treasury appended in tx flow when provided', async () => {
    const conn = makeMockConn({ ataExists: true });
    const otAccount = k();
    const tx = await buildZapLiquidityTx({
      connection: conn as any,
      ctx: makeZapCtx({ otTreasuryFeeDestination: otAccount }),
      amountA: 1_000n,
      amountB: 1_000n,
      minShares: 0n,
    });
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.keys.length).toBe(13);
    expect(tx.instructions[0]!.keys[12]!.pubkey.equals(otAccount)).toBe(true);
  });
});

// ────────────────────────── remove_liquidity ──────────────────────────────

function makeRemoveCtx(
  overrides: Partial<RemoveLiquidityAccountContext> = {},
): RemoveLiquidityAccountContext {
  return {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    provider: k(),
    pool: k(),
    lpPosition: k(),
    providerTokenA: k(),
    providerTokenB: k(),
    vaultA: k(),
    vaultB: k(),
    ...overrides,
  };
}

describe('buildRemoveLiquidityIx', () => {
  // BRL-1
  it('account list: 8 keys in exact order; NO dex_config / system_program / payer', () => {
    const ctx = makeRemoveCtx();
    const ix = buildRemoveLiquidityIx({ ctx, sharesToBurn: 100n });

    expect(ix.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(8);

    // 0: provider — signer, !writable
    expect(ix.keys[0]!.pubkey.equals(ctx.provider)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);

    // 1: pool_state — writable
    expect(ix.keys[1]!.pubkey.equals(ctx.pool)).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(true);

    // 2: lp_position
    expect(ix.keys[2]!.pubkey.equals(ctx.lpPosition)).toBe(true);
    expect(ix.keys[2]!.isWritable).toBe(true);

    // 3/4: provider_token_a/b
    expect(ix.keys[3]!.pubkey.equals(ctx.providerTokenA)).toBe(true);
    expect(ix.keys[4]!.pubkey.equals(ctx.providerTokenB)).toBe(true);

    // 5/6: vault_a/b
    expect(ix.keys[5]!.pubkey.equals(ctx.vaultA)).toBe(true);
    expect(ix.keys[6]!.pubkey.equals(ctx.vaultB)).toBe(true);

    // 7: token_program (NO system_program after this — only 8 keys)
    expect(ix.keys[7]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[7]!.isWritable).toBe(false);
  });

  // BRL-2
  it('discriminator + LE u128 shares_to_burn', () => {
    const ix = buildRemoveLiquidityIx({
      ctx: makeRemoveCtx(),
      sharesToBurn: (1n << 100n) + 7n,
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 16);
    expect(
      data.subarray(0, 8).equals(Buffer.from(REMOVE_LIQUIDITY_DISCRIMINATOR)),
    ).toBe(true);
    expect(readU128LE(data, 8)).toBe((1n << 100n) + 7n);
  });

  // BRL-3: range checks
  it('throws when shares_to_burn == 0', () => {
    expect(() =>
      buildRemoveLiquidityIx({ ctx: makeRemoveCtx(), sharesToBurn: 0n }),
    ).toThrow(/shares_to_burn/);
  });

  it('throws when shares_to_burn < 0', () => {
    expect(() =>
      buildRemoveLiquidityIx({ ctx: makeRemoveCtx(), sharesToBurn: -1n }),
    ).toThrow(/shares_to_burn/);
  });

  it('throws when shares_to_burn > u128::MAX', () => {
    expect(() =>
      buildRemoveLiquidityIx({
        ctx: makeRemoveCtx(),
        sharesToBurn: 1n << 128n,
      }),
    ).toThrow(/u128::MAX/);
  });
});

describe('buildRemoveLiquidityTx', () => {
  it('returns 1-ix tx wrapping the pure builder', async () => {
    const tx = await buildRemoveLiquidityTx({
      ctx: makeRemoveCtx(),
      sharesToBurn: 1_000n,
    });
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.keys.length).toBe(8);
  });
});

// ────────────────────────── claim_lp_fees ──────────────────────────────

function makeClaimCtx(
  overrides: Partial<ClaimLpFeesAccountContext> = {},
): ClaimLpFeesAccountContext {
  return {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    recipient: k(),
    pool: k(),
    lpPosition: k(),
    poolVaultA: k(),
    poolVaultB: k(),
    recipientTokenA: k(),
    recipientTokenB: k(),
    ...overrides,
  };
}

describe('buildClaimLpFeesIx', () => {
  // BCLF-1
  it('account list: 8 keys in exact order; recipient is signer (NOT provider)', () => {
    const ctx = makeClaimCtx();
    const ix = buildClaimLpFeesIx({ ctx });

    expect(ix.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(8);

    // 0: recipient — signer, !writable
    expect(ix.keys[0]!.pubkey.equals(ctx.recipient)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);

    // 1: pool_state
    expect(ix.keys[1]!.pubkey.equals(ctx.pool)).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(true);

    // 2: lp_position
    expect(ix.keys[2]!.pubkey.equals(ctx.lpPosition)).toBe(true);
    expect(ix.keys[2]!.isWritable).toBe(true);

    // 3/4: pool_vault_a/b
    expect(ix.keys[3]!.pubkey.equals(ctx.poolVaultA)).toBe(true);
    expect(ix.keys[3]!.isWritable).toBe(true);
    expect(ix.keys[4]!.pubkey.equals(ctx.poolVaultB)).toBe(true);
    expect(ix.keys[4]!.isWritable).toBe(true);

    // 5/6: recipient_token_a/b
    expect(ix.keys[5]!.pubkey.equals(ctx.recipientTokenA)).toBe(true);
    expect(ix.keys[5]!.isWritable).toBe(true);
    expect(ix.keys[6]!.pubkey.equals(ctx.recipientTokenB)).toBe(true);
    expect(ix.keys[6]!.isWritable).toBe(true);

    // 7: token_program — read
    expect(ix.keys[7]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[7]!.isWritable).toBe(false);
  });

  // BCLF-2
  it('discriminator only — no args (data length == 8)', () => {
    const ix = buildClaimLpFeesIx({ ctx: makeClaimCtx() });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8);
    expect(data.equals(Buffer.from(CLAIM_LP_FEES_DISCRIMINATOR))).toBe(true);
  });
});

describe('buildClaimLpFeesTx', () => {
  it('ensureRecipientAtas=true + both present → 1 ix', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildClaimLpFeesTx({
      connection: conn as any,
      ctx: makeClaimCtx(),
      ensureRecipientAtas: true,
      tokenAMint: k(),
      tokenBMint: k(),
    });
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.keys.length).toBe(8);
  });

  it('ensureRecipientAtas=true + both missing → 3 ix (createATA*2 prepended)', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildClaimLpFeesTx({
      connection: conn as any,
      ctx: makeClaimCtx(),
      ensureRecipientAtas: true,
      tokenAMint: k(),
      tokenBMint: k(),
    });
    expect(tx.instructions.length).toBe(3);
    expect(tx.instructions[0]!.programId.toBase58()).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );
    expect(tx.instructions[2]!.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
  });

  it('ensureRecipientAtas omitted → single ix without RPC', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildClaimLpFeesTx({
      connection: conn as any,
      ctx: makeClaimCtx(),
    });
    expect(tx.instructions.length).toBe(1);
    expect(conn.getAccountInfo).not.toHaveBeenCalled();
  });

  it('ensureRecipientAtas=true without mints → throws', async () => {
    const conn = makeMockConn({ ataExists: false });
    await expect(
      buildClaimLpFeesTx({
        connection: conn as any,
        ctx: makeClaimCtx(),
        ensureRecipientAtas: true,
      }),
    ).rejects.toThrow(/tokenAMint and tokenBMint/);
  });
});
