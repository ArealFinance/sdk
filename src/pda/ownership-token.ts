// Ownership Token program PDAs.
//
// All seeds keyed by the OT mint — there is one OtConfig / Revenue /
// Treasury per OT mint.

import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

/** `["ot_config", ot_mint]` OtConfig PDA. */
export function findOtConfigPda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ot_config'), otMint.toBuffer()],
    programId,
  );
}

/** `["revenue", ot_mint]` RevenueAccount PDA. */
export function findRevenueAccountPda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('revenue'), otMint.toBuffer()],
    programId,
  );
}

/** `["revenue_config", ot_mint]` RevenueConfig PDA. */
export function findRevenueConfigPda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('revenue_config'), otMint.toBuffer()],
    programId,
  );
}

/** `["ot_governance", ot_mint]` OtGovernance PDA. */
export function findOtGovernancePda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ot_governance'), otMint.toBuffer()],
    programId,
  );
}

/** `["ot_treasury", ot_mint]` OtTreasury PDA. */
export function findOtTreasuryPda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ot_treasury'), otMint.toBuffer()],
    programId,
  );
}
