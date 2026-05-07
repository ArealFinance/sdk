// User-signed `native-dex::claim_lp_fees` instruction builder.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/native-dex/src/instructions/claim_lp_fees.rs::ClaimLpFees`
// and the codegen `ClaimLpFeesAccounts` struct in
// `programs/native-dex/instructions.generated.ts`:
//
//   0. recipient            (signer, !writable)
//   1. pool_state           (writable)
//   2. lp_position          (writable)
//   3. pool_vault_a         (writable)
//   4. pool_vault_b         (writable)
//   5. recipient_token_a    (writable)                  recipient's ATA for token_a
//   6. recipient_token_b    (writable)                  recipient's ATA for token_b
//   7. token_program        (read)
//
// Notes vs the other LP ixs:
//   - NO `dex_config` — the contract uses the LP-position's stored
//     cumulative-fee snapshots, not config-level state.
//   - NO `system_program` / NO `payer` — no init, no rent.
//   - The `recipient` is BOTH the signer AND the LP-position owner. The
//     contract derives the LP PDA from `[lp_position_seed, pool, recipient]`,
//     so a third party cannot claim someone else's fees.
//
// Args: NONE — discriminator only.
//
// Discriminator: codegen `CLAIM_LP_FEES_DISCRIMINATOR`.

import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import { encodeClaimLpFeesArgs } from '../../programs/native-dex/instructions.generated.js';

import type {
  BuildClaimLpFeesIxArgs,
  BuildClaimLpFeesTxArgs,
  ClaimLpFeesAccountContext,
} from './_lp-types.js';

export type {
  ClaimLpFeesAccountContext,
  BuildClaimLpFeesIxArgs,
  BuildClaimLpFeesTxArgs,
};

/**
 * Build the user-signed `native-dex::claim_lp_fees` instruction.
 *
 * Pure: no RPC, no PDA derivation. Pass the resolved pubkeys in. For a
 * higher-level helper that prepends create-ATA-idempotent ix(s) when
 * the recipient ATAs do not yet exist, see `buildClaimLpFeesTx`.
 */
export function buildClaimLpFeesIx(
  args: BuildClaimLpFeesIxArgs,
): TransactionInstruction {
  const { ctx } = args;

  const data = encodeClaimLpFeesArgs();

  const keys = [
    { pubkey: ctx.recipient, isSigner: true, isWritable: false },
    { pubkey: ctx.pool, isSigner: false, isWritable: true },
    { pubkey: ctx.lpPosition, isSigner: false, isWritable: true },
    { pubkey: ctx.poolVaultA, isSigner: false, isWritable: true },
    { pubkey: ctx.poolVaultB, isSigner: false, isWritable: true },
    { pubkey: ctx.recipientTokenA, isSigner: false, isWritable: true },
    { pubkey: ctx.recipientTokenB, isSigner: false, isWritable: true },
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
 * `claim_lp_fees` flow.
 *
 * Steps:
 *   1. If `ensureRecipientAtas=true`, RPC-check both recipient ATAs and
 *      prepend `createAssociatedTokenAccountIdempotent` ix(s) for any
 *      missing. Both ATAs are required by the contract — the
 *      `Transfer` CPIs from vault → recipient would fail with
 *      `AccountNotInitialized` otherwise.
 *   2. Append the `buildClaimLpFeesIx` output.
 *
 * No mainnet placeholder guard: claiming fees is a pure pull from the
 * pool's own vaults. Even on a placeholder-RWT mainnet a successful
 * deposit followed by a claim is internally consistent — the contract
 * never re-validates against the on-chain RWT mint pin on this path.
 *
 * Returns a legacy `Transaction` — caller sets `recentBlockhash`,
 * `feePayer`, signs, and submits.
 */
export async function buildClaimLpFeesTx(
  args: BuildClaimLpFeesTxArgs,
): Promise<Transaction> {
  const tx = new Transaction();

  if (args.ensureRecipientAtas) {
    if (!args.tokenAMint || !args.tokenBMint) {
      throw new Error(
        'ensureRecipientAtas=true requires tokenAMint and tokenBMint',
      );
    }
    const [infoA, infoB] = await Promise.all([
      args.connection.getAccountInfo(args.ctx.recipientTokenA),
      args.connection.getAccountInfo(args.ctx.recipientTokenB),
    ]);
    if (infoA === null) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          args.ctx.recipient,
          args.ctx.recipientTokenA,
          args.ctx.recipient,
          args.tokenAMint,
        ),
      );
    }
    if (infoB === null) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          args.ctx.recipient,
          args.ctx.recipientTokenB,
          args.ctx.recipient,
          args.tokenBMint,
        ),
      );
    }
  }

  tx.add(buildClaimLpFeesIx({ ctx: args.ctx }));

  return tx;
}
