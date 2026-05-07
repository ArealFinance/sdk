// Unit tests for `sdk/src/tx/native-dex/swap.ts`.
//
// 8 cases (BS-1 through BS-8):
//   BS-1. Account list byte-for-byte parity with the contract `Swap` struct.
//   BS-2. aToB true/false flips vault_in / vault_out correctly.
//   BS-3. otTreasuryFeeDestination optional → 9 keys; present → 10 keys with
//         the OT account at index 9 (writable).
//   BS-4. Args encoding via codegen — discriminator + LE u64s + bool byte.
//   BS-5. Mainnet placeholder guard throws on placeholder rwtMint.
//   BS-6. ensureAta=true + missing ATA → 2 ix tx (createATA prepended).
//   BS-7. ensureAta=true + present ATA → 1 ix tx (just swap).
//   BS-8. Range checks: amountIn=0 throws; amountIn > u64::MAX throws.

import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  buildSwapIx,
  buildSwapTx,
  type SwapAccountContext,
} from '../../src/tx/native-dex/swap.js';
import { SWAP_DISCRIMINATOR } from '../../src/programs/native-dex/instructions.generated.js';
import {
  RWT_MINTS,
  SPL_TOKEN_PROGRAM_ID,
} from '../../src/network/constants.js';
import { NATIVE_DEX_PROGRAM_ID } from '../../src/network/program-ids.js';

const k = () => Keypair.generate().publicKey;

function makeCtx(overrides: Partial<SwapAccountContext> = {}): SwapAccountContext {
  return {
    dexProgramId: NATIVE_DEX_PROGRAM_ID,
    user: k(),
    dexConfig: k(),
    pool: k(),
    vaultA: k(),
    vaultB: k(),
    arealFeeAccount: k(),
    ...overrides,
  };
}

function makeMockConn(opts: { ataExists: boolean }) {
  const conn = {
    getAccountInfo: vi.fn(async (_key: PublicKey) => {
      return opts.ataExists
        ? { data: Buffer.alloc(0), executable: false, lamports: 1, owner: SPL_TOKEN_PROGRAM_ID, rentEpoch: 0 }
        : null;
    }),
  };
  return conn;
}

// ─────────────────────────── buildSwapIx ──────────────────────────────────

