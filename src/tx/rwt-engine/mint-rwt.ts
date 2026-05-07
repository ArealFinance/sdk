// User-signed `rwt-engine::mint_rwt` instruction builder.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/rwt-engine/src/instructions/mint_rwt.rs::MintRwt` and the
// codegen `MintRwtAccounts` struct in
// `programs/rwt-engine/instructions.generated.ts`:
//
//   0. user             (signer, read)
//   1. rwt_vault        (mut)        ["rwt_vault"]
//   2. rwt_mint         (mut)        vault.rwt_mint
//   3. user_deposit     (mut)        user's USDC ATA — must exist
//   4. user_rwt         (mut)        user's RWT ATA — may need bootstrap
//   5. capital_acc      (mut)        vault.capital_accumulator_ata
//   6. dao_fee_account  (mut)        vault.areal_fee_destination
//   7. token_program    (read)       SPL Token program
//
// NOTE: NO system_program in the account list. The contract does not
// allocate any new accounts on this path (the RWT ATA is bootstrapped
// off-chain by `buildMintRwtTx` via the SPL Associated Token program,
// which embeds its own system_program reference).
//
// Args (encoded via codegen `encodeMintRwtArgs`):
//   amount       u64 LE
//   min_rwt_out  u64 LE  (REQUIRED non-zero — `ZeroSlippage` else)
//
// Discriminator: codegen `MINT_RWT_DISCRIMINATOR` (single source of truth).
//
// This is the user-facing mint write-path — distinct from the admin-only
// `admin_mint_rwt` (which has no fee model and is intended for ops, not
// for the UI).

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import {
  isPlaceholderRwtMint,
  SPL_TOKEN_PROGRAM_ID,
} from '../../network/constants.js';
import { encodeMintRwtArgs } from '../../programs/rwt-engine/instructions.generated.js';

import type {
  BuildMintRwtIxArgs,
  BuildMintRwtTxArgs,
  MintRwtAccountContext,
} from './_mint-types.js';

export type { MintRwtAccountContext, BuildMintRwtIxArgs, BuildMintRwtTxArgs };

const U64_MAX = 0xffff_ffff_ffff_ffffn;

/**
 * Build the user-signed `rwt-engine::mint_rwt` instruction.
 *
 * Pure: no RPC, no PDA derivation. Pass the resolved pubkeys in. For
 * a higher-level helper that prepends a create-ATA-idempotent ix when
 * the user's RWT ATA does not yet exist (and applies the mainnet
 * placeholder guard), see `buildMintRwtTx`.
 */
export function buildMintRwtIx(args: BuildMintRwtIxArgs): TransactionInstruction {
  const { ctx, userDeposit, userRwt, amount, minRwtOut } = args;

  validateAmount(amount);
  validateMinRwtOut(minRwtOut);

  const data = encodeMintRwtArgs({ amount, minRwtOut });

  const keys = [
    { pubkey: ctx.user, isSigner: true, isWritable: false },
    { pubkey: ctx.rwtVault, isSigner: false, isWritable: true },
    { pubkey: ctx.rwtMint, isSigner: false, isWritable: true },
    { pubkey: userDeposit, isSigner: false, isWritable: true },
    { pubkey: userRwt, isSigner: false, isWritable: true },
    { pubkey: ctx.capitalAcc, isSigner: false, isWritable: true },
    { pubkey: ctx.daoFeeAccount, isSigner: false, isWritable: true },
    { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: ctx.rwtEngineProgramId,
    keys,
    data,
  });
}

/**
 * Build a complete legacy `Transaction` for the user-signed mint flow.
 *
 * Steps:
 *   1. Mainnet placeholder guard: refuse to build a mint touching the
 *      R20 placeholder RWT mint. The contract pins `vault.rwt_mint` at
 *      deploy time, so a mint against the placeholder would revert
 *      with `InvalidTokenAccount` and waste a blockhash.
 *   2. If `ensureAta=true`, RPC-check `userRwt` and prepend a
 *      `createAssociatedTokenAccountIdempotent` ix when missing. The
 *      RWT ATA is the destination of the vault's `MintTo` CPI and must
 *      exist before the contract runs (the contract does NOT bootstrap
 *      it — Arlex `MintTo::invoke_signed` requires an initialised
 *      destination account).
 *   3. Append the `buildMintRwtIx` output.
 *
 * The user's USDC ATA (`userDeposit`) is assumed to exist — the user
 * must already hold USDC to deposit, so bootstrapping it would be
 * pointless and would just waste rent.
 *
 * Returns a legacy `Transaction` — caller sets `recentBlockhash`,
 * `feePayer`, signs, and submits.
 */
export async function buildMintRwtTx(args: BuildMintRwtTxArgs): Promise<Transaction> {
  // Mainnet safety: refuse to build a tx that would consume a blockhash
  // and revert because the RWT mint is still the deploy-time placeholder.
  // Devnet/localnet pass through (placeholder IS expected there).
  if (
    args.cluster === 'mainnet' &&
    args.rwtMint &&
    isPlaceholderRwtMint(args.rwtMint)
  ) {
    throw new Error(
      'rwtMint is the R20 placeholder; mainnet RWT mint not yet deployed.',
    );
  }

  const tx = new Transaction();

  if (args.ensureAta) {
    const ataInfo = await args.connection.getAccountInfo(args.userRwt);
    if (ataInfo === null) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          args.ctx.user, // payer
          args.userRwt,
          args.ctx.user, // owner
          args.ctx.rwtMint,
        ),
      );
    }
  }

  tx.add(
    buildMintRwtIx({
      ctx: args.ctx,
      userDeposit: args.userDeposit,
      userRwt: args.userRwt,
      amount: args.amount,
      minRwtOut: args.minRwtOut,
    }),
  );

  return tx;
}

// ───────────────────────────── validation ─────────────────────────────────

function validateAmount(value: bigint): void {
  if (value <= 0n) {
    throw new Error(`mint_rwt: amount must be > 0 (got ${value})`);
  }
  if (value > U64_MAX) {
    throw new Error(`mint_rwt: amount exceeds u64::MAX (got ${value})`);
  }
}

function validateMinRwtOut(value: bigint): void {
  // The contract REQUIRES min_rwt_out > 0 (ZeroSlippage error). Reject
  // at the SDK boundary so the caller does not waste a blockhash on
  // an obviously broken slippage param.
  if (value <= 0n) {
    throw new Error(`mint_rwt: min_rwt_out must be > 0 (got ${value})`);
  }
  if (value > U64_MAX) {
    throw new Error(`mint_rwt: min_rwt_out exceeds u64::MAX (got ${value})`);
  }
}
