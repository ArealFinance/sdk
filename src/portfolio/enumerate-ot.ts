// Enumerate every OtConfig PDA owned by the Ownership Token program.
//
// Uses the Anchor-style 8-byte discriminator as a memcmp filter so the RPC
// only returns OtConfig accounts, not the four other account types declared
// by the program. The discriminator is the literal first 8 bytes of every
// OtConfig — see `OTCONFIG_DISCRIMINATOR` in the generated parser.

import type { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

import {
  OTCONFIG_DISCRIMINATOR,
  parseOtConfig,
  type OtConfig,
} from '../programs/ownership-token/accounts.generated.js';

/**
 * Fixed on-chain size of an OtConfig account, derived from the IDL layout:
 *   8 (disc) + 32 (ot_mint) + 32 (name) + 10 (symbol) + 1 (decimals)
 *   + 8 (total_minted) + 200 (uri) + 1 (bump) = 292 bytes
 *
 * Used as a `dataSize` filter alongside the discriminator memcmp so the
 * RPC only returns accounts of exactly this type. Discriminator memcmp
 * alone is already collision-resistant; `dataSize` adds a minor bandwidth
 * saving and locks the contract to "this account type and only this".
 */
export const OTCONFIG_SIZE = 292;

export interface EnumeratedOt {
  configAddress: PublicKey;
  config: OtConfig;
}

/**
 * Fetch every OtConfig owned by `programId`.
 *
 * Throws on RPC failure — callers (e.g. `getHolderPortfolio`) should
 * decide whether to swallow the error and degrade to an empty list.
 */
export async function enumerateOtConfigs(
  conn: Connection,
  programId: PublicKey,
): Promise<EnumeratedOt[]> {
  const accounts = await conn.getProgramAccounts(programId, {
    commitment: 'confirmed',
    filters: [
      { dataSize: OTCONFIG_SIZE },
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(OTCONFIG_DISCRIMINATOR),
        },
      },
    ],
  });
  return accounts.map(({ pubkey, account }) => ({
    configAddress: pubkey,
    config: parseOtConfig(account.data),
  }));
}
