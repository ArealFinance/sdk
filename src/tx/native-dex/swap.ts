// User-signed `native-dex::swap` instruction builder.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/native-dex/src/instructions/swap.rs::Swap` and the codegen
// `SwapAccounts` struct in `programs/native-dex/instructions.generated.ts`:
//
//   0. user                 (signer, read)
//   1. dex_config           (read)        ["dex_config"]
//   2. pool_state           (mut)         ["pool", token_a_mint, token_b_mint]
//   3. user_token_in        (mut)         user's ATA for input mint
//   4. user_token_out       (mut)         user's ATA for output mint
//   5. vault_in             (mut)         pool vault for input side
//   6. vault_out            (mut)         pool vault for output side
//   7. areal_fee_account    (mut)         dex_config.areal_fee_destination
//   8. token_program        (read)        SPL token program
//
// Optional remaining accounts:
//   [0] ot_treasury_fee_destination (mut) when pool.has_ot_treasury == true
//
// Args (encoded via codegen `encodeSwapArgs`):
//   amount_in       u64 LE
//   min_amount_out  u64 LE
//   a_to_b          bool (1 byte)
//
// Discriminator: codegen `SWAP_DISCRIMINATOR` (single source of truth).
//
// This is the second user write-path (after Phase 7 claim). Distinct from
// the manager-only `nexus_swap` builder which signs with the Liquidity
// Nexus PDA — that one stays in `nexus-swap.ts`.

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import {
  isPlaceholderRwtMint,
  SPL_TOKEN_PROGRAM_ID,
} from '../../network/constants.js';
import type { ClusterName } from '../../network/clusters.js';
import { encodeSwapArgs } from '../../programs/native-dex/instructions.generated.js';

import type {
  BuildSwapIxArgs,
  BuildSwapTxArgs,
  SwapAccountContext,
} from './_swap-types.js';

export type { SwapAccountContext, BuildSwapIxArgs, BuildSwapTxArgs };

const U64_MAX = 0xffff_ffff_ffff_ffffn;

/**
 * Build the user-signed `native-dex::swap` instruction.
 *
 * Pure: no RPC, no PDA derivation. Pass the resolved pubkeys in. For a
 * higher-level helper that prepends a create-ATA-idempotent ix when the
 * user's output ATA does not yet exist (and applies the mainnet
 * placeholder guard), see `buildSwapTx`.
 */
export function buildSwapIx(args: BuildSwapIxArgs): TransactionInstruction {
  const { ctx, userTokenIn, userTokenOut, aToB, amountIn, minAmountOut } = args;

  validateAmountIn(amountIn);
  validateMinAmountOut(minAmountOut);

  const vaultIn = aToB ? ctx.vaultA : ctx.vaultB;
  const vaultOut = aToB ? ctx.vaultB : ctx.vaultA;

  const data = encodeSwapArgs({ amountIn, minAmountOut, aToB });

  const keys = [
    { pubkey: ctx.user, isSigner: true, isWritable: false },
    { pubkey: ctx.dexConfig, isSigner: false, isWritable: false },
    { pubkey: ctx.pool, isSigner: false, isWritable: true },
    { pubkey: userTokenIn, isSigner: false, isWritable: true },
    { pubkey: userTokenOut, isSigner: false, isWritable: true },
    { pubkey: vaultIn, isSigner: false, isWritable: true },
    { pubkey: vaultOut, isSigner: false, isWritable: true },
    { pubkey: ctx.arealFeeAccount, isSigner: false, isWritable: true },
    { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  // Optional OT treasury fee destination — `swap_internal` reads it from
  // `remaining_accounts[0]` and validates it equals `pool.ot_treasury_fee_destination`.
  if (ctx.otTreasuryFeeDestination) {
    keys.push({
      pubkey: ctx.otTreasuryFeeDestination,
      isSigner: false,
      isWritable: true,
    });
  }

  return new TransactionInstruction({
    programId: ctx.dexProgramId,
    keys,
    data,
  });
}

/**
 * Build a complete legacy `Transaction` for the user-signed swap flow.
 *
 * Steps:
 *   1. Mainnet placeholder guard: refuse to build a swap touching the
 *      R20 placeholder RWT mint (only the RWT side has a placeholder; if
 *      the user is trading USDC/RWT this catches the broken mint before
 *      a blockhash is wasted).
 *   2. If `ensureAta=true`, RPC-check `userTokenOut` and prepend a
 *      `createAssociatedTokenAccountIdempotent` ix when missing. The
 *      output ATA is required by the contract (`swap_internal` calls a
 *      vault→user transfer that would fail with `AccountNotInitialized`
 *      if missing); the input ATA is assumed to exist because the user
 *      must already have a balance to swap.
 *   3. Append the `buildSwapIx` output.
 *
 * Returns a legacy `Transaction` — caller sets `recentBlockhash`,
 * `feePayer`, signs, and submits.
 */
export async function buildSwapTx(args: BuildSwapTxArgs): Promise<Transaction> {
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
    const ataInfo = await args.connection.getAccountInfo(args.userTokenOut);
    if (ataInfo === null) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          args.ctx.user, // payer
          args.userTokenOut,
          args.ctx.user, // owner
          args.outputMint,
        ),
      );
    }
  }

  tx.add(
    buildSwapIx({
      ctx: args.ctx,
      userTokenIn: args.userTokenIn,
      userTokenOut: args.userTokenOut,
      aToB: args.aToB,
      amountIn: args.amountIn,
      minAmountOut: args.minAmountOut,
    }),
  );

  return tx;
}

// ───────────────────────────── validation ─────────────────────────────────

function validateAmountIn(value: bigint): void {
  if (value <= 0n) {
    throw new Error(`swap: amount_in must be > 0 (got ${value})`);
  }
  if (value > U64_MAX) {
    throw new Error(`swap: amount_in exceeds u64::MAX (got ${value})`);
  }
}

function validateMinAmountOut(value: bigint): void {
  if (value < 0n) {
    throw new Error(`swap: min_amount_out must be >= 0 (got ${value})`);
  }
  if (value > U64_MAX) {
    throw new Error(`swap: min_amount_out exceeds u64::MAX (got ${value})`);
  }
}
