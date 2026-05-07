// Holder-facing `yield_distribution::claim` instruction.
//
// This is the write-path for the Portfolio "Claim" button: a wallet-signed
// claim of vested RWT against a published Merkle root. Distinct from the
// crank wrappers in `claim.ts` (RWT::claim_yield, OT::claim_yd_for_treasury,
// DEX::compound_yield), which are CPI wrappers with extra accounts and a
// different signer (the crank, not the holder).
//
// Account order — POSITION-SENSITIVE — mirrors `contracts/yield-distribution
// /src/instructions/claim.rs::Claim`:
//   0. claimant       (signer, read)   holder wallet
//   1. payer          (signer, mut)    pays rent for ClaimStatus init (may = claimant)
//   2. config         (read)           ["dist_config"]
//   3. ot_mint        (read)
//   4. distributor    (mut)            ["merkle_dist", ot_mint]
//   5. claim_status   (mut)            ["claim_status", distributor, claimant]
//   6. reward_vault   (mut)            distributor.reward_vault
//   7. claimant_token (mut)            holder's RWT ATA
//   8. token_program  (read)
//   9. system_program (read)
//
// Args (encoded via codegen `encodeClaimArgs`):
//   cumulative_amount  u64 LE
//   proof              vec<[u8; 32]>   (u32 LE length + N * 32 bytes)
//
// Discriminator: codegen `CLAIM_DISCRIMINATOR` (single source of truth).
//
// The contract caps `proof.len() <= MAX_PROOF_LEN = 20` (constants.rs:12).
// We reject longer proofs in the builder to fail fast with a friendlier
// error than `ProofTooLong` from a simulated tx.

import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import { encodeClaimArgs } from '../../programs/yield-distribution/instructions.generated.js';

/** Mirror of `contracts/yield-distribution/src/constants.rs::MAX_PROOF_LEN`. */
export const MAX_PROOF_LEN = 20;

export interface BuildClaimDistributionArgs {
  ydProgramId: PublicKey;

  /** Holder wallet (signer). Receives RWT into `claimantToken`. */
  claimant: PublicKey;
  /**
   * Payer for the ClaimStatus rent on first claim (signer, writable). Most
   * holder flows pass the same key as `claimant`; a separate payer is only
   * useful when a sponsor pays rent on behalf of the claimant.
   */
  payer: PublicKey;

  /** `["dist_config"]` PDA. */
  config: PublicKey;
  /** OT mint the distributor was opened against. */
  otMint: PublicKey;
  /** `["merkle_dist", ot_mint]` PDA. */
  distributor: PublicKey;
  /** `["claim_status", distributor, claimant]` PDA. */
  claimStatus: PublicKey;
  /** Distributor's reward vault (RWT). */
  rewardVault: PublicKey;
  /** Claimant's RWT ATA. */
  claimantToken: PublicKey;

  /** Total RWT entitlement at the active root (cumulative, not delta). */
  cumulativeAmount: bigint;
  /** Merkle proof nodes — each MUST be exactly 32 bytes; max 20 nodes. */
  proof: Uint8Array[];
}

/**
 * Build the holder-facing `yield_distribution::claim` instruction.
 *
 * Pure: no RPC, no PDA derivation. Pass the PDAs in. For a higher-level
 * helper that derives PDAs and prepends a create-ATA-idempotent ix when
 * the holder's RWT ATA does not yet exist, see `buildClaimTx`.
 */
export function buildClaimDistributionIx(
  args: BuildClaimDistributionArgs,
): TransactionInstruction {
  if (args.proof.length > MAX_PROOF_LEN) {
    throw new Error(
      `proof too long: ${args.proof.length} nodes exceeds MAX_PROOF_LEN=${MAX_PROOF_LEN}`,
    );
  }
  for (let i = 0; i < args.proof.length; i++) {
    const node = args.proof[i]!;
    if (node.length !== 32) {
      throw new Error(
        `proof node at index ${i} has length ${node.length}, expected 32`,
      );
    }
  }

  // Codegen `encodeClaimArgs` returns discriminator + serialized args.
  // It is the single source of truth for the wire format — do NOT
  // hand-encode here, the IDL/wire mapping is non-trivial (snake/camel
  // remap + nested vec/array layout via TYPE_REGISTRY).
  const data = encodeClaimArgs({
    cumulativeAmount: args.cumulativeAmount,
    proof: args.proof,
  });

  return new TransactionInstruction({
    programId: args.ydProgramId,
    keys: [
      { pubkey: args.claimant, isSigner: true, isWritable: false },
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.config, isSigner: false, isWritable: false },
      { pubkey: args.otMint, isSigner: false, isWritable: false },
      { pubkey: args.distributor, isSigner: false, isWritable: true },
      { pubkey: args.claimStatus, isSigner: false, isWritable: true },
      { pubkey: args.rewardVault, isSigner: false, isWritable: true },
      { pubkey: args.claimantToken, isSigner: false, isWritable: true },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