describe('buildSwapIx', () => {
  // BS-1
  it('account list: 9 keys in exact order with correct signer/writable flags', () => {
    const ctx = makeCtx();
    const userTokenIn = k();
    const userTokenOut = k();
    const ix = buildSwapIx({
      ctx,
      userTokenIn,
      userTokenOut,
      aToB: true,
      amountIn: 1_000n,
      minAmountOut: 990n,
    });

    expect(ix.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(9);

    // 0: user — signer, NOT writable
    expect(ix.keys[0]!.pubkey.equals(ctx.user)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);

    // 1: dex_config — read
    expect(ix.keys[1]!.pubkey.equals(ctx.dexConfig)).toBe(true);
    expect(ix.keys[1]!.isSigner).toBe(false);
    expect(ix.keys[1]!.isWritable).toBe(false);

    // 2: pool_state — mut
    expect(ix.keys[2]!.pubkey.equals(ctx.pool)).toBe(true);
    expect(ix.keys[2]!.isSigner).toBe(false);
    expect(ix.keys[2]!.isWritable).toBe(true);

    // 3: user_token_in — mut
    expect(ix.keys[3]!.pubkey.equals(userTokenIn)).toBe(true);
    expect(ix.keys[3]!.isWritable).toBe(true);

    // 4: user_token_out — mut
    expect(ix.keys[4]!.pubkey.equals(userTokenOut)).toBe(true);
    expect(ix.keys[4]!.isWritable).toBe(true);

    // 5: vault_in — mut (aToB=true → vaultA)
    expect(ix.keys[5]!.pubkey.equals(ctx.vaultA)).toBe(true);
    expect(ix.keys[5]!.isWritable).toBe(true);

    // 6: vault_out — mut (aToB=true → vaultB)
    expect(ix.keys[6]!.pubkey.equals(ctx.vaultB)).toBe(true);
    expect(ix.keys[6]!.isWritable).toBe(true);

    // 7: areal_fee_account — mut
    expect(ix.keys[7]!.pubkey.equals(ctx.arealFeeAccount)).toBe(true);
    expect(ix.keys[7]!.isWritable).toBe(true);

    // 8: token_program — read
    expect(ix.keys[8]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[8]!.isSigner).toBe(false);
    expect(ix.keys[8]!.isWritable).toBe(false);
  });

  // BS-2
  it('aToB true → vault_in=vaultA, vault_out=vaultB; false → flipped', () => {
    const ctx = makeCtx();
    const ixTrue = buildSwapIx({
      ctx,
      userTokenIn: k(),
      userTokenOut: k(),
      aToB: true,
      amountIn: 1n,
      minAmountOut: 1n,
    });
    const ixFalse = buildSwapIx({
      ctx,
      userTokenIn: k(),
      userTokenOut: k(),
      aToB: false,
      amountIn: 1n,
      minAmountOut: 1n,
    });
    expect(ixTrue.keys[5]!.pubkey.equals(ctx.vaultA)).toBe(true);
    expect(ixTrue.keys[6]!.pubkey.equals(ctx.vaultB)).toBe(true);
    expect(ixFalse.keys[5]!.pubkey.equals(ctx.vaultB)).toBe(true);
    expect(ixFalse.keys[6]!.pubkey.equals(ctx.vaultA)).toBe(true);

    // a_to_b byte (last byte of args after disc + 16 bytes of u64s) reflects flag
    expect(Buffer.from(ixTrue.data).readUInt8(8 + 8 + 8)).toBe(1);
    expect(Buffer.from(ixFalse.data).readUInt8(8 + 8 + 8)).toBe(0);
  });

  // BS-3
  it('otTreasuryFeeDestination undefined → 9 keys; defined → 10 keys with OT at index 9 (writable)', () => {
    const ctxNoOt = makeCtx();
    const ix9 = buildSwapIx({
      ctx: ctxNoOt,
      userTokenIn: k(),
      userTokenOut: k(),
      aToB: true,
      amountIn: 1n,
      minAmountOut: 1n,
    });
    expect(ix9.keys.length).toBe(9);

    const otAccount = k();
    const ctxOt = makeCtx({ otTreasuryFeeDestination: otAccount });
    const ix10 = buildSwapIx({
      ctx: ctxOt,
      userTokenIn: k(),
      userTokenOut: k(),
      aToB: true,
      amountIn: 1n,
      minAmountOut: 1n,
    });
    expect(ix10.keys.length).toBe(10);
    expect(ix10.keys[9]!.pubkey.equals(otAccount)).toBe(true);
    expect(ix10.keys[9]!.isSigner).toBe(false);
    expect(ix10.keys[9]!.isWritable).toBe(true);
  });

  // BS-4
  it('discriminator + LE u64 amount_in + LE u64 min_amount_out + bool a_to_b', () => {
    const ix = buildSwapIx({
      ctx: makeCtx(),
      userTokenIn: k(),
      userTokenOut: k(),
      aToB: true,
      amountIn: 1_234_567n,
      minAmountOut: 999_999n,
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 8 + 8 + 1);

    // Discriminator
    expect(data.subarray(0, 8).equals(Buffer.from(SWAP_DISCRIMINATOR))).toBe(true);

    // amount_in (u64 LE)
    expect(data.readBigUInt64LE(8)).toBe(1_234_567n);
    // min_amount_out (u64 LE)
    expect(data.readBigUInt64LE(16)).toBe(999_999n);
    // a_to_b (bool, 1 byte)
    expect(data.readUInt8(24)).toBe(1);
  });

  // BS-8a
  it('throws when amount_in == 0', () => {
    expect(() =>
      buildSwapIx({
        ctx: makeCtx(),
        userTokenIn: k(),
        userTokenOut: k(),
        aToB: true,
        amountIn: 0n,
        minAmountOut: 1n,
      }),
    ).toThrow(/amount_in/);
  });

  // BS-8b
  it('throws when amount_in > u64::MAX', () => {
    expect(() =>
      buildSwapIx({
        ctx: makeCtx(),
        userTokenIn: k(),
        userTokenOut: k(),
        aToB: true,
        amountIn: 1n << 64n,
        minAmountOut: 1n,
      }),
    ).toThrow(/u64::MAX/);
  });

  it('throws when min_amount_out > u64::MAX', () => {
    expect(() =>
      buildSwapIx({
        ctx: makeCtx(),
        userTokenIn: k(),
        userTokenOut: k(),
        aToB: true,
        amountIn: 1n,
        minAmountOut: 1n << 64n,
      }),
    ).toThrow(/u64::MAX/);
  });
});

// ─────────────────────────── buildSwapTx ──────────────────────────────────

describe('buildSwapTx', () => {
  // BS-5
  it('cluster=mainnet + placeholder rwtMint → throws "placeholder; mainnet RWT mint not yet deployed"', async () => {
    const conn = makeMockConn({ ataExists: true });
    await expect(
      buildSwapTx({
        connection: conn as any,
        ctx: makeCtx(),
        userTokenIn: k(),
        userTokenOut: k(),
        outputMint: RWT_MINTS.mainnet,
        rwtMint: RWT_MINTS.mainnet, // placeholder bytes
        aToB: true,
        amountIn: 1_000n,
        minAmountOut: 990n,
        cluster: 'mainnet',
      }),
    ).rejects.toThrow(/placeholder; mainnet RWT mint not yet deployed/);
  });

  it('cluster=mainnet + non-placeholder rwtMint → does NOT throw', async () => {
    const conn = makeMockConn({ ataExists: true });
    const realMint = Keypair.generate().publicKey;
    const tx = await buildSwapTx({
      connection: conn as any,
      ctx: makeCtx(),
      userTokenIn: k(),
      userTokenOut: k(),
      outputMint: realMint,
      rwtMint: realMint,
      aToB: true,
      amountIn: 1_000n,
      minAmountOut: 990n,
      cluster: 'mainnet',
    });
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
  });

  it('cluster=devnet + placeholder rwtMint → does NOT throw (placeholder is expected on devnet)', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildSwapTx({
      connection: conn as any,
      ctx: makeCtx(),
      userTokenIn: k(),
      userTokenOut: k(),
      outputMint: RWT_MINTS.devnet,
      rwtMint: RWT_MINTS.devnet,
      aToB: true,
      amountIn: 1_000n,
      minAmountOut: 990n,
      cluster: 'devnet',
    });
    expect(tx.instructions.length).toBe(1);
  });

  // BS-6
  it('ensureAta=true + missing ATA → 2 ix (createATA prepended)', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildSwapTx({
      connection: conn as any,
      ctx: makeCtx(),
      userTokenIn: k(),
      userTokenOut: k(),
      outputMint: RWT_MINTS.localnet,
      aToB: true,
      amountIn: 1_000n,
      minAmountOut: 990n,
      ensureAta: true,
    });
    expect(tx.instructions.length).toBe(2);
    // First ix is the SPL Associated Token Account program create-idempotent.
    expect(tx.instructions[0]!.programId.toBase58()).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );
    // Second ix is the swap.
    expect(tx.instructions[1]!.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(tx.instructions[1]!.keys.length).toBe(9);
    // Connection was queried for the ATA exactly once.
    expect(conn.getAccountInfo).toHaveBeenCalledTimes(1);
  });

  // BS-7
  it('ensureAta=true + present ATA → 1 ix (just swap)', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildSwapTx({
      connection: conn as any,
      ctx: makeCtx(),
      userTokenIn: k(),
      userTokenOut: k(),
      outputMint: RWT_MINTS.localnet,
      aToB: true,
      amountIn: 1_000n,
      minAmountOut: 990n,
      ensureAta: true,
    });
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(conn.getAccountInfo).toHaveBeenCalledTimes(1);
  });

  it('ensureAta omitted → never reads ATA, single ix', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildSwapTx({
      connection: conn as any,
      ctx: makeCtx(),
      userTokenIn: k(),
      userTokenOut: k(),
      outputMint: RWT_MINTS.localnet,
      aToB: true,
      amountIn: 1_000n,
      minAmountOut: 990n,
    });
    expect(tx.instructions.length).toBe(1);
    expect(conn.getAccountInfo).not.toHaveBeenCalled();
  });
});
