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

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import {
  isPlaceholderRwtMint,
  SPL_TOKEN_PROGRAM_ID,
} from '../../network/constants.js';
import type { ClusterName } from '../../network/clusters.js';
import {
  findAssociatedTokenAddressPda,
  findClaimStatusPda,
  findMerkleDistributorPda,
  findYdConfigPda,
} from '../../pda/index.js';
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

// ────────────────────── buildClaimTx convenience ──────────────────────

export interface BuildClaimTxArgs {
  /** RPC connection — used only when `ensureAta=true` to look up the ATA. */
  connection: Connection;

  /** YD program id (per cluster). */
  ydProgramId: PublicKey;
  /** OT mint the holder is claiming against. */
  otMint: PublicKey;
  /** RWT mint (per cluster — see `RWT_MINTS`). */
  rwtMint: PublicKey;
  /** Holder wallet — signer + claimant. */
  claimant: PublicKey;
  /** Distributor's reward vault (RWT). Read from on-chain MerkleDistributor. */
  rewardVault: PublicKey;

  /** Total RWT entitlement at the active root (cumulative, not delta). */
  cumulativeAmount: bigint;
  /**
   * Merkle proof nodes as hex strings (one per node, optional `0x` prefix,
   * 64 hex chars each). Most proof-store responses already serialize nodes
   * as hex; we decode here so callers don't have to.
   */
  proofHex: string[];

  /**
   * Optional alternate payer for the ClaimStatus rent. Defaults to
   * `claimant`. The payer is always a signer.
   */
  payer?: PublicKey;

  /**
   * When true, look up the holder's RWT ATA and prepend a
   * createAssociatedTokenAccountIdempotent ix if it does not exist yet.
   * Skipping this saves one RPC roundtrip when the caller already knows
   * the ATA is initialised. Defaults to false.
   */
  ensureAta?: boolean;

  /**
   * Optional safety check. When set to `'mainnet'` and the provided
   * `rwtMint` matches the R20 placeholder bytes, the builder throws rather
   * than producing a tx that will fail on-chain with `InvalidTokenAccount`
   * once a real RWT mint is deployed. Devnet and localnet pass through
   * unchanged — the placeholder IS the expected mint there. Omitting the
   * field preserves backwards-compatible behavior (no guard).
   */
  cluster?: ClusterName;
}

const HEX_RE = /^[0-9a-fA-F]+$/;

function decodeProofHex(proofHex: string[]): Uint8Array[] {
  const out: Uint8Array[] = new Array(proofHex.length);
  for (let i = 0; i < proofHex.length; i++) {
    let s = proofHex[i]!;
    if (s.startsWith('0x') || s.startsWith('0X')) s = s.slice(2);
    if (s.length !== 64) {
      throw new Error(
        `proof[${i}]: hex string has length ${s.length}, expected 64 (32 bytes)`,
      );
    }
    if (!HEX_RE.test(s)) {
      throw new Error(`proof[${i}]: not a hex string`);
    }
    const bytes = new Uint8Array(32);
    for (let j = 0; j < 32; j++) {
      bytes[j] = parseInt(s.slice(j * 2, j * 2 + 2), 16);
    }
    out[i] = bytes;
  }
  return out;
}

/**
 * Build a complete legacy `Transaction` for the holder claim flow.
 *
 * Steps:
 *   1. Decode hex-encoded proof nodes into `Uint8Array[]`.
 *   2. Derive the YD config / distributor / claim_status / claimant ATA PDAs.
 *   3. If `ensureAta=true`, RPC-check the claimant ATA; if missing, prepend
 *      a `createAssociatedTokenAccountIdempotent` ix.
 *   4. Append the `buildClaimDistributionIx` output.
 *
 * Returns a legacy `Transaction` (NOT versioned) — caller is responsible
 * for setting `recentBlockhash`, `feePayer`, signing, and submission.
 */
export async function buildClaimTx(
  args: BuildClaimTxArgs,
): Promise<Transaction> {
  const proof = decodeProofHex(args.proofHex);

  // Mainnet safety guard: refuse to build a claim tx against the R20
  // placeholder mint. Submitting it on mainnet would cost a blockhash and
  // revert with `InvalidTokenAccount` once the real RWT mint is deployed.
  // Devnet/localnet intentionally use the placeholder, so they skip this.
  if (args.cluster === 'mainnet' && isPlaceholderRwtMint(args.rwtMint)) {
    throw new Error(
      'rwtMint is the R20 placeholder; mainnet RWT mint not yet deployed.',
    );
  }

  const payer = args.payer ?? args.claimant;

  const [config] = findYdConfigPda(args.ydProgramId);
  const [distributor] = findMerkleDistributorPda(args.otMint, args.ydProgramId);
  const [claimStatus] = findClaimStatusPda(
    distributor,
    args.claimant,
    args.ydProgramId,
  );
  const [claimantToken] = findAssociatedTokenAddressPda(
    args.claimant,
    args.rwtMint,
  );

  const tx = new Transaction();

  if (args.ensureAta) {
    const ataInfo = await args.connection.getAccountInfo(claimantToken);
    if (ataInfo === null) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          payer,
          claimantToken,
          args.claimant,
          args.rwtMint,
        ),
      );
    }
  }

  tx.add(
    buildClaimDistributionIx({
      ydProgramId: args.ydProgramId,
      claimant: args.claimant,
      payer,
      config,
      otMint: args.otMint,
      distributor,
      claimStatus,
      rewardVault: args.rewardVault,
      claimantToken,
      cumulativeAmount: args.cumulativeAmount,
      proof,
    }),
  );

  return tx;
}
