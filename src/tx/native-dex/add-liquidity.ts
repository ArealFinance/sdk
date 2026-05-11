// User-signed `native-dex::add_liquidity` instruction builder.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/native-dex/src/instructions/add_liquidity.rs::AddLiquidity`
// and the codegen `AddLiquidityAccounts` struct in
// `programs/native-dex/instructions.generated.ts`:
//
//   0. provider          (signer, !writable)
//   1. payer             (signer, writable)            — defaults to provider
//   2. dex_config        (read)                         ["dex_config"]
//   3. pool_state        (writable)                     ["pool", token_a_mint, token_b_mint]
//   4. lp_position       (writable; init from payer rent if `data_len == 0`)
//   5. provider_token_a  (writable)                     provider's ATA for token_a
//   6. provider_token_b  (writable)                     provider's ATA for token_b
//   7. vault_a           (writable)                     pool vault for token_a
//   8. vault_b           (writable)                     pool vault for token_b
//   9. token_program     (read)                         SPL token program
//  10. system_program    (read)                         system program (rent for lp_position)
//
// Args (encoded via codegen `encodeAddLiquidityArgs`):
//   amount_a     u64 LE
//   amount_b     u64 LE
//   min_shares   u128 LE
//
// Discriminator: codegen `ADD_LIQUIDITY_DISCRIMINATOR` (single source of truth).

import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import {
  isPlaceholderRwtMint,
  SPL_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
} from '../../network/constants.js';
import { encodeAddLiquidityArgs } from '../../programs/native-dex/instructions.generated.js';

import type {
  AddLiquidityAccountContext,
  BuildAddLiquidityIxArgs,
  BuildAddLiquidityTxArgs,
} from './_lp-types.js';

export type {
  AddLiquidityAccountContext,
  BuildAddLiquidityIxArgs,
  BuildAddLiquidityTxArgs,
};

const U64_MAX = 0xffff_ffff_ffff_ffffn;
const U128_MAX = (1n << 128n) - 1n;

/**
 * Build the user-signed `native-dex::add_liquidity` instruction.
 *
 * Pure: no RPC, no PDA derivation. Pass the resolved pubkeys in. For a
 * higher-level helper that prepends create-ATA-idempotent ix(s) when
 * the provider's token ATAs do not yet exist (and applies the mainnet
 * placeholder guard), see `buildAddLiquidityTx`.
 */
export function buildAddLiquidityIx(
  args: BuildAddLiquidityIxArgs,
): TransactionInstruction {
  const { ctx, amountA, amountB, minShares } = args;

  validateU64('amount_a', amountA);
  validateU64('amount_b', amountB);
  validateMinShares(minShares);

  const payer = ctx.payer ?? ctx.provider;

  const data = encodeAddLiquidityArgs({ amountA, amountB, minShares });

  const keys = [
    { pubkey: ctx.provider, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ctx.dexConfig, isSigner: false, isWritable: false },
    { pubkey: ctx.pool, isSigner: false, isWritable: true },
    { pubkey: ctx.lpPosition, isSigner: false, isWritable: true },
    { pubkey: ctx.providerTokenA, isSigner: false, isWritable: true },
    { pubkey: ctx.providerTokenB, isSigner: false, isWritable: true },
    { pubkey: ctx.vaultA, isSigner: false, isWritable: true },
    { pubkey: ctx.vaultB, isSigner: false, isWritable: true },
    { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  // Concentrated pools: BinArray must be the LAST remaining_account.
  // The contract pops it from `remaining_accounts[len-1]` and skips this
  // path entirely for StandardCurve pools, so omit on standard pools.
  // See contracts/native-dex/src/instructions/add_liquidity.rs:300-320.
  if (ctx.binArray) {
    keys.push({ pubkey: ctx.binArray, isSigner: false, isWritable: true });
  }

  return new TransactionInstruction({
    programId: ctx.dexProgramId,
    keys,
    data,
  });
}

/**
 * Build a complete legacy `Transaction` for the user-signed
 * `add_liquidity` flow.
 *
 * Steps:
 *   1. Mainnet placeholder guard: refuse to build a deposit touching the
 *      R20 placeholder RWT mint (the contract verifies `pool.token_*_mint`
 *      against the on-chain RWT mint pin; submitting against the
 *      placeholder on mainnet would consume a blockhash and revert).
 *   2. If `ensureProviderAtas=true`, RPC-check `providerTokenA` and
 *      `providerTokenB` and prepend
 *      `createAssociatedTokenAccountIdempotent` ix(s) for whichever ATA
 *      is missing. Both ATAs are required by the contract — the
 *      `Transfer` CPIs from provider → vault would fail with
 *      `AccountNotInitialized` otherwise.
 *   3. Append the `buildAddLiquidityIx` output.
 *
 * Returns a legacy `Transaction` — caller sets `recentBlockhash`,
 * `feePayer`, signs, and submits.
 */
export async function buildAddLiquidityTx(
  args: BuildAddLiquidityTxArgs,
): Promise<Transaction> {
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

  if (args.ensureProviderAtas) {
    if (!args.tokenAMint || !args.tokenBMint) {
      throw new Error(
        'ensureProviderAtas=true requires tokenAMint and tokenBMint',
      );
    }
    const payer = args.ctx.payer ?? args.ctx.provider;
    const [infoA, infoB] = await Promise.all([
      args.connection.getAccountInfo(args.ctx.providerTokenA),
      args.connection.getAccountInfo(args.ctx.providerTokenB),
    ]);
    if (infoA === null) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          payer,
          args.ctx.providerTokenA,
          args.ctx.provider,
          args.tokenAMint,
        ),
      );
    }
    if (infoB === null) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          payer,
          args.ctx.providerTokenB,
          args.ctx.provider,
          args.tokenBMint,
        ),
      );
    }
  }

  tx.add(
    buildAddLiquidityIx({
      ctx: args.ctx,
      amountA: args.amountA,
      amountB: args.amountB,
      minShares: args.minShares,
    }),
  );

  return tx;
}

// ───────────────────────────── validation ─────────────────────────────────

function validateU64(field: string, value: bigint): void {
  if (value <= 0n) {
    throw new Error(`add_liquidity: ${field} must be > 0 (got ${value})`);
  }
  if (value > U64_MAX) {
    throw new Error(`add_liquidity: ${field} exceeds u64::MAX (got ${value})`);
  }
}

function validateMinShares(value: bigint): void {
  if (value < 0n) {
    throw new Error(`add_liquidity: min_shares must be >= 0 (got ${value})`);
  }
  if (value > U128_MAX) {
    throw new Error(
      `add_liquidity: min_shares exceeds u128::MAX (got ${value})`,
    );
  }
}
