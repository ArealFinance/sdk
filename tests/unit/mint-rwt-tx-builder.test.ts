// Unit tests for `sdk/src/tx/rwt-engine/mint-rwt.ts`.
//
// 12 cases (BM-1 through BM-12):
//   BM-1.  Account list byte-for-byte parity with the contract `MintRwt` struct.
//   BM-2.  Args encoding via codegen — discriminator + 2x LE u64s.
//   BM-3.  amount=0 throws.
//   BM-4.  amount > u64::MAX throws.
//   BM-5.  minRwtOut=0 throws (slippage REQUIRED — mirrors ZeroSlippage).
//   BM-6.  minRwtOut > u64::MAX throws.
//   BM-7.  Mainnet placeholder guard throws on placeholder rwtMint.
//   BM-8.  Mainnet + non-placeholder rwtMint → does NOT throw.
//   BM-9.  Devnet + placeholder rwtMint → does NOT throw.
//   BM-10. ensureAta=true + missing ATA → 2-ix tx (createATA prepended).
//   BM-11. ensureAta=true + present ATA → 1-ix tx (just mint).
//   BM-12. ensureAta omitted → never reads ATA, single ix.

import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  buildMintRwtIx,
  buildMintRwtTx,
  type MintRwtAccountContext,
} from '../../src/tx/rwt-engine/mint-rwt.js';
import { MINT_RWT_DISCRIMINATOR } from '../../src/programs/rwt-engine/instructions.generated.js';
import {
  RWT_MINTS,
  SPL_TOKEN_PROGRAM_ID,
} from '../../src/network/constants.js';
import { RWT_ENGINE_PROGRAM_ID } from '../../src/network/program-ids.js';

const k = () => Keypair.generate().publicKey;

