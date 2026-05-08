// Account-context types for the four user-signed LP tx-builders.
//
// Kept separate from `_swap-types.ts` (swap-only) and `_types.ts` (Nexus
// manager-only) so consumers wiring the LP write paths can `import type`
// without dragging in unrelated surface.
//
// Account ordering across the four ix is different (each section below
// quotes the contract handler order); prefer the specific
// `<Ix>AccountContext` over the shared `LpAccountContextBase`.

import type { Connection, PublicKey } from '@solana/web3.js';
import type { ClusterName } from '../../network/clusters.js';

// ─────────────────────────────── shared ───────────────────────────────────

/**
 * Account fields common to `add_liquidity` / `zap_liquidity` /
 * `remove_liquidity`. `claim_lp_fees` does NOT extend this — it uses a
 * `recipient` signer (not `provider`) and pulls vaults under different
 * names (`poolVaultA/B`).
 */
export interface LpAccountContextBase {
  /** DEX program ID. */
  dexProgramId: PublicKey;
  /** LP wallet — Tx signer (NOT writable). */
  provider: PublicKey;
  /** `["pool", token_a_mint, token_b_mint]` PDA. */
  pool: PublicKey;
  /** `["lp", pool_state, provider]` PDA. */
  lpPosition: PublicKey;
  /** Provider's ATA for `token_a`. */
  providerTokenA: PublicKey;
  /** Provider's ATA for `token_b`. */
  providerTokenB: PublicKey;
  /** Pool's vault for `token_a`. */
  vaultA: PublicKey;
  /** Pool's vault for `token_b`. */
  vaultB: PublicKey;
}

// ─────────────────────────── add_liquidity ───────────────────────────────

/**
 * Account context for `add_liquidity` (11 keys).
 *
 * Contract order — `contracts/native-dex/src/instructions/add_liquidity.rs::AddLiquidity`:
 *   0. provider          (signer, !writable)
 *   1. payer             (signer, writable)            — defaults to provider
 *   2. dex_config        (read)
 *   3. pool_state        (writable)
 *   4. lp_position       (writable; init from payer rent if `data_len == 0`)
 *   5. provider_token_a  (writable)
 *   6. provider_token_b  (writable)
 *   7. vault_a           (writable)
 *   8. vault_b           (writable)
 *   9. token_program     (read)
 *  10. system_program    (read)
 *
 * `payer` defaults to `provider` when omitted (the common case — user
 * pays for their own LP-position rent on the first deposit).
 */
export interface AddLiquidityAccountContext extends LpAccountContextBase {
  /** `["dex_config"]` singleton. */
  dexConfig: PublicKey;
  /**
   * Account that funds the LP-position rent on first deposit. Defaults
   * to `provider` when omitted. Useful when a relayer or sponsor wallet
   * pays for the user's first LP slot — the contract requires the payer
   * to be a signer.
   */
  payer?: PublicKey;
}

export interface BuildAddLiquidityIxArgs {
  ctx: AddLiquidityAccountContext;
  /** Amount of `token_a` to deposit (lamports). Must be > 0 and <= u64::MAX. */
  amountA: bigint;
  /** Amount of `token_b` to deposit (lamports). Must be > 0 and <= u64::MAX. */
  amountB: bigint;
  /** Minimum LP shares acceptable for the deposit (u128). Use `applySlippageU128`. */
  minShares: bigint;
}

