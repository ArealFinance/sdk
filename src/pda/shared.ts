// Cross-program PDA helpers — SPL ATA derivation and any other shared
// derivations that are not bound to a single Areal program.

import { PublicKey } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
} from '../network/constants.js';

/**
 * Derive the SPL Associated Token Account address for `(owner, mint)`.
 *
 * Returns `[address, bump]` to keep the helper signature uniform with the
 * other `find*Pda` helpers in this module — even though SPL ATA users
 * typically only need the address.
 */
export function findAssociatedTokenAddressPda(
  owner: PublicKey,
  mint: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), SPL_TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}
