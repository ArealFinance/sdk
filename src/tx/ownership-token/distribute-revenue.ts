// `ownership_token::distribute_revenue` instruction builder.
//
// The revenue-crank bot calls this once per OT to fan-out USDC accumulated in
// the OT's `RevenueAccount` PDA to its configured destinations. Layer 7 §6.2.
//
// 7 fixed accounts (handler order, distribute_revenue.rs:9):
//   0. crank                  (signer, mut)
//   1. ot_mint                (read)
//   2. revenue_account        (mut)   — `["revenue", ot_mint]`
//   3. revenue_token_account  (mut)   — USDC ATA owned by revenue_account
//   4. revenue_config         (read)  — `["revenue_config", ot_mint]`
//   5. areal_fee_account      (mut)   — must equal config.areal_fee_destination
//   6. token_program          (read)
// + remaining_accounts: each active destination ATA, in active order.
//
// Discriminator: codegen `DISTRIBUTE_REVENUE_DISCRIMINATOR` from the IDL.
// Args: empty (the handler reads everything from on-chain state).

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import { DISTRIBUTE_REVENUE_DISCRIMINATOR } from '../../programs/ownership-token/instructions.generated.js';

export interface BuildDistributeRevenueArgs {
  otProgramId: PublicKey;
  crank: PublicKey;
  otMint: PublicKey;
  revenueAccount: PublicKey;
  revenueTokenAccount: PublicKey;
  revenueConfig: PublicKey;
  arealFeeDestination: PublicKey;
  /** Each active destination ATA, in active order, appended as remaining_accounts. */
  destinations: ReadonlyArray<PublicKey>;
}

/**
 * Build `ownership_token::distribute_revenue` instruction.
 *
 * Instruction data: just the 8-byte discriminator (no args).
 */
export function buildDistributeRevenueIx(
  args: BuildDistributeRevenueArgs,
): TransactionInstruction {
  if (args.destinations.length === 0) {
    throw new Error('distribute_revenue requires at least one destination');
  }

  const data = Buffer.from(DISTRIBUTE_REVENUE_DISCRIMINATOR);

  return new TransactionInstruction({
    programId: args.otProgramId,
    keys: [
      { pubkey: args.crank, isSigner: true, isWritable: true },
      { pubkey: args.otMint, isSigner: false, isWritable: false },
      { pubkey: args.revenueAccount, isSigner: false, isWritable: true },
      { pubkey: args.revenueTokenAccount, isSigner: false, isWritable: true },
      { pubkey: args.revenueConfig, isSigner: false, isWritable: false },
      { pubkey: args.arealFeeDestination, isSigner: false, isWritable: true },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ...args.destinations.map((address) => ({
        pubkey: address,
        isSigner: false,
        isWritable: true,
      })),
    ],
    data,
  });
}