export interface BuildAddLiquidityTxArgs extends BuildAddLiquidityIxArgs {
  /** RPC connection — used only when `ensureProviderAtas=true`. */
  connection: Connection;
  /**
   * When true, RPC-checks `providerTokenA`/`providerTokenB` and prepends
   * `createAssociatedTokenAccountIdempotent` ix(s) for whichever ATA(s)
   * are missing. Defaults to false. Skipping saves up to two RPC
   * roundtrips when the caller already knows the ATAs exist.
   */
  ensureProviderAtas?: boolean;
  /** Token A mint — required when `ensureProviderAtas=true`. */
  tokenAMint?: PublicKey;
  /** Token B mint — required when `ensureProviderAtas=true`. */
  tokenBMint?: PublicKey;
  /**
   * Optional safety check. When `'mainnet'` and `rwtMint` matches the
   * R20 placeholder bytes, the builder throws rather than producing a tx
   * that will fail on-chain. Devnet/localnet pass through unchanged.
   */
  cluster?: ClusterName;
  /** RWT mint per cluster — checked against placeholder when `cluster='mainnet'`. */
  rwtMint?: PublicKey;
}

// ─────────────────────────── zap_liquidity ───────────────────────────────

/**
 * Account context for `zap_liquidity` (12 keys + optional OT-treasury).
 *
 * Contract order — `contracts/native-dex/src/instructions/zap_liquidity.rs::ZapLiquidity`:
 *   0. provider                       (signer, !writable)
 *   1. payer                          (signer, writable)            — defaults to provider
 *   2. dex_config                     (read)
 *   3. pool_state                     (writable)
 *   4. lp_position                    (writable)
 *   5. provider_token_a               (writable)
 *   6. provider_token_b               (writable)
 *   7. vault_a                        (writable)
 *   8. vault_b                        (writable)
 *   9. areal_fee_account              (writable)                    — dex_config.areal_fee_destination
 *  10. token_program                  (read)
 *  11. system_program                 (read)
 *
 * Optional remaining_accounts:
 *   [0] ot_treasury_fee_destination   (writable) when `pool.has_ot_treasury == true`.
 *
 * Builder THROWS when `pool.has_ot_treasury == true` and the caller did
 * not supply `otTreasuryFeeDestination` — submitting the ix without it
 * would fail on-chain.
 */
export interface ZapLiquidityAccountContext extends AddLiquidityAccountContext {
  /** Areal Finance fee destination — RWT ATA per `dex_config.areal_fee_destination`. */
  arealFeeAccount: PublicKey;
  /** OT treasury fee destination — required only when `pool.has_ot_treasury`. */
  otTreasuryFeeDestination?: PublicKey;
}

export interface BuildZapLiquidityIxArgs {
  ctx: ZapLiquidityAccountContext;
  /** Amount of `token_a` to zap (lamports). Must be > 0 and <= u64::MAX. */
  amountA: bigint;
  /** Amount of `token_b` to zap (lamports). Must be > 0 and <= u64::MAX. */
  amountB: bigint;
  /** Minimum LP shares acceptable post-zap (u128). Use `applySlippageU128`. */
  minShares: bigint;
}

export interface BuildZapLiquidityTxArgs extends BuildZapLiquidityIxArgs {
  /** RPC connection — used only when `ensureProviderAtas=true`. */
  connection: Connection;
  /** When true, RPC-checks the provider ATAs and prepends create-idempotent ix(s). */
  ensureProviderAtas?: boolean;
  /** Token A mint — required when `ensureProviderAtas=true`. */
  tokenAMint?: PublicKey;
  /** Token B mint — required when `ensureProviderAtas=true`. */
  tokenBMint?: PublicKey;
  /** Optional safety check — same semantics as `BuildAddLiquidityTxArgs.cluster`. */
  cluster?: ClusterName;
  /** RWT mint per cluster — checked against placeholder when `cluster='mainnet'`. */
  rwtMint?: PublicKey;
}

// ─────────────────────────── remove_liquidity ────────────────────────────

/**
 * Account context for `remove_liquidity` (8 keys).
 *
 * Contract order — `contracts/native-dex/src/instructions/remove_liquidity.rs::RemoveLiquidity`:
 *   0. provider          (signer, !writable)
 *   1. pool_state        (writable)
 *   2. lp_position       (writable)
 *   3. provider_token_a  (writable)
 *   4. provider_token_b  (writable)
 *   5. vault_a           (writable)
 *   6. vault_b           (writable)
 *   7. token_program     (read)
 *
 * NO `dex_config` (LPs always exit, even when DEX is paused),
 * NO `system_program` (no init), NO `payer` (no rent).
 *
 * Optional remaining_accounts:
 *   [0] BinArray for concentrated pools — Phase 11 deferred (only
 *       constant-product pools today).
 */
