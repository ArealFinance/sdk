// User-signed `native-dex::zap_liquidity` instruction builder.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/native-dex/src/instructions/zap_liquidity.rs::ZapLiquidity`
// and the codegen `ZapLiquidityAccounts` struct in
// `programs/native-dex/instructions.generated.ts`:
//
//   0. provider                       (signer, !writable)
//   1. payer                          (signer, writable)            — defaults to provider
//   2. dex_config                     (read)                         ["dex_config"]
//   3. pool_state                     (writable)                     ["pool", token_a_mint, token_b_mint]
//   4. lp_position                    (writable; init from payer rent if `data_len == 0`)
//   5. provider_token_a               (writable)
//   6. provider_token_b               (writable)
//   7. vault_a                        (writable)
//   8. vault_b                        (writable)
//   9. areal_fee_account              (writable)                     dex_config.areal_fee_destination
//  10. token_program                  (read)
//  11. system_program                 (read)
//
// Optional remaining_accounts:
//   [0] ot_treasury_fee_destination   (writable) — REQUIRED on-chain when
//       `pool.has_ot_treasury == true`. Builder THROWS if the pool flag
//       implies its presence and the caller did not supply it.
//
// Args (encoded via codegen `encodeZapLiquidityArgs`):
//   amount_a     u64 LE
//   amount_b     u64 LE
//   min_shares   u128 LE
//
// Discriminator: codegen `ZAP_LIQUIDITY_DISCRIMINATOR`.

import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import {
  isPlaceholderRwtMint,
  SPL_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
} from '../../network/constants.js';
import { encodeZapLiquidityArgs } from '../../programs/native-dex/instructions.generated.js';

import type {
  BuildZapLiquidityIxArgs,
  BuildZapLiquidityTxArgs,
  ZapLiquidityAccountContext,
} from './_lp-types.js';

export type {
  ZapLiquidityAccountContext,
  BuildZapLiquidityIxArgs,
  BuildZapLiquidityTxArgs,
};

const U64_MAX = 0xffff_ffff_ffff_ffffn;
const U128_MAX = (1n << 128n) - 1n;

/**
 * Build the user-signed `native-dex::zap_liquidity` instruction.
 *
 * Pure: no RPC, no PDA derivation. When the target pool's
 * `has_ot_treasury` flag is set, the caller MUST also supply
 * `ctx.otTreasuryFeeDestination` — this builder appends the OT account
 * at `remaining_accounts[0]` to mirror the contract's expectation. The
 * builder cannot read the pool flag itself (no RPC); see `buildZapLiquidityTx`
 * for a higher-level helper.
 */
export function buildZapLiquidityIx(
  args: BuildZapLiquidityIxArgs,
): TransactionInstruction {
  const { ctx, amountA, amountB, minShares } = args;

  validateU64NonNegative('amount_a', amountA);
  validateU64NonNegative('amount_b', amountB);
  if (amountA === 0n && amountB === 0n) {
    throw new Error(
      'zap_liquidity: amount_a + amount_b must be > 0 (got 0 + 0)',
    );
  }
  validateMinShares(minShares);

  const payer = ctx.payer ?? ctx.provider;
  const data = encodeZapLiquidityArgs({ amountA, amountB, minShares });

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
    { pubkey: ctx.arealFeeAccount, isSigner: false, isWritable: true },
    { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  // Optional OT treasury fee destination — `zap_internal` reads it from
  // `remaining_accounts[0]` and reverts with `MissingOtTreasuryAccount`
  // when expected but missing.
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
 * Build a complete legacy `Transaction` for the user-signed
 * `zap_liquidity` flow.
 *
 * Steps:
 *   1. Mainnet placeholder guard: refuse to build a zap touching the
 *      R20 placeholder RWT mint.
 *   2. If `ensureProviderAtas=true`, RPC-check both provider ATAs and
 *      prepend `createAssociatedTokenAccountIdempotent` ix(s) for any
 *      missing.
 *   3. Append the `buildZapLiquidityIx` output.
 *
 * Returns a legacy `Transaction` — caller sets `recentBlockhash`,
 * `feePayer`, signs, and submits.
 */
export async function buildZapLiquidityTx(
  args: BuildZapLiquidityTxArgs,
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
    buildZapLiquidityIx({
      ctx: args.ctx,
      amountA: args.amountA,
      amountB: args.amountB,
      minShares: args.minShares,
    }),
  );

  return tx;
}

// ───────────────────────────── validation ─────────────────────────────────

/**
 * Per-side amount validator for `zap_liquidity`.
 *
 * Unlike `add_liquidity` (which rejects any zero side), zap supports
 * single-sided deposits: the contract's `zap_liquidity_internal` only
 * rejects `amount_a == 0 && amount_b == 0` (see
 * `contracts/native-dex/src/instructions/zap_liquidity.rs:147`). The
 * empty-pool branch additionally requires both sides > 0, but that's a
 * runtime check the contract owns — at the SDK level we mirror only the
 * "not both zero" invariant via an aggregate check at the call site.
 */
function validateU64NonNegative(field: string, value: bigint): void {
  if (value < 0n) {
    throw new Error(`zap_liquidity: ${field} must be >= 0 (got ${value})`);
  }
  if (value > U64_MAX) {
    throw new Error(`zap_liquidity: ${field} exceeds u64::MAX (got ${value})`);
  }
}

function validateMinShares(value: bigint): void {
  if (value < 0n) {
    throw new Error(`zap_liquidity: min_shares must be >= 0 (got ${value})`);
  }
  if (value > U128_MAX) {
    throw new Error(
      `zap_liquidity: min_shares exceeds u128::MAX (got ${value})`,
    );
  }
}