function makeCtx(overrides: Partial<MintRwtAccountContext> = {}): MintRwtAccountContext {
  return {
    rwtEngineProgramId: RWT_ENGINE_PROGRAM_ID,
    user: k(),
    rwtVault: k(),
    rwtMint: k(),
    capitalAcc: k(),
    daoFeeAccount: k(),
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

// ─────────────────────────── buildMintRwtIx ───────────────────────────────

describe('buildMintRwtIx', () => {
  // BM-1
  it('account list: 8 keys in exact order with correct signer/writable flags', () => {
    const ctx = makeCtx();
    const userDeposit = k();
    const userRwt = k();
    const ix = buildMintRwtIx({
      ctx,
      userDeposit,
      userRwt,
      amount: 1_000_000n,
      minRwtOut: 990_000n,
    });

    expect(ix.programId.equals(RWT_ENGINE_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(8);

    // 0: user — signer, NOT writable
    expect(ix.keys[0]!.pubkey.equals(ctx.user)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);

    // 1: rwt_vault — mut
    expect(ix.keys[1]!.pubkey.equals(ctx.rwtVault)).toBe(true);
    expect(ix.keys[1]!.isSigner).toBe(false);
    expect(ix.keys[1]!.isWritable).toBe(true);

    // 2: rwt_mint — mut
    expect(ix.keys[2]!.pubkey.equals(ctx.rwtMint)).toBe(true);
    expect(ix.keys[2]!.isSigner).toBe(false);
    expect(ix.keys[2]!.isWritable).toBe(true);

    // 3: user_deposit — mut
    expect(ix.keys[3]!.pubkey.equals(userDeposit)).toBe(true);
    expect(ix.keys[3]!.isSigner).toBe(false);
    expect(ix.keys[3]!.isWritable).toBe(true);

    // 4: user_rwt — mut
    expect(ix.keys[4]!.pubkey.equals(userRwt)).toBe(true);
    expect(ix.keys[4]!.isSigner).toBe(false);
    expect(ix.keys[4]!.isWritable).toBe(true);

    // 5: capital_acc — mut
    expect(ix.keys[5]!.pubkey.equals(ctx.capitalAcc)).toBe(true);
    expect(ix.keys[5]!.isSigner).toBe(false);
    expect(ix.keys[5]!.isWritable).toBe(true);

    // 6: dao_fee_account — mut
    expect(ix.keys[6]!.pubkey.equals(ctx.daoFeeAccount)).toBe(true);
    expect(ix.keys[6]!.isSigner).toBe(false);
    expect(ix.keys[6]!.isWritable).toBe(true);

    // 7: token_program — read
    expect(ix.keys[7]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[7]!.isSigner).toBe(false);
    expect(ix.keys[7]!.isWritable).toBe(false);
  });

  // BM-2
  it('discriminator + LE u64 amount + LE u64 min_rwt_out', () => {
    const ix = buildMintRwtIx({
      ctx: makeCtx(),
      userDeposit: k(),
      userRwt: k(),
      amount: 1_234_567n,
      minRwtOut: 999_999n,
    });
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 8 + 8);

    // Discriminator
    expect(data.subarray(0, 8).equals(Buffer.from(MINT_RWT_DISCRIMINATOR))).toBe(true);

    // amount (u64 LE)
    expect(data.readBigUInt64LE(8)).toBe(1_234_567n);
    // min_rwt_out (u64 LE)
    expect(data.readBigUInt64LE(16)).toBe(999_999n);
  });

  // BM-3
  it('throws when amount == 0', () => {
    expect(() =>
      buildMintRwtIx({
        ctx: makeCtx(),
        userDeposit: k(),
        userRwt: k(),
        amount: 0n,
        minRwtOut: 1n,
      }),
    ).toThrow(/amount must be > 0/);
  });

  // BM-4
  it('throws when amount > u64::MAX', () => {
    expect(() =>
      buildMintRwtIx({
        ctx: makeCtx(),
        userDeposit: k(),
        userRwt: k(),
        amount: 1n << 64n,
        minRwtOut: 1n,
      }),
    ).toThrow(/u64::MAX/);
  });

  // BM-5
  it('throws when min_rwt_out == 0 (slippage REQUIRED)', () => {
    // Mirrors the contract's `ZeroSlippage` rejection — a zero floor
    // would let the user accept any NAV. Reject at the SDK boundary
    // so the caller does not waste a blockhash.
    expect(() =>
      buildMintRwtIx({
        ctx: makeCtx(),
        userDeposit: k(),
        userRwt: k(),
        amount: 1_000_000n,
        minRwtOut: 0n,
      }),
    ).toThrow(/min_rwt_out must be > 0/);
  });

  // BM-6
  it('throws when min_rwt_out > u64::MAX', () => {
    expect(() =>
      buildMintRwtIx({
        ctx: makeCtx(),
        userDeposit: k(),
        userRwt: k(),
        amount: 1_000_000n,
        minRwtOut: 1n << 64n,
      }),
    ).toThrow(/u64::MAX/);
  });
});

// ─────────────────────────── buildMintRwtTx ───────────────────────────────

describe('buildMintRwtTx', () => {
  // BM-7
  it('cluster=mainnet + placeholder rwtMint → throws "placeholder; mainnet RWT mint not yet deployed"', async () => {
    const conn = makeMockConn({ ataExists: true });
    await expect(
      buildMintRwtTx({
        connection: conn as any,
        ctx: makeCtx(),
        userDeposit: k(),
        userRwt: k(),
        amount: 1_000_000n,
        minRwtOut: 990_000n,
        cluster: 'mainnet',
        rwtMint: RWT_MINTS.mainnet, // placeholder bytes
      }),
    ).rejects.toThrow(/placeholder; mainnet RWT mint not yet deployed/);
  });

  // BM-8
  it('cluster=mainnet + non-placeholder rwtMint → does NOT throw', async () => {
    const conn = makeMockConn({ ataExists: true });
    const realMint = Keypair.generate().publicKey;
    const tx = await buildMintRwtTx({
      connection: conn as any,
      ctx: makeCtx({ rwtMint: realMint }),
      userDeposit: k(),
      userRwt: k(),
      amount: 1_000_000n,
      minRwtOut: 990_000n,
      cluster: 'mainnet',
      rwtMint: realMint,
    });
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.programId.equals(RWT_ENGINE_PROGRAM_ID)).toBe(true);
  });

  // BM-9
  it('cluster=devnet + placeholder rwtMint → does NOT throw (placeholder is expected on devnet)', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildMintRwtTx({
      connection: conn as any,
      ctx: makeCtx({ rwtMint: RWT_MINTS.devnet }),
      userDeposit: k(),
      userRwt: k(),
      amount: 1_000_000n,
      minRwtOut: 990_000n,
      cluster: 'devnet',
      rwtMint: RWT_MINTS.devnet,
    });
    expect(tx.instructions.length).toBe(1);
  });

  // BM-10
  it('ensureAta=true + missing ATA → 2 ix (createATA prepended)', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildMintRwtTx({
      connection: conn as any,
      ctx: makeCtx(),
      userDeposit: k(),
      userRwt: k(),
      amount: 1_000_000n,
      minRwtOut: 990_000n,
      ensureAta: true,
    });
    expect(tx.instructions.length).toBe(2);
    // First ix is the SPL Associated Token Account program create-idempotent.
    expect(tx.instructions[0]!.programId.toBase58()).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );
    // Second ix is the mint.
    expect(tx.instructions[1]!.programId.equals(RWT_ENGINE_PROGRAM_ID)).toBe(true);
    expect(tx.instructions[1]!.keys.length).toBe(8);
    // Connection was queried for the ATA exactly once.
    expect(conn.getAccountInfo).toHaveBeenCalledTimes(1);
  });

  // BM-11
  it('ensureAta=true + present ATA → 1 ix (just mint)', async () => {
    const conn = makeMockConn({ ataExists: true });
    const tx = await buildMintRwtTx({
      connection: conn as any,
      ctx: makeCtx(),
      userDeposit: k(),
      userRwt: k(),
      amount: 1_000_000n,
      minRwtOut: 990_000n,
      ensureAta: true,
    });
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.programId.equals(RWT_ENGINE_PROGRAM_ID)).toBe(true);
    expect(conn.getAccountInfo).toHaveBeenCalledTimes(1);
  });

  // BM-12
  it('ensureAta omitted → never reads ATA, single ix', async () => {
    const conn = makeMockConn({ ataExists: false });
    const tx = await buildMintRwtTx({
      connection: conn as any,
      ctx: makeCtx(),
      userDeposit: k(),
      userRwt: k(),
      amount: 1_000_000n,
      minRwtOut: 990_000n,
    });
    expect(tx.instructions.length).toBe(1);
    expect(conn.getAccountInfo).not.toHaveBeenCalled();
  });
});
