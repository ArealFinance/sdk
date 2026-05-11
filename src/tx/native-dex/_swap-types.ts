// Account-context types for the user-signed `swap` tx-builder.
//
// Kept separate from `_types.ts` (which holds Nexus-only types) so that
// SDK consumers wiring the user write-path can `import type { ... }`
// without dragging in unrelated Nexus surface.

import type { Connection, PublicKey } from '@solana/web3.js';
import type { ClusterName } from '../../network/clusters.js';

/**
 * Pool-side wiring used by the user-facing `swap` builder.
 *
 * `vaultA` / `vaultB` are the canonical sides as stored in `PoolState`;
 * the builder picks `vault_in` / `vault_out` based on the `aToB` flag so
 * callers do not have to remember the convention.
 *
 * `otTreasuryFeeDestination` is REQUIRED when `pool.has_ot_treasury` is
 * true — `swap_internal` reads it from `remaining_accounts[0]` and reverts
 * with `MissingOtTreasuryAccount` otherwise. Omit for non-OT pools.
 */
export interface SwapAccountContext {
  /** DEX program ID. */
  dexProgramId: PublicKey;
  /** User wallet — Tx signer. */
  user: PublicKey;
  /** `["dex_config"]` singleton. */
  dexConfig: PublicKey;
  /** `["pool", token_a_mint, token_b_mint]` PDA. */
  pool: PublicKey;
  /** Pool's vault for `token_a`. */
  vaultA: PublicKey;
  /** Pool's vault for `token_b`. */
  vaultB: PublicKey;
  /** Areal Finance fee destination — RWT ATA per `dex_config.areal_fee_destination`. */
  arealFeeAccount: PublicKey;
  /** OT treasury fee destination — required only when `pool.has_ot_treasury`. */
  otTreasuryFeeDestination?: PublicKey;
  /**
   * BinArray PDA — REQUIRED for concentrated pools (`pool.poolType == 1`).
   * Derived as `["bins", pool_state]`. The contract reads it from
   * `remaining_accounts[has_ot_treasury ? 1 : 0]` and bin-walks the swap
   * via `concentrated::bin_walk_swap`. Omit for StandardCurve pools — the
   * contract gates the BinArray load on the pool type flag.
   */
  binArray?: PublicKey;
}

/** Args for the pure `buildSwapIx` builder (no RPC, no PDA derivation). */
export interface BuildSwapIxArgs {
  ctx: SwapAccountContext;
  /** User's ATA for the input mint. */
  userTokenIn: PublicKey;
  /** User's ATA for the output mint. Must exist on-chain (or be ensured separately). */
  userTokenOut: PublicKey;
  /** `true` → swap `token_a` → `token_b`; `false` → reverse. */
  aToB: boolean;
  /** Amount of input tokens to swap (lamports). Must be > 0 and <= u64::MAX. */
  amountIn: bigint;
  /** Slippage floor on the output side (lamports). Must be <= u64::MAX. */
  minAmountOut: bigint;
}

/** Args for the convenience `buildSwapTx` helper. */
export interface BuildSwapTxArgs extends BuildSwapIxArgs {
  /** RPC connection — used only when `ensureAta=true` to look up the output ATA. */
  connection: Connection;
  /** Output mint — needed by `createAssociatedTokenAccountIdempotent` when ensuring ATA. */
  outputMint: PublicKey;
  /**
   * When true, RPC-check `userTokenOut` and prepend a
   * `createAssociatedTokenAccountIdempotent` ix when missing. Defaults to false.
   * Skipping saves one RPC roundtrip when the caller already knows the ATA exists.
   */
  ensureAta?: boolean;
  /**
   * Optional safety check. When `'mainnet'` and `rwtMint` matches the R20
   * placeholder bytes, the builder throws rather than producing a tx that
   * will fail on-chain. Devnet/localnet pass through unchanged.
   */
  cluster?: ClusterName;
  /** RWT mint per cluster — checked against placeholder when `cluster='mainnet'`. */
  rwtMint?: PublicKey;
}
