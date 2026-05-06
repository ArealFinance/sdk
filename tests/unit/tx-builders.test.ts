// Unit tests for `sdk/src/tx/`. For each builder we verify:
//   1. discriminator: first 8 bytes of `data` match the IDL constant
//      (or the sha256("global:<name>") fallback for non-IDL wrappers)
//   2. account list: count, signer/writable flags, programId
//   3. arg encoding: bytes after the discriminator decode back to the
//      original BigInt args (u64 LE / u128 LE).

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  buildDexCompoundIx,
  buildOtTreasuryClaimIx,
  buildRwtClaimYieldIx,
} from '../../src/tx/yield-distribution/index.js';
import {
  buildNexusAddLiquidityIx,
  buildNexusRemoveLiquidityIx,
  buildNexusSwapIx,
  type NexusAccountContext,
  type PoolAccountContext,
} from '../../src/tx/native-dex/index.js';
import {
  NEXUS_ADD_LIQUIDITY_DISCRIMINATOR,
  NEXUS_REMOVE_LIQUIDITY_DISCRIMINATOR,
  NEXUS_SWAP_DISCRIMINATOR,
} from '../../src/programs/native-dex/instructions.generated.js';
import { SPL_TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID } from '../../src/network/constants.js';
import {
  NATIVE_DEX_PROGRAM_ID,
  OWNERSHIP_TOKEN_PROGRAM_ID,
  RWT_ENGINE_PROGRAM_ID,
  YIELD_DISTRIBUTION_PROGRAM_ID,
} from '../../src/network/program-ids.js';

const k = () => Keypair.generate().publicKey;

