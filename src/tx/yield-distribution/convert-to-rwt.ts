// `yield_distribution::convert_to_rwt` instruction builder.
//
// Layer 8 §5.1 — converts per-distributor accumulated USDC revenue into RWT.
// The Accumulator PDA owns the USDC stockpile and signs two CPIs:
//   1. `cpi::cpi_dex_swap` → `native_dex::swap` (when `swap_first == true`)
//   2. `cpi::cpi_rwt_mint` → `rwt_engine::mint_rwt` for any USDC remaining.
//
// The handler then snapshots the RWT delta, computes the YD protocol fee, and
// PDA-signs two SPL Token transfers (fee + reward_vault).
//
// Account ordering MUST match `contracts/yield-distribution/src/instructions/
// convert_to_rwt.rs:81` exactly (22 accounts).
//
// Discriminator: `sha256("global:convert_to_rwt")[..8]` — the instruction is
// not in the YD program's IDL (it's a Layer 8 entrypoint kept off the IDL to
// preserve a stable public surface), so we mirror the on-chain Anchor naming.
//
// `rwt_mint.isWritable = true` (R-2): the inner `cpi_rwt_mint` invokes
// `RWT::mint_rwt` which mutates the mint's supply field. Solana CPI rules
// forbid escalating writable privileges, so the outer ix must pre-flag it.

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import { ixDiscriminator } from '../_internal/discriminator.js';

const U64_MAX = (1n << 64n) - 1n;

/** Pre-computed `convert_to_rwt` discriminator (lazy, cached). */
export const CONVERT_TO_RWT_DISCRIMINATOR = (): Buffer =>
  ixDiscriminator('convert_to_rwt');

export interface BuildConvertToRwtArgs {
  // Programs
  ydProgramId: PublicKey;
  dexProgramId: PublicKey;
  rwtEngineProgramId: PublicKey;

  // Accounts (in handler order)
  crank: PublicKey;
  config: PublicKey;            // YD `["dist_config"]`
  distributor: PublicKey;       // `["merkle_dist", ot_mint]`
  otMint: PublicKey;
  accumulator: PublicKey;       // `["accumulator", ot_mint]`
  accumulatorUsdcAta: PublicKey;
  accumulatorRwtAta: PublicKey;
  feeAccount: PublicKey;        // YD protocol fee destination (RWT ATA)
  rewardVault: PublicKey;       // distributor.reward_vault
  rwtMint: PublicKey;
  dexConfig: PublicKey;
  poolState: PublicKey;
  dexPoolVaultIn: PublicKey;
  dexPoolVaultOut: PublicKey;
  dexArealFeeAccount: PublicKey;
  rwtVault: PublicKey;          // `["rwt_vault"]`
  rwtCapitalAcc: PublicKey;
  rwtDaoFeeAccount: PublicKey;

  // Args (D7)
  usdcAmount: bigint;
  minRwtOut: bigint;
  swapFirst: boolean;
}

/**
 * Build `yield_distribution::convert_to_rwt` instruction.
 *
 * Account order (convert_to_rwt.rs:81):
 *   0.  crank                 (signer, mut)
 *   1.  config                (read)
 *   2.  distributor           (mut)
 *   3.  ot_mint               (read)
 *   4.  accumulator           (read PDA)
 *   5.  accumulator_usdc_ata  (mut)
 *   6.  accumulator_rwt_ata   (mut)
 *   7.  fee_account           (mut)
 *   8.  reward_vault          (mut)
 *   9.  rwt_mint              (MUT — R-2 CPI escalation)
 *  10.  dex_config            (read)
 *  11.  pool_state            (mut)
 *  12.  dex_pool_vault_in     (mut)
 *  13.  dex_pool_vault_out    (mut)
 *  14.  dex_areal_fee_account (mut)
 *  15.  rwt_vault             (mut)
 *  16.  rwt_capital_acc       (mut)
 *  17.  rwt_dao_fee_account   (mut)
 *  18.  dex_program           (read)
 *  19.  rwt_engine_program    (read)
 *  20.  token_program         (read)
 *  21.  system_program        (read)
 *
 * Args layout (D7):
 *   [disc(8) | usdc_amount(u64 LE) | min_rwt_out(u64 LE) | swap_first(u8)]
 *   = 25 bytes total.
 */
export function buildConvertToRwtIx(
  args: BuildConvertToRwtArgs,
): TransactionInstruction {
  if (args.usdcAmount < 0n || args.usdcAmount > U64_MAX) {
    throw new Error(`usdc_amount out of range u64: ${args.usdcAmount}`);
  }
  if (args.minRwtOut < 0n || args.minRwtOut > U64_MAX) {
    throw new Error(`min_rwt_out out of range u64: ${args.minRwtOut}`);
  }

  const data = Buffer.alloc(8 + 8 + 8 + 1);
  CONVERT_TO_RWT_DISCRIMINATOR().copy(data, 0);
  data.writeBigUInt64LE(args.usdcAmount, 8);
  data.writeBigUInt64LE(args.minRwtOut, 16);
  data.writeUInt8(args.swapFirst ? 1 : 0, 24);

  return new TransactionInstruction({
    programId: args.ydProgramId,
    keys: [
      { pubkey: args.crank, isSigner: true, isWritable: true },
      { pubkey: args.config, isSigner: false, isWritable: false },
      { pubkey: args.distributor, isSigner: false, isWritable: true },
      { pubkey: args.otMint, isSigner: false, isWritable: false },
      { pubkey: args.accumulator, isSigner: false, isWritable: false },
      { pubkey: args.accumulatorUsdcAta, isSigner: false, isWritable: true },
      { pubkey: args.accumulatorRwtAta, isSigner: false, isWritable: true },
      { pubkey: args.feeAccount, isSigner: false, isWritable: true },
      { pubkey: args.rewardVault, isSigner: false, isWritable: true },
      // R-2: rwt_mint MUST be writable — the inner cpi_rwt_mint invokes
      // RWT::mint_rwt which mutates the mint's supply field. CPI cannot
      // escalate writable privilege, so the outer ix must pre-flag it.
      { pubkey: args.rwtMint, isSigner: false, isWritable: true },
      { pubkey: args.dexConfig, isSigner: false, isWritable: false },
      { pubkey: args.poolState, isSigner: false, isWritable: true },
      { pubkey: args.dexPoolVaultIn, isSigner: false, isWritable: true },
      { pubkey: args.dexPoolVaultOut, isSigner: false, isWritable: true },
      { pubkey: args.dexArealFeeAccount, isSigner: false, isWritable: true },
      { pubkey: args.rwtVault, isSigner: false, isWritable: true },
      { pubkey: args.rwtCapitalAcc, isSigner: false, isWritable: true },
      { pubkey: args.rwtDaoFeeAccount, isSigner: false, isWritable: true },
      { pubkey: args.dexProgramId, isSigner: false, isWritable: false },
      { pubkey: args.rwtEngineProgramId, isSigner: false, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
