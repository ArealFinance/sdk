// Unit tests for `sdk/src/programs/native-dex/simulate.ts`.
//
// `simulateSwap` is a thin wrapper: fetch PoolState + DexConfig in parallel,
// parse, delegate to `quoteSwap`. The parsed-quote math is covered by
// `quote-swap.test.ts` — here we focus on the wrapper-specific surface:
//   - happy path returns a buildable QuoteOutcome for both sides.
//   - missing pool account → throws `Error('pool not found')`.
//   - missing dex config account → throws `Error('dex config not found')`.
//   - malformed pool data → propagates the parser's discriminator-mismatch error.
//
// We build minimal real-byte buffers for both accounts so the codegen
// parsers do their actual work (catches discriminator drift simultaneously).

import { Buffer } from 'buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import { simulateSwap } from '../../src/programs/native-dex/simulate.js';
import {
  DEXCONFIG_DISCRIMINATOR,
  POOLSTATE_DISCRIMINATOR,
} from '../../src/programs/native-dex/accounts.generated.js';
import { findDexConfigPda } from '../../src/pda/native-dex.js';
import { NATIVE_DEX_PROGRAM_ID } from '../../src/network/program-ids.js';

// ─────────────────────── byte fixtures ───────────────────────

const RWT_MINT = new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4');
const NON_RWT_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * PoolState layout (252 bytes total) — same as markets-snapshot test fixture.
 *   [8] disc | [1] pool_type | [32]×4 mints/vaults | [8]×2 reserves |
 *   [16] total_lp_shares | [2] fee_bps | [1] is_active |
 *   [8] total_fees_accumulated | [2] bin_step_bps | [4] active_bin_id |
 *   [32] ot_treasury_fee_destination | [1] has_ot_treasury | [1] bump |
 *   [16]×2 cumulative_fees_per_share
 */
function buildPoolStateBytes(args: {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  feeBps?: number;
  isActive?: boolean;
}): Buffer {
  const buf = Buffer.alloc(252);
  let off = 0;
  buf.set(POOLSTATE_DISCRIMINATOR, off); off += 8;
  buf.writeUInt8(0, off); off += 1; // pool_type = 0 (Standard)
  buf.set(args.tokenAMint.toBuffer(), off); off += 32;
  buf.set(args.tokenBMint.toBuffer(), off); off += 32;
  off += 32; // vault_a (zero)
  off += 32; // vault_b (zero)
  buf.writeBigUInt64LE(args.reserveA, off); off += 8;
  buf.writeBigUInt64LE(args.reserveB, off); off += 8;
  off += 16; // total_lp_shares (zero)
  buf.writeUInt16LE(args.feeBps ?? 30, off); off += 2;
  buf.writeUInt8(args.isActive === false ? 0 : 1, off); off += 1;
  off += 8; // total_fees_accumulated
  off += 2; // bin_step_bps
  off += 4; // active_bin_id
  off += 32; // ot_treasury_fee_destination
  buf.writeUInt8(0, off); off += 1; // has_ot_treasury = false
  buf.writeUInt8(255, off); off += 1; // bump
  off += 16; // cumulative_fees_per_share_a
  off += 16; // cumulative_fees_per_share_b
  return buf;
}

/**
 * DexConfig layout (175 bytes total):
 *   [8] disc | [32] authority | [32] pending_authority | [1] has_pending |
 *   [32] pause_authority | [2] base_fee_bps | [2] lp_fee_share_bps |
 *   [32] areal_fee_destination | [32] rebalancer | [1] is_active | [1] bump
 */
