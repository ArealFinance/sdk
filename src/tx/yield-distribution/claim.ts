// Claim-flow CPI wrapper instructions called by the yield-claim-crank bot.
//
// These three instructions all share the YD::claim arg layout but live on
// different host programs:
//   1. `rwt_engine::claim_yield`           — RwtVault PDA claims, splits 70/15/15
//   2. `ownership_token::claim_yd_for_treasury` — OtTreasury claims yield
//
// Discriminators are computed via sha256("global:<name>")[..8] because these
// CPI wrappers are not declared in the host program's IDL (they exist only
// as entrypoints invoked by the crank).
//
// Account orderings mirror the on-chain handler — POSITION-SENSITIVE — and
// are validated against `contracts/<program>/src/instructions/<ix>.rs`.

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import { encodeClaimArgsBody, ixDiscriminator } from '../_internal/discriminator.js';

/** Pre-computed RWT::claim_yield discriminator. */
export const RWT_CLAIM_YIELD_DISCRIMINATOR = (): Buffer =>
  ixDiscriminator('claim_yield');
/** Pre-computed OT::claim_yd_for_treasury discriminator. */
export const OT_CLAIM_YD_FOR_TREASURY_DISCRIMINATOR = (): Buffer =>
  ixDiscriminator('claim_yd_for_treasury');

// ─────────────────── RWT::claim_yield ───────────────────────

export interface BuildRwtClaimYieldArgs {
  rwtEngineProgramId: PublicKey;
  ydProgramId: PublicKey;
  crank: PublicKey;
  rwtVault: PublicKey;
  distConfig: PublicKey;
  rwtClaimAta: PublicKey;
  liquidityDest: PublicKey;
  protocolRevenueDest: PublicKey;
  ydConfig: PublicKey;
  otMint: PublicKey;
  ydDistributor: PublicKey;
  ydClaimStatus: PublicKey;
  ydRewardVault: PublicKey;

  cumulativeAmount: bigint;
  proof: Buffer[];
}

/**
 * Build `rwt_engine::claim_yield` instruction.
 *
 * Account order (claim_yield.rs):
 *   0. crank                  (signer, mut)
 *   1. rwt_vault              (mut)
 *   2. dist_config            (read)
 *   3. rwt_claim_ata          (mut)
 *   4. liquidity_dest         (mut)
 *   5. protocol_revenue_dest  (mut)
 *   6. yd_config              (read)
 *   7. ot_mint                (read)
 *   8. yd_distributor         (mut)
 *   9. yd_claim_status        (mut)
 *  10. yd_reward_vault        (mut)
 *  11. yd_program             (read)
 *  12. token_program          (read)
 *  13. system_program         (read)
 */
export function buildRwtClaimYieldIx(
  args: BuildRwtClaimYieldArgs,
): TransactionInstruction {
  const data = Buffer.concat([
    RWT_CLAIM_YIELD_DISCRIMINATOR(),
    encodeClaimArgsBody(args.cumulativeAmount, args.proof),
  ]);
  return new TransactionInstruction({
    programId: args.rwtEngineProgramId,
    keys: [
      { pubkey: args.crank, isSigner: true, isWritable: true },
      { pubkey: args.rwtVault, isSigner: false, isWritable: true },
      { pubkey: args.distConfig, isSigner: false, isWritable: false },
      { pubkey: args.rwtClaimAta, isSigner: false, isWritable: true },
      { pubkey: args.liquidityDest, isSigner: false, isWritable: true },
      { pubkey: args.protocolRevenueDest, isSigner: false, isWritable: true },
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

// ─────────────── OT::claim_yd_for_treasury ──────────────────

export interface BuildOtTreasuryClaimArgs {
  otProgramId: PublicKey;
  ydProgramId: PublicKey;
  crank: PublicKey;
  /** Mint of the treasury performing the claim (used to derive OtTreasury PDA). */
  otMint: PublicKey;
  otTreasury: PublicKey;
  treasuryRwtAta: PublicKey;
  ydConfig: PublicKey;
  /** Mint of the OT distributor we claim FROM (may differ from otMint). */
  ydOtMint: PublicKey;
  ydDistributor: PublicKey;
  ydClaimStatus: PublicKey;
  ydRewardVault: PublicKey;

  cumulativeAmount: bigint;
  proof: Buffer[];
}

/**
 * Build `ownership_token::claim_yd_for_treasury` instruction.
 *
 * Account order (claim_yd_for_treasury.rs):
 *   0. crank             (signer, mut)
 *   1. ot_mint           (read)
 *   2. ot_treasury       (read)
 *   3. treasury_rwt_ata  (mut)
 *   4. yd_config         (read)
 *   5. yd_ot_mint        (read)
 *   6. yd_distributor    (mut)
 *   7. yd_claim_status   (mut)
 *   8. yd_reward_vault   (mut)
 *   9. yd_program        (read)
 *  10. token_program     (read)
 *  11. system_program    (read)
 */
export function buildOtTreasuryClaimIx(
  args: BuildOtTreasuryClaimArgs,
): TransactionInstruction {
  const data = Buffer.concat([
    OT_CLAIM_YD_FOR_TREASURY_DISCRIMINATOR(),
    encodeClaimArgsBody(args.cumulativeAmount, args.proof),
  ]);
  return new TransactionInstruction({
    programId: args.otProgramId,
    keys: [
      { pubkey: args.crank, isSigner: true, isWritable: true },
      { pubkey: args.otMint, isSigner: false, isWritable: false },
      { pubkey: args.otTreasury, isSigner: false, isWritable: false },
      { pubkey: args.treasuryRwtAta, isSigner: false, isWritable: true },
      { pubkey: args.ydConfig, isSigner: false, isWritable: false },
      { pubkey: args.ydOtMint, isSigner: false, isWritable: false },
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
