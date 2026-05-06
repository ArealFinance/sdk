// Futarchy program PDAs — proposal markets per OT.

import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

/** `["futarchy_config", ot_mint]` per-OT futarchy config. */
export function findFutarchyConfigPda(
  otMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('futarchy_config'), otMint.toBuffer()],
    programId,
  );
}

/**
 * `["proposal", config, u64_le(proposal_id)]` proposal PDA.
 *
 * `proposalId` is encoded little-endian as 8 bytes — matches the on-chain
 * `seeds = [..., &proposal_id.to_le_bytes()]` clause.
 */
export function findProposalPda(
  configPda: PublicKey,
  proposalId: bigint,
  programId: PublicKey,
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(proposalId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), configPda.toBuffer(), idBuffer],
    programId,
  );
}
