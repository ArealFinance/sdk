// Unit tests for `sdk/src/lp-portfolio/enumerate-positions.ts`.
//
// Focus is on the RPC filter contract (size + discriminator memcmp +
// owner memcmp at offset 40) and correct mapping of RPC results to
// parsed `EnumeratedLpPosition` rows. Mirrors
// `tests/unit/markets-enumerate-pools.test.ts`.

import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import bs58 from 'bs58';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  enumerateHolderLpPositions,
  LP_POSITION_SIZE,
  LP_POSITION_OWNER_OFFSET,
} from '../../src/lp-portfolio/enumerate-positions.js';
import { LPPOSITION_DISCRIMINATOR } from '../../src/programs/native-dex/accounts.generated.js';
import { NATIVE_DEX_PROGRAM_ID } from '../../src/network/program-ids.js';

/**
 * LpPosition layout (129 bytes):
 *   [8] disc | [32] pool | [32] owner | [16] shares u128 |
 *   [8] last_update_ts i64 | [1] bump |
 *   [16] fees_claimed_per_share_a u128 |
 *   [16] fees_claimed_per_share_b u128
 */
function buildLpPositionBytes(args: {
  pool: PublicKey;
  owner: PublicKey;
  shares?: bigint;
}): Buffer {
  const buf = Buffer.alloc(LP_POSITION_SIZE);
  let off = 0;
  buf.set(LPPOSITION_DISCRIMINATOR, off); off += 8;
  buf.set(args.pool.toBuffer(), off); off += 32;
  buf.set(args.owner.toBuffer(), off); off += 32;
  // u128 little-endian — write low 64 bits, high 64 bits as 0n.
  buf.writeBigUInt64LE(args.shares ?? 0n, off); off += 8;
  buf.writeBigUInt64LE(0n, off); off += 8; // shares high u64
  buf.writeBigInt64LE(0n, off); off += 8; // last_update_ts
  buf.writeUInt8(255, off); off += 1; // bump
  // fees_claimed_per_share_a / _b: 16 bytes each, zero.
  off += 16;
  off += 16;
  return buf;
}

describe('LP_POSITION_SIZE', () => {
  // EHL-0: size constant matches the field-sum derivation.
  it('matches field sum from IDL_LPPOSITION_FIELDS', () => {
    // 8 + 32 + 32 + 16 + 8 + 1 + 16 + 16 = 129
    expect(LP_POSITION_SIZE).toBe(129);
  });

  it('owner offset is 8 (disc) + 32 (pool) = 40', () => {
    expect(LP_POSITION_OWNER_OFFSET).toBe(40);
  });
});

describe('enumerateHolderLpPositions', () => {
  // EHL-1: filter shape — three filters, owner memcmp at offset 40.
  it('passes dataSize + discriminator + owner memcmp filters', async () => {
    const holder = Keypair.generate().publicKey;
    const getProgramAccounts = vi.fn(async () => []);
    const conn = { getProgramAccounts } as any;

    await enumerateHolderLpPositions(conn, holder, NATIVE_DEX_PROGRAM_ID);

    expect(getProgramAccounts).toHaveBeenCalledTimes(1);
    const [programIdArg, opts] = getProgramAccounts.mock.calls[0]!;
    expect(programIdArg.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(opts.commitment).toBe('confirmed');
    expect(opts.filters).toHaveLength(3);
    expect(opts.filters[0]).toEqual({ dataSize: LP_POSITION_SIZE });
    expect(opts.filters[1]).toEqual({
      memcmp: {
        offset: 0,
        bytes: bs58.encode(LPPOSITION_DISCRIMINATOR),
      },
    });
    expect(opts.filters[2]).toEqual({
      memcmp: {
        offset: LP_POSITION_OWNER_OFFSET,
        bytes: holder.toBase58(),
      },
    });
  });

  // EHL-2: maps RPC results to parsed EnumeratedLpPosition rows.
  it('maps RPC results to EnumeratedLpPosition rows with parsed data', async () => {
    const holder = Keypair.generate().publicKey;
    const pool = Keypair.generate().publicKey;
    const positionPda = Keypair.generate().publicKey;

    const conn = {
      getProgramAccounts: vi.fn(async () => [
        {
          pubkey: positionPda,
          account: {
            data: buildLpPositionBytes({
              pool,
              owner: holder,
              shares: 12_345n,
            }),
            executable: false,
            lamports: 0,
            owner: NATIVE_DEX_PROGRAM_ID,
            rentEpoch: 0,
          },
        },
      ]),
    } as any;

    const out = await enumerateHolderLpPositions(
      conn,
      holder,
      NATIVE_DEX_PROGRAM_ID,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.positionAddress.equals(positionPda)).toBe(true);
    expect(out[0]!.position.pool.equals(pool)).toBe(true);
    expect(out[0]!.position.owner.equals(holder)).toBe(true);
    expect(out[0]!.position.shares).toBe(12_345n);
  });

  // EHL-3: empty result → empty array.
  it('returns empty array when RPC returns no accounts', async () => {
    const holder = Keypair.generate().publicKey;
    const conn = {
      getProgramAccounts: vi.fn(async () => []),
    } as any;

    const out = await enumerateHolderLpPositions(
      conn,
      holder,
      NATIVE_DEX_PROGRAM_ID,
    );
    expect(out).toEqual([]);
  });

  // EHL-4: RPC error propagates (caller is expected to wrap in allSettled).
  it('propagates RPC errors to the caller', async () => {
    const holder = Keypair.generate().publicKey;
    const conn = {
      getProgramAccounts: vi.fn(async () => {
        throw new Error('rpc down');
      }),
    } as any;

    await expect(
      enumerateHolderLpPositions(conn, holder, NATIVE_DEX_PROGRAM_ID),
    ).rejects.toThrow('rpc down');
  });
});