function discFromName(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function readU128LE(buf: Buffer, off: number): bigint {
  const lo = buf.readBigUInt64LE(off);
  const hi = buf.readBigUInt64LE(off + 8);
  return (hi << 64n) | lo;
}

// ───────────────────────── Nexus Swap ─────────────────────────

describe('buildNexusSwapIx', () => {
  const ctx: NexusAccountContext = {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    dexConfig: k(),
    liquidityNexus: k(),
    manager: k(),
    arealFeeAccount: k(),
    nexusUsdcAta: k(),
    nexusRwtAta: k(),
  };
  const pool: PoolAccountContext = {
    pool: k(),
    vaultA: k(),
    vaultB: k(),
    lpPosition: k(),
  };

  it('discriminator matches IDL NEXUS_SWAP_DISCRIMINATOR', () => {
    const ix = buildNexusSwapIx({
      ctx,
      pool,
      aToB: true,
      amountIn: 1_000n,
      minAmountOut: 990n,
    });
    expect(ix.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(Buffer.from(ix.data).subarray(0, 8).equals(Buffer.from(NEXUS_SWAP_DISCRIMINATOR))).toBe(true);
  });

  it('args encode as [u64 LE | u64 LE | u8]', () => {
    const ix = buildNexusSwapIx({
      ctx,
      pool,
      aToB: true,
      amountIn: 1_234_567n,
      minAmountOut: 999_999n,
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 8 + 8 + 1);
    expect(data.readBigUInt64LE(8)).toBe(1_234_567n);
    expect(data.readBigUInt64LE(16)).toBe(999_999n);
    expect(data.readUInt8(24)).toBe(1);
  });

  it('a_to_b false → byte 24 is 0 and ATA selection flips', () => {
    const ixA = buildNexusSwapIx({ ctx, pool, aToB: true, amountIn: 1n, minAmountOut: 1n });
    const ixB = buildNexusSwapIx({ ctx, pool, aToB: false, amountIn: 1n, minAmountOut: 1n });
    expect(Buffer.from(ixA.data).readUInt8(24)).toBe(1);
    expect(Buffer.from(ixB.data).readUInt8(24)).toBe(0);
    // nexus_token_in (slot 4) flips between ATAs.
    expect(ixA.keys[4]!.pubkey.equals(ctx.nexusUsdcAta)).toBe(true);
    expect(ixB.keys[4]!.pubkey.equals(ctx.nexusRwtAta)).toBe(true);
  });

  it('account list: 11 keys, manager is signer+writable, token_program duplicated', () => {
    const ix = buildNexusSwapIx({ ctx, pool, aToB: true, amountIn: 1n, minAmountOut: 1n });
    expect(ix.keys.length).toBe(11);
    expect(ix.keys[0]!.pubkey.equals(ctx.manager)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(false); // dex_config
    expect(ix.keys[2]!.isWritable).toBe(true); // liquidity_nexus
    expect(ix.keys[9]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[10]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
  });

  it('throws on amount_in <= 0', () => {
    expect(() =>
      buildNexusSwapIx({ ctx, pool, aToB: true, amountIn: 0n, minAmountOut: 1n }),
    ).toThrow(/amount_in/);
  });

  it('throws on amount_in > u64::MAX', () => {
    expect(() =>
      buildNexusSwapIx({
        ctx,
        pool,
        aToB: true,
        amountIn: (1n << 64n),
        minAmountOut: 1n,
      }),
    ).toThrow(/u64::MAX/);
  });
});

// ─────────────────── Nexus Add Liquidity ──────────────────────

describe('buildNexusAddLiquidityIx', () => {
  const ctx: NexusAccountContext = {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    dexConfig: k(),
    liquidityNexus: k(),
    manager: k(),
    arealFeeAccount: k(),
    nexusUsdcAta: k(),
    nexusRwtAta: k(),
  };
  const pool: PoolAccountContext = {
    pool: k(),
    vaultA: k(),
    vaultB: k(),
    lpPosition: k(),
  };

  it('discriminator + args layout [u64 LE | u64 LE | u128 LE]', () => {
    const ix = buildNexusAddLiquidityIx({
      ctx,
      pool,
      amountA: 100n,
      amountB: 200n,
      minShares: (1n << 100n) + 7n,
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 8 + 8 + 16);
    expect(data.subarray(0, 8).equals(Buffer.from(NEXUS_ADD_LIQUIDITY_DISCRIMINATOR))).toBe(true);
    expect(data.readBigUInt64LE(8)).toBe(100n);
    expect(data.readBigUInt64LE(16)).toBe(200n);
    expect(readU128LE(data, 24)).toBe((1n << 100n) + 7n);
  });

  it('account list: 12 keys (11 named + R47), correct flags', () => {
    const ix = buildNexusAddLiquidityIx({
      ctx,
      pool,
      amountA: 1n,
      amountB: 1n,
      minShares: 1n,
    });
    expect(ix.keys.length).toBe(12);
    expect(ix.keys[0]!.pubkey.equals(ctx.manager)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[10]!.pubkey.equals(SYSTEM_PROGRAM_ID)).toBe(true);
    expect(ix.keys[11]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
  });

  it('throws on amount_a + amount_b == 0', () => {
    expect(() =>
      buildNexusAddLiquidityIx({ ctx, pool, amountA: 0n, amountB: 0n, minShares: 1n }),
    ).toThrow(/amount_a \+ amount_b/);
  });

  it('throws on min_shares == 0', () => {
    expect(() =>
      buildNexusAddLiquidityIx({ ctx, pool, amountA: 1n, amountB: 1n, minShares: 0n }),
    ).toThrow(/min_shares/);
  });
});

// ────────────────── Nexus Remove Liquidity ────────────────────

describe('buildNexusRemoveLiquidityIx', () => {
  const ctx: NexusAccountContext = {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    dexConfig: k(),
    liquidityNexus: k(),
    manager: k(),
    arealFeeAccount: k(),
    nexusUsdcAta: k(),
    nexusRwtAta: k(),
  };
  const pool: PoolAccountContext = {
    pool: k(),
    vaultA: k(),
    vaultB: k(),
    lpPosition: k(),
  };

  it('discriminator + args [u128 LE]', () => {
    const ix = buildNexusRemoveLiquidityIx({
      ctx,
      pool,
      sharesToBurn: (1n << 70n),
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 16);
    expect(data.subarray(0, 8).equals(Buffer.from(NEXUS_REMOVE_LIQUIDITY_DISCRIMINATOR))).toBe(true);
    expect(readU128LE(data, 8)).toBe(1n << 70n);
  });

  it('account list: 10 keys (9 named + R47), manager is signer (read-only)', () => {
    const ix = buildNexusRemoveLiquidityIx({
      ctx,
      pool,
      sharesToBurn: 1n,
    });
    expect(ix.keys.length).toBe(10);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);
    expect(ix.keys[9]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
  });

  it('throws on sharesToBurn <= 0', () => {
    expect(() =>
      buildNexusRemoveLiquidityIx({ ctx, pool, sharesToBurn: 0n }),
    ).toThrow(/shares_to_burn/);
  });
});

// ───────────────────── Claim wrappers ─────────────────────────

describe('buildRwtClaimYieldIx', () => {
  const baseArgs = () => ({
    rwtEngineProgramId: RWT_ENGINE_PROGRAM_ID,
    ydProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
    crank: k(),
    rwtVault: k(),
    distConfig: k(),
    rwtClaimAta: k(),
    liquidityDest: k(),
    protocolRevenueDest: k(),
    ydConfig: k(),
    otMint: k(),
    ydDistributor: k(),
    ydClaimStatus: k(),
    ydRewardVault: k(),
    cumulativeAmount: 1_000_000n,
    proof: [Buffer.alloc(32, 1), Buffer.alloc(32, 2)],
  });

  it('discriminator = sha256("global:claim_yield")[..8]', () => {
    const ix = buildRwtClaimYieldIx(baseArgs());
    expect(Buffer.from(ix.data).subarray(0, 8).equals(discFromName('claim_yield'))).toBe(true);
  });

  it('args body = [u64 LE | u32 LE proof_len | 32 * proof_len bytes]', () => {
    const ix = buildRwtClaimYieldIx(baseArgs());
    const data = Buffer.from(ix.data);
    expect(data.readBigUInt64LE(8)).toBe(1_000_000n);
    expect(data.readUInt32LE(16)).toBe(2);
    expect(data.length).toBe(8 + 8 + 4 + 32 * 2);
  });

  it('account list: 14 keys, programId = rwtEngineProgramId, crank is signer+writable', () => {
    const args = baseArgs();
    const ix = buildRwtClaimYieldIx(args);
    expect(ix.keys.length).toBe(14);
    expect(ix.programId.equals(RWT_ENGINE_PROGRAM_ID)).toBe(true);
    expect(ix.keys[0]!.pubkey.equals(args.crank)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(true);
    expect(ix.keys[2]!.isWritable).toBe(false); // dist_config readonly
    expect(ix.keys[11]!.pubkey.equals(YIELD_DISTRIBUTION_PROGRAM_ID)).toBe(true);
    expect(ix.keys[12]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[13]!.pubkey.equals(SYSTEM_PROGRAM_ID)).toBe(true);
  });

  it('throws when a proof node has wrong length', () => {
    const args = { ...baseArgs(), proof: [Buffer.alloc(31, 1)] };
    expect(() => buildRwtClaimYieldIx(args)).toThrow(/proof node/);
  });
});

describe('buildDexCompoundIx', () => {
  const baseArgs = () => ({
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    ydProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
    crank: k(),
    poolState: k(),
    targetVault: k(),
    ydConfig: k(),
    otMint: k(),
    ydDistributor: k(),
    ydClaimStatus: k(),
    ydRewardVault: k(),
    cumulativeAmount: 50_000n,
    proof: [Buffer.alloc(32, 7)],
  });

  it('discriminator = sha256("global:compound_yield")[..8]', () => {
    const ix = buildDexCompoundIx(baseArgs());
    expect(Buffer.from(ix.data).subarray(0, 8).equals(discFromName('compound_yield'))).toBe(true);
  });

  it('account list: 11 keys, programId = dexProgramId', () => {
    const ix = buildDexCompoundIx(baseArgs());
    expect(ix.keys.length).toBe(11);
    expect(ix.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(ix.keys[8]!.pubkey.equals(YIELD_DISTRIBUTION_PROGRAM_ID)).toBe(true);
    expect(ix.keys[9]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[10]!.pubkey.equals(SYSTEM_PROGRAM_ID)).toBe(true);
  });

  it('args encode proof with multiple nodes [u64 LE | u32 LE proof_len | 32*N proof]', () => {
    const args = {
      ...baseArgs(),
      cumulativeAmount: 75_000n,
      proof: [Buffer.alloc(32, 11), Buffer.alloc(32, 22)],
    };
    const ix = buildDexCompoundIx(args);
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 8 + 4 + 32 * 2);
    expect(data.readBigUInt64LE(8)).toBe(75_000n);
    expect(data.readUInt32LE(16)).toBe(2); // proof_len
    expect(data.subarray(20, 52).every((b, i) => b === (i < 32 ? 11 : 22))).toBe(true);
  });
});

describe('buildOtTreasuryClaimIx', () => {
  const baseArgs = () => ({
    otProgramId: OWNERSHIP_TOKEN_PROGRAM_ID,
    ydProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
    crank: k(),
    otMint: k(),
    otTreasury: k(),
    treasuryRwtAta: k(),
    ydConfig: k(),
    ydOtMint: k(),
    ydDistributor: k(),
    ydClaimStatus: k(),
    ydRewardVault: k(),
    cumulativeAmount: 999n,
    proof: [],
  });

  it('discriminator = sha256("global:claim_yd_for_treasury")[..8]', () => {
    const ix = buildOtTreasuryClaimIx(baseArgs());
    expect(
      Buffer.from(ix.data)
        .subarray(0, 8)
        .equals(discFromName('claim_yd_for_treasury')),
    ).toBe(true);
  });

  it('account list: 12 keys, programId = otProgramId, ot_treasury readonly', () => {
    const ix = buildOtTreasuryClaimIx(baseArgs());
    expect(ix.keys.length).toBe(12);
    expect(ix.programId.equals(OWNERSHIP_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[2]!.isWritable).toBe(false); // ot_treasury readonly per source
    expect(ix.keys[3]!.isWritable).toBe(true); // treasury_rwt_ata writable
  });

  it('empty proof → 12-byte body (u64 + u32 only)', () => {
    const ix = buildOtTreasuryClaimIx(baseArgs());
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 12);
    expect(data.readUInt32LE(16)).toBe(0);
  });
});
