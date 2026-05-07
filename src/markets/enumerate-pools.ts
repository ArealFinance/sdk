// Enumerate every PoolState PDA owned by the Native DEX program.
//
// Mirrors the pattern of `portfolio/enumerate-ot.ts`: an Anchor-style
// 8-byte discriminator memcmp filter so the RPC only returns PoolState
// accounts, NOT DexConfig / PoolCreators / LpPosition. The `dataSize`
// filter adds a minor bandwidth saving and locks the result strictly to
// "PoolState and only PoolState".

import type { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

import {
  POOLSTATE_DISCRIMINATOR,
  parsePoolState,
} from '../programs/native-dex/accounts.generated.js';
import type { EnumeratedPool } from './types.js';

/**
 * Fixed on-chain size of a PoolState account.
 *
 * Verified against `contracts/native-dex/src/state.rs:65-67`:
 *   8 (disc) + 244 (data: PoolState repr(C) layout incl. Layer-9 D28
 *   `cumulative_fees_per_share_{a,b}` accumulators) = 252 bytes.
 *
 * Used as a `dataSize` filter alongside the discriminator memcmp so the
 * RPC only returns accounts of exactly this type.
 */
export const POOL_STATE_SIZE = 252;

/**
 * Fetch every PoolState owned by `programId`.
 *
 * Throws on RPC failure — callers (e.g. `getMarketsSnapshot`) should
 * decide whether to swallow the error and degrade to an empty list.
 */
export async function enumeratePools(
  conn: Connection,
  programId: PublicKey,
): Promise<EnumeratedPool[]> {
  const accounts = await conn.getProgramAccounts(programId, {
    commitment: 'confirmed',
    filters: [
      { dataSize: POOL_STATE_SIZE },
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(POOLSTATE_DISCRIMINATOR),
        },
      },
    ],
  });
  return accounts.map(({ pubkey, account }) => ({
    poolAddress: pubkey,
    pool: parsePoolState(account.data),
  }));
}