export type RemoveLiquidityAccountContext = LpAccountContextBase;

export interface BuildRemoveLiquidityIxArgs {
  ctx: RemoveLiquidityAccountContext;
  /** LP shares to burn (u128). Must be > 0. */
  sharesToBurn: bigint;
}

export interface BuildRemoveLiquidityTxArgs extends BuildRemoveLiquidityIxArgs {
  /**
   * RPC connection — accepted for parity with `buildAddLiquidityTx`'s
   * shape, but currently unused (no ATA check, no mainnet placeholder
   * guard — exit paths must work even when the placeholder mint is in
   * play, otherwise a user could be stuck mid-deploy).
   */
  connection?: Connection;
}

// ─────────────────────────── claim_lp_fees ───────────────────────────────

/**
 * Account context for `claim_lp_fees` (8 keys).
 *
 * Contract order — `contracts/native-dex/src/instructions/claim_lp_fees.rs::ClaimLpFees`:
 *   0. recipient            (signer, !writable)
 *   1. pool_state           (writable)
 *   2. lp_position          (writable)
 *   3. pool_vault_a         (writable)
 *   4. pool_vault_b         (writable)
 *   5. recipient_token_a    (writable)
 *   6. recipient_token_b    (writable)
 *   7. token_program        (read)
 *
 * NO `dex_config`, NO `system_program`, NO `payer`.
 *
 * `recipient` is BOTH the signer and the LP-position owner (the contract
 * derives the LP PDA from `[lp_position_seed, pool, recipient]`).
 */
export interface ClaimLpFeesAccountContext {
  /** DEX program ID. */
  dexProgramId: PublicKey;
  /** LP wallet — Tx signer (NOT writable). */
  recipient: PublicKey;
  /** `["pool", token_a_mint, token_b_mint]` PDA. */
  pool: PublicKey;
  /** `["lp", pool_state, recipient]` PDA. */
  lpPosition: PublicKey;
  /** Pool's vault for `token_a`. */
  poolVaultA: PublicKey;
  /** Pool's vault for `token_b`. */
  poolVaultB: PublicKey;
  /**
   * Recipient's ATA for `token_a` — must exist on-chain (or be ensured
   * separately via `ensureRecipientAtas` on `BuildClaimLpFeesTxArgs`).
   *
   * Named `recipientTokenAAta` for parity with the codegen
   * `ClaimLpFeesAccounts.recipientTokenAAta` (Phase 11 F-LP-5).
   */
  recipientTokenAAta: PublicKey;
  /**
   * Recipient's ATA for `token_b` — must exist on-chain (or be ensured
   * separately via `ensureRecipientAtas` on `BuildClaimLpFeesTxArgs`).
   *
   * Named `recipientTokenBAta` for parity with the codegen
   * `ClaimLpFeesAccounts.recipientTokenBAta` (Phase 11 F-LP-5).
   */
  recipientTokenBAta: PublicKey;
}

export interface BuildClaimLpFeesIxArgs {
  ctx: ClaimLpFeesAccountContext;
}

export interface BuildClaimLpFeesTxArgs extends BuildClaimLpFeesIxArgs {
  /** RPC connection — used only when `ensureRecipientAtas=true`. */
  connection: Connection;
  /** When true, RPC-checks recipient ATAs and prepends create-idempotent ix(s). */
  ensureRecipientAtas?: boolean;
  /** Token A mint — required when `ensureRecipientAtas=true`. */
  tokenAMint?: PublicKey;
  /** Token B mint — required when `ensureRecipientAtas=true`. */
  tokenBMint?: PublicKey;
}
