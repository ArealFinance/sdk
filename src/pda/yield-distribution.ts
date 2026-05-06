// Yield Distribution program PDAs.

import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

/** `["dist_config"]` singleton — global YD config. */
export function findYdConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('dist_config')],
    programId,
  );
}

/**
 * `["merkle_dist", ot_mint]` MerkleDistributor PDA.
 *
 * One distributor per OT mint per epoch (the active epoch is on the
 * distributor account itself).
 */
export function findMerkleDistributorPda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('merkle_dist'), otMint.toBuffer()],
    programId,
  );
}

/** `["accumulator", ot_mint]` YD accumulator PDA. */
export function findYdAccumulatorPda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('accumulator'), otMint.toBuffer()],
    programId,
  );
}

/** `["claim_status", distributor, claimant]` ClaimStatus PDA. */
export function findClaimStatusPda(
  distributor: PublicKey,
  claimant: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('claim_status'), distributor.toBuffer(), claimant.toBuffer()],
    programId,
  );
}

/**
 * `["liq_holding"]` singleton (Layer 8, D11.1) — single global pot, no
 * `ot_mint` in seeds.
 */
export function findLiquidityHoldingPda(
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('liq_holding')],
    programId,
  );
}