function buildDexConfigBytes(args: {
  baseFeeBps?: number;
  lpFeeShareBps?: number;
  isActive?: boolean;
}): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 + 1 + 32 + 2 + 2 + 32 + 32 + 1 + 1);
  let off = 0;
  buf.set(DEXCONFIG_DISCRIMINATOR, off); off += 8;
  off += 32; // authority
  off += 32; // pending_authority
  buf.writeUInt8(0, off); off += 1; // has_pending = false
  off += 32; // pause_authority
  buf.writeUInt16LE(args.baseFeeBps ?? 30, off); off += 2;
  buf.writeUInt16LE(args.lpFeeShareBps ?? 8000, off); off += 2;
  off += 32; // areal_fee_destination
  off += 32; // rebalancer
  buf.writeUInt8(args.isActive === false ? 0 : 1, off); off += 1;
  buf.writeUInt8(255, off); // bump
  return buf;
}

// ─────────────────────── connection mock ───────────────────────

interface AccountInfoLike {
  data: Buffer;
  executable: boolean;
  lamports: number;
  owner: PublicKey;
  rentEpoch: number;
}

/**
 * Build a Connection-shaped object whose `getAccountInfo` returns
 * pre-baked bytes per address. Keys: base58 pubkey → AccountInfo or null.
 */
function makeMockConnection(
  accounts: Map<string, AccountInfoLike | null>,
): {
  getAccountInfo: ReturnType<typeof vi.fn>;
} {
  return {
    getAccountInfo: vi.fn(async (pk: PublicKey) => {
      const key = pk.toBase58();
      return accounts.has(key) ? (accounts.get(key) ?? null) : null;
    }),
  };
}

