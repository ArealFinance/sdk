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
