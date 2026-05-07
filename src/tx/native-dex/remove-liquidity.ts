// User-signed `native-dex::remove_liquidity` instruction builder.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/native-dex/src/instructions/remove_liquidity.rs::RemoveLiquidity`
// and the codegen `RemoveLiquidityAccounts` struct in
// `programs/native-dex/instructions.generated.ts`:
//
//   0. provider          (signer, !writable)
//   1. pool_state        (writable)
//   2. lp_position       (writable)
//   3. provider_token_a  (writable)
//   4. provider_token_b  (writable)
//   5. vault_a           (writable)
//   6. vault_b           (writable)
//   7. token_program     (read)
//
// Notes vs `add_liquidity`:
//   - NO `dex_config` — LPs are always allowed to exit, even when the
//     DEX is paused at config-level. Removing the config dependency
//     prevents an emergency-pause from trapping LPs.
//   - NO `system_program` — no account allocation on this path.
//   - NO `payer` / no rent — the LP-position account already exists.
//
// Optional remaining_accounts:
//   [0] BinArray for concentrated pools — DEFERRED in Phase 11 (only
//       constant-product pools today). If/when concentrated pools ship a
//       user-facing remove path, extend `RemoveLiquidityAccountContext`
//       with an optional `binArray` field.
//
// Args (encoded via codegen `encodeRemoveLiquidityArgs`):
//   shares_to_burn   u128 LE
//
// Discriminator: codegen `REMOVE_LIQUIDITY_DISCRIMINATOR`.
//
// NO mainnet placeholder guard: an LP must always be able to exit, even
// during the placeholder window — withholding the builder would trap user
// liquidity. The contract validates the pool itself.

import { Transaction, TransactionInstruction } from '@solana/web3.js';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import { encodeRemoveLiquidityArgs } from '../../programs/native-dex/instructions.generated.js';

import type {
  BuildRemoveLiquidityIxArgs,
  BuildRemoveLiquidityTxArgs,
  RemoveLiquidityAccountContext,
} from './_lp-types.js';

export type {
  RemoveLiquidityAccountContext,
  BuildRemoveLiquidityIxArgs,
  BuildRemoveLiquidityTxArgs,
};

const U128_MAX = (1n << 128n) - 1n;

/**
 * Build the user-signed `native-dex::remove_liquidity` instruction.
 *
 * Pure: no RPC, no PDA derivation. Pass the resolved pubkeys in.
 *
 * Output ATAs (`provider_token_a` / `provider_token_b`) are assumed to
 * exist on-chain — the typical exit-path user already holds the token
 * accounts they originally deposited from. Callers that aren't sure
 * should ensure them at the call site (e.g. via SPL idempotent helpers)
 * before submitting.
 */
export function buildRemoveLiquidityIx(
  args: BuildRemoveLiquidityIxArgs,
): TransactionInstruction {
  const { ctx, sharesToBurn } = args;

  validateSharesToBurn(sharesToBurn);

  const data = encodeRemoveLiquidityArgs({ sharesToBurn });

  const keys = [
    { pubkey: ctx.provider, isSigner: true, isWritable: false },
    { pubkey: ctx.pool, isSigner: false, isWritable: true },
    { pubkey: ctx.lpPosition, isSigner: false, isWritable: true },
    { pubkey: ctx.providerTokenA, isSigner: false, isWritable: true },
    { pubkey: ctx.providerTokenB, isSigner: false, isWritable: true },
    { pubkey: ctx.vaultA, isSigner: false, isWritable: true },
    { pubkey: ctx.vaultB, isSigner: false, isWritable: true },
    { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: ctx.dexProgramId,
    keys,
    data,
  });
}

/**
 * Build a complete legacy `Transaction` for the user-signed
 * `remove_liquidity` flow.
 *
 * Currently a thin wrapper around `buildRemoveLiquidityIx` — the shape
 * matches the other LP builders so callers can use a uniform API. No
 * ATA prepend (output ATAs assumed to exist; the user typically holds
 * the same accounts they originally deposited from). No mainnet
 * placeholder guard: LPs must always be able to exit.
 */
export async function buildRemoveLiquidityTx(
  args: BuildRemoveLiquidityTxArgs,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.add(
    buildRemoveLiquidityIx({
      ctx: args.ctx,
      sharesToBurn: args.sharesToBurn,
    }),
  );
  return tx;
}

// ───────────────────────────── validation ─────────────────────────────────

function validateSharesToBurn(value: bigint): void {
  if (value <= 0n) {
    throw new Error(
      `remove_liquidity: shares_to_burn must be > 0 (got ${value})`,
    );
  }
  if (value > U128_MAX) {
    throw new Error(
      `remove_liquidity: shares_to_burn exceeds u128::MAX (got ${value})`,
    );
  }
}
