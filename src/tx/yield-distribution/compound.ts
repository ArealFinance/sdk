// `native_dex::compound_yield` — third claim-flow CPI wrapper. The pool PDA
// claims yield from YD and folds it into its reserve. Lives on the DEX
// program but is logically part of the YD claim crank's responsibilities.

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import { encodeClaimArgsBody, ixDiscriminator } from '../_internal/discriminator.js';

/** Pre-computed DEX::compound_yield discriminator. */
export const DEX_COMPOUND_YIELD_DISCRIMINATOR = (): Buffer =>
  ixDiscriminator('compound_yield');

export interface BuildDexCompoundArgs {
  dexProgramId: PublicKey;
  ydProgramId: PublicKey;
  crank: PublicKey;
  poolState: PublicKey;
  targetVault: PublicKey;
  ydConfig: PublicKey;
  otMint: PublicKey;
  ydDistributor: PublicKey;
  ydClaimStatus: PublicKey;
  ydRewardVault: PublicKey;

  cumulativeAmount: bigint;
  proof: Buffer[];
}

/**
 * Build `native_dex::compound_yield` instruction.
 *
 * Account order (compound_yield.rs):
 *   0. crank             (signer, mut)
 *   1. pool_state        (mut)
 *   2. target_vault      (mut)
 *   3. yd_config         (read)
 *   4. ot_mint           (read)
 *   5. yd_distributor    (mut)
 *   6. yd_claim_status   (mut)
 *   7. yd_reward_vault   (mut)
 *   8. yd_program        (read)
 *   9. token_program     (read)
 *  10. system_program    (read)
 */
export function buildDexCompoundIx(
  args: BuildDexCompoundArgs,
): TransactionInstruction {
  const data = Buffer.concat([
    DEX_COMPOUND_YIELD_DISCRIMINATOR(),
    encodeClaimArgsBody(args.cumulativeAmount, args.proof),
  ]);
  return new TransactionInstruction({
    programId: args.dexProgramId,
    keys: [
      { pubkey: args.crank, isSigner: true, isWritable: true },
      { pubkey: args.poolState, isSigner: false, isWritable: true },
      { pubkey: args.targetVault, isSigner: false, isWritable: true },
      { pubkey: args.ydConfig, isSigner: false, isWritable: false },
      { pubkey: args.otMint, isSigner: false, isWritable: false },
      { pubkey: args.ydDistributor, isSigner: false, isWritable: true },
      { pubkey: args.ydClaimStatus, isSigner: false, isWritable: true },
      { pubkey: args.ydRewardVault, isSigner: false, isWritable: true },
      { pubkey: args.ydProgramId, isSigner: false, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