function asAccount(data: Buffer): AccountInfoLike {
  return {
    data,
    executable: false,
    lamports: 0,
    owner: NATIVE_DEX_PROGRAM_ID,
    rentEpoch: 0,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────── tests ───────────────────────

describe('simulateSwap', () => {
  it('returns a valid QuoteOutcome for the a-to-b direction', async () => {
    const poolAddress = Keypair.generate().publicKey;
    const [dexConfigPda] = findDexConfigPda(NATIVE_DEX_PROGRAM_ID);

    const accounts = new Map<string, AccountInfoLike | null>([
      [
        poolAddress.toBase58(),
        asAccount(
          buildPoolStateBytes({
            tokenAMint: RWT_MINT,
            tokenBMint: NON_RWT_MINT,
            reserveA: 1_000_000n,
            reserveB: 1_000_000n,
            feeBps: 30,
          }),
        ),
      ],
      [
        dexConfigPda.toBase58(),
        asAccount(buildDexConfigBytes({ baseFeeBps: 30, lpFeeShareBps: 8000 })),
      ],
    ]);

    const conn = makeMockConnection(accounts);

    const result = await simulateSwap(
      conn as unknown as import('@solana/web3.js').Connection,
      poolAddress,
      10_000n,
      'a-to-b',
      { dexProgramId: NATIVE_DEX_PROGRAM_ID, rwtMint: RWT_MINT },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Same expected math as quote-swap.test QM-1 (selling RWT, fee on input).
    // fee_total = 30, net_input = 9_970, amountOut = floor(1_000_000 * 9970 / 1_009_970)
    const expected = (1_000_000n * 9_970n) / (1_000_000n + 9_970n);
    expect(result.quote.fees.feeTotal).toBe(30n);
    expect(result.quote.netInput).toBe(9_970n);
    expect(result.quote.amountOut).toBe(expected);

    // Both accounts should have been fetched once.
    expect(conn.getAccountInfo).toHaveBeenCalledTimes(2);
  });

  it('returns a valid QuoteOutcome for the b-to-a direction', async () => {
    const poolAddress = Keypair.generate().publicKey;
    const [dexConfigPda] = findDexConfigPda(NATIVE_DEX_PROGRAM_ID);

    const accounts = new Map<string, AccountInfoLike | null>([
      [
        poolAddress.toBase58(),
        asAccount(
          buildPoolStateBytes({
            // Flip token order so swapping b-to-a means selling RWT.
            tokenAMint: NON_RWT_MINT,
            tokenBMint: RWT_MINT,
            reserveA: 1_000_000n,
            reserveB: 1_000_000n,
            feeBps: 30,
          }),
        ),
      ],
      [
        dexConfigPda.toBase58(),
        asAccount(buildDexConfigBytes({ baseFeeBps: 30, lpFeeShareBps: 8000 })),
      ],
    ]);

    const conn = makeMockConnection(accounts);

    const result = await simulateSwap(
      conn as unknown as import('@solana/web3.js').Connection,
      poolAddress,
      10_000n,
      'b-to-a',
      { dexProgramId: NATIVE_DEX_PROGRAM_ID, rwtMint: RWT_MINT },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Same selling-RWT branch — symmetry sanity check.
    expect(result.quote.fees.feeTotal).toBe(30n);
    expect(result.quote.netInput).toBe(9_970n);
  });

  it('throws "pool not found" when getAccountInfo returns null for the pool', async () => {
    const poolAddress = Keypair.generate().publicKey;
    const [dexConfigPda] = findDexConfigPda(NATIVE_DEX_PROGRAM_ID);

    // Pool slot intentionally absent; config present so we hit the pool
    // null-check (not the config one).
    const accounts = new Map<string, AccountInfoLike | null>([
      [poolAddress.toBase58(), null],
      [
        dexConfigPda.toBase58(),
        asAccount(buildDexConfigBytes({})),
      ],
    ]);

    const conn = makeMockConnection(accounts);

    await expect(
      simulateSwap(
        conn as unknown as import('@solana/web3.js').Connection,
        poolAddress,
        1_000n,
        'a-to-b',
        { dexProgramId: NATIVE_DEX_PROGRAM_ID, rwtMint: RWT_MINT },
      ),
    ).rejects.toThrow('pool not found');
  });

  it('throws "dex config not found" when the DexConfig PDA is missing', async () => {
    const poolAddress = Keypair.generate().publicKey;

    // Pool present, config absent — exercises the second null-check.
    const accounts = new Map<string, AccountInfoLike | null>([
      [
        poolAddress.toBase58(),
        asAccount(
          buildPoolStateBytes({
            tokenAMint: RWT_MINT,
            tokenBMint: NON_RWT_MINT,
            reserveA: 1n,
            reserveB: 1n,
          }),
        ),
      ],
    ]);

    const conn = makeMockConnection(accounts);

    await expect(
      simulateSwap(
        conn as unknown as import('@solana/web3.js').Connection,
        poolAddress,
        1_000n,
        'a-to-b',
        { dexProgramId: NATIVE_DEX_PROGRAM_ID, rwtMint: RWT_MINT },
      ),
    ).rejects.toThrow('dex config not found');
  });

  it('propagates the parser error when the pool data has the wrong discriminator', async () => {
    const poolAddress = Keypair.generate().publicKey;
    const [dexConfigPda] = findDexConfigPda(NATIVE_DEX_PROGRAM_ID);

    // Garbage bytes — first 8 bytes are the WRONG discriminator, rest is
    // zero. parsePoolState throws with a discriminator-mismatch error.
    const malformed = Buffer.alloc(252);
    // Write a clearly-bogus discriminator (all 0xFF).
    for (let i = 0; i < 8; i++) malformed.writeUInt8(0xff, i);

    const accounts = new Map<string, AccountInfoLike | null>([
      [poolAddress.toBase58(), asAccount(malformed)],
      [
        dexConfigPda.toBase58(),
        asAccount(buildDexConfigBytes({})),
      ],
    ]);

    const conn = makeMockConnection(accounts);

    await expect(
      simulateSwap(
        conn as unknown as import('@solana/web3.js').Connection,
        poolAddress,
        1_000n,
        'a-to-b',
        { dexProgramId: NATIVE_DEX_PROGRAM_ID, rwtMint: RWT_MINT },
      ),
    ).rejects.toThrow();
  });
});
