// Well-known cross-program addresses used by tx builders and PDA helpers.
//
// Keep these as PublicKey instances (not strings) so callers can pass them
// straight into `TransactionInstruction.keys` without re-wrapping.

import { PublicKey } from '@solana/web3.js';
import type { ClusterName } from './clusters.js';

/** SPL Token v1 program ID. Used by every CPI that touches token accounts. */
export const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

/** SPL Associated Token Account program ID. */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

/** System program ID — `11111111111111111111111111111111`. */
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

/**
 * USDC mint per cluster. Localnet reuses the devnet mint by convention so
 * tests and bots can share fixtures across the two environments.
 */
export const USDC_MINTS: Record<ClusterName, PublicKey> = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  localnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};
