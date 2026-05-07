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

/**
 * RWT mint per cluster.
 *
 * The RWT mint is pinned at compile time inside the Yield Distribution
 * program (see `contracts/yield-distribution/src/constants.rs::RWT_MINT`).
 * Devnet and localnet builds carry the R20 placeholder bytes
 * `"RWT" + 28 * 0x00 + 0x01`, which base58-encode to the address below.
 *
 * Mainnet still uses the same placeholder until the production RWT mint
 * is deployed and the contract is rebuilt. SDK consumers MUST guard
 * mainnet writes with `isPlaceholderRwtMint` until that happens.
 */
export const RWT_MINTS: Record<ClusterName, PublicKey> = {
  // PLACEHOLDER — replaced at mainnet deploy. Same bytes as devnet/localnet
  // until the production RWT mint exists; `isPlaceholderRwtMint` flags this.
  mainnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
  devnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
  localnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
};

/**
 * Base58 of the on-chain `RWT_MINT` R20 placeholder bytes. Anything that
 * matches this address is the devnet/localnet placeholder, NOT a real
 * mainnet RWT mint — see `isPlaceholderRwtMint`.
 */
const RWT_PLACEHOLDER_BASE58 = '6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4';

/**
 * Returns true when `pk` matches the R20 placeholder bytes pinned in the
 * Yield Distribution program. SDK consumers SHOULD check this before
 * submitting any RWT-touching transaction on mainnet — submitting a claim
 * against the placeholder mint will revert on-chain (the contract verifies
 * `claimant_token.mint == RWT_MINT`).
 */
export function isPlaceholderRwtMint(pk: PublicKey): boolean {
  return pk.toBase58() === RWT_PLACEHOLDER_BASE58;
}
