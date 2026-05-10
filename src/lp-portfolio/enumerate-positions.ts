// Enumerate every LpPosition PDA owned by the Native DEX program for a
// specific holder.
//
// Mirrors the pattern of `portfolio/enumerate-ot.ts` and
// `markets/enumerate-pools.ts`: an Anchor-style 8-byte discriminator
// memcmp filter so the RPC only returns LpPosition accounts (not
// DexConfig / PoolCreators / PoolState / BinArray / LiquidityNexus). On
// top of that, we add a memcmp on the `owner` field at offset 40 so the
// RPC returns ONLY positions owned by `holder` — enumerating every LP
// position on the program and filtering client-side would scale poorly.
//
// `dataSize` is included as a defense-in-depth filter: the discriminator
// is already collision-resistant, but pinning the byte length to the
// LpPosition layout locks the result strictly to "this account type".

import type { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

import {
  LPPOSITION_DISCRIMINATOR,
  parseLpPosition,
  type LpPosition,
} from '../programs/native-dex/accounts.generated.js';

/**
 * Fixed on-chain size of an LpPosition account, derived from the borsh
 * layout in `IDL_LPPOSITION_FIELDS` (accounts.generated.ts ~L430):
 *   8  (disc)
 * + 32 (pool)
 * + 32 (owner)
 * + 16 (shares u128)
 * +  8 (last_update_ts i64)
 * +  1 (bump)
 * + 16 (fees_claimed_per_share_a u128)
 * + 16 (fees_claimed_per_share_b u128)
 * = 129 bytes.
 *
 * Borsh deserializes sequentially with NO padding (see
 * `@arlex/client/codegen-runtime::deserializeAccount`), so the on-wire
 * size matches the field-sum exactly. Verified against:
 *   - the field list in `IDL_LPPOSITION_FIELDS` (accounts.generated.ts L430-L468)
 *   - the same arithmetic that gives PoolState=252 (verified in the
 *     existing `markets/enumerate-pools.ts` constant) and OtConfig=292.
 */
export const LP_POSITION_SIZE = 129;

/**
 * Byte offset of LpPosition.owner inside the account data.
 *   8 (disc) + 32 (pool) = 40.
 *
 * Pinned to the wire-field order in `IDL_LPPOSITION_FIELDS`
 * (accounts.generated.ts L430). If a future codegen pass reorders fields,
 * this constant MUST be updated in lockstep.
 */
export const LP_POSITION_OWNER_OFFSET = 40;

/**
 * Result of enumerating one LpPosition PDA on-chain.
 *
 * `positionAddress` is the PDA address itself, exposed so callers can
 * subscribe directly via `connection.onAccountChange(positionAddress, ...)`
 * without re-walking PDA seeds.
 */
export interface EnumeratedLpPosition {
  positionAddress: PublicKey;
  position: LpPosition;
}

/**
 * Fetch every LpPosition owned by `programId` whose `owner` field equals
 * `holder`. Uses a server-side memcmp filter on `owner` so we never pull
 * positions for other wallets across the wire.
 *
 * Throws on RPC failure — callers (e.g. `getHolderLpPortfolio`) should
 * decide whether to swallow the error and degrade to an empty list.
 */
export async function enumerateHolderLpPositions(
  conn: Connection,
  holder: PublicKey,
  programId: PublicKey,
): Promise<EnumeratedLpPosition[]> {
  const accounts = await conn.getProgramAccounts(programId, {
    commitment: 'confirmed',
    filters: [
      { dataSize: LP_POSITION_SIZE },
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(LPPOSITION_DISCRIMINATOR),
        },
      },
      {
        memcmp: {
          offset: LP_POSITION_OWNER_OFFSET,
          bytes: holder.toBase58(),
        },
      },
    ],
  });
  return accounts.map(({ pubkey, account }) => ({
    positionAddress: pubkey,
    position: parseLpPosition(account.data),
  }));
}
