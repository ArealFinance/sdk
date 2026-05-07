// `yield_distribution::publish_root` instruction builder.
//
// The merkle-publisher bot calls this once per distributor to update the
// active merkle root and the corresponding `max_total_claim` cap. Layer 7
// §6.4 / publish_root.rs:14.
//
// Account order (publish_root.rs:14):
//   0. publish_authority  (signer, read)
//   1. config             (read, `["dist_config"]`)
//   2. ot_mint            (read)
//   3. distributor        (mut, `["merkle_dist", ot_mint]`)
//
// Args (D6, total 40 bytes after disc):
//   merkle_root      [u8; 32]
//   max_total_claim  u64 LE
//
// Discriminator: codegen `PUBLISH_ROOT_DISCRIMINATOR` from the IDL.

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { PUBLISH_ROOT_DISCRIMINATOR } from '../../programs/yield-distribution/instructions.generated.js';

const U64_MAX = (1n << 64n) - 1n;

export interface BuildPublishRootArgs {
  ydProgramId: PublicKey;
  publishAuthority: PublicKey;
  config: PublicKey;       // `["dist_config"]`
  otMint: PublicKey;
  distributor: PublicKey;  // `["merkle_dist", ot_mint]`

  /** 32-byte merkle root. */
  merkleRoot: Uint8Array;
  /** Cumulative reward cap for this root (u64). */
  maxTotalClaim: bigint;
}

/**
 * Build `yield_distribution::publish_root` instruction.
 *
 * Instruction data layout:
 *   [disc(8) | merkle_root(32) | max_total_claim(u64 LE)] = 48 bytes total.
 */
export function buildPublishRootIx(
  args: BuildPublishRootArgs,
): TransactionInstruction {
  if (args.merkleRoot.length !== 32) {
    throw new Error(`merkleRoot must be 32 bytes, got ${args.merkleRoot.length}`);
  }
  if (args.maxTotalClaim < 0n || args.maxTotalClaim > U64_MAX) {
    throw new Error(`max_total_claim out of range u64: ${args.maxTotalClaim}`);
  }

  const data = Buffer.alloc(8 + 32 + 8);
  Buffer.from(PUBLISH_ROOT_DISCRIMINATOR).copy(data, 0);
  Buffer.from(args.merkleRoot).copy(data, 8);
  data.writeBigUInt64LE(args.maxTotalClaim, 8 + 32);

  return new TransactionInstruction({
    programId: args.ydProgramId,
    keys: [
      { pubkey: args.publishAuthority, isSigner: true, isWritable: false },
      { pubkey: args.config, isSigner: false, isWritable: false },
      { pubkey: args.otMint, isSigner: false, isWritable: false },
      { pubkey: args.distributor, isSigner: false, isWritable: true },
    ],
    data,
  });
}
