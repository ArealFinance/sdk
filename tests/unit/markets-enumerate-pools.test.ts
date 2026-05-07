// Unit tests for `sdk/src/markets/enumerate-pools.ts`.
//
// Focus is on the RPC filter contract (size + discriminator memcmp) and
// correct mapping of RPC results to parsed `EnumeratedPool` rows.

import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import bs58 from 'bs58';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  enumeratePools,
  POOL_STATE_SIZE,
} from '../../src/markets/enumerate-pools.js';
import { POOLSTATE_DISCRIMINATOR } from '../../src/programs/native-dex/accounts.generated.js';
import { NATIVE_DEX_PROGRAM_ID } from '../../src/network/program-ids.js';

function buildPoolStateBytes(args: {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
}): Buffer {
  const buf = Buffer.alloc(POOL_STATE_SIZE);
  let off = 0;
  buf.set(POOLSTATE_DISCRIMINATOR, off); off += 8;
  buf.writeUInt8(0, off); off += 1; // pool_type
  buf.set(args.tokenAMint.toBuffer(), off); off += 32;
  buf.set(args.tokenBMint.toBuffer(), off); off += 32;
  // remaining bytes zero — fields default to 0n / false / 0.
  return buf;
}

describe('enumeratePools', () => {
  // EP-1: filter shape
  it('passes both dataSize and discriminator memcmp filters', async () => {
    const getProgramAccounts = vi.fn(async () => []);
    const conn = { getProgramAccounts } as any;

    await enumeratePools(conn, NATIVE_DEX_PROGRAM_ID);

    expect(getProgramAccounts).toHaveBeenCalledTimes(1);
    const [, opts] = getProgramAccounts.mock.calls[0]!;
    expect(opts.commitment).toBe('confirmed');
    expect(opts.filters).toHaveLength(2);
    expect(opts.filters[0]).toEqual({ dataSize: POOL_STATE_SIZE });
    expect(opts.filters[1]).toEqual({
      memcmp: {
        offset: 0,
        bytes: bs58.encode(POOLSTATE_DISCRIMINATOR),
      },
    });
  });

  // EP-2: returns parsed pools mapped from getProgramAccounts result
  it('maps RPC results to EnumeratedPool rows with parsed data', async () => {
    const tokenA = Keypair.generate().publicKey;
    const tokenB = Keypair.generate().publicKey;
    const poolPda = Keypair.generate().publicKey;

    const conn = {
      getProgramAccounts: vi.fn(async () => [
        {
          pubkey: poolPda,
          account: {
            data: buildPoolStateBytes({ tokenAMint: tokenA, tokenBMint: tokenB }),
            executable: false,
            lamports: 0,
            owner: NATIVE_DEX_PROGRAM_ID,
            rentEpoch: 0,
          },
        },
      ]),
    } as any;

    const out = await enumeratePools(conn, NATIVE_DEX_PROGRAM_ID);
    expect(out).toHaveLength(1);
    expect(out[0]!.poolAddress.equals(poolPda)).toBe(true);
    expect(out[0]!.pool.tokenAMint.equals(tokenA)).toBe(true);
    expect(out[0]!.pool.tokenBMint.equals(tokenB)).toBe(true);
    expect(out[0]!.pool.poolType).toBe(0);
  });

  // EP-3: empty result → empty array
  it('returns empty array when RPC returns no accounts', async () => {
    const conn = {
      getProgramAccounts: vi.fn(async () => []),
    } as any;

    const out = await enumeratePools(conn, NATIVE_DEX_PROGRAM_ID);
    expect(out).toEqual([]);
  });
});
