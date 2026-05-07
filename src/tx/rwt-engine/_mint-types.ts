// Account-context types for the user-signed `mint_rwt` tx-builder.
//
// Kept in a `_`-prefixed types file (mirroring the native-dex pattern)
// so SDK consumers wiring the user write-path can `import type { ... }`
// without dragging in the runtime builder surface.

import type { Connection, PublicKey } from '@solana/web3.js';

import type { ClusterName } from '../../network/clusters.js';

/**
 * Vault-side wiring used by the user-facing `mint_rwt` builder.
 *
 * `capitalAcc` and `daoFeeAccount` MUST equal `vault.capitalAccumulatorAta`
 * and `vault.arealFeeDestination` respectively — `mint_rwt::handler`
 * checks these byte-for-byte and reverts with `InvalidTokenAccount` on
 * any mismatch. Callers should fetch them from the parsed `RwtVault`
 * (see `parseRwtVault`) rather than recomputing.
 *
 * `rwtMint` MUST equal `vault.rwt_mint` for the same reason — pinned
 * at vault-init time and never changes.
 */
export interface MintRwtAccountContext {
  /** RWT Engine program ID. */
  rwtEngineProgramId: PublicKey;
  /** User wallet — Tx signer. */
  user: PublicKey;
  /** `["rwt_vault"]` PDA. */
  rwtVault: PublicKey;
  /** RWT mint — must match `vault.rwt_mint`. */
  rwtMint: PublicKey;
  /** Capital Accumulator USDC ATA — must match `vault.capital_accumulator_ata`. */
  capitalAcc: PublicKey;
  /** Areal fee destination USDC ATA — must match `vault.areal_fee_destination`. */
  daoFeeAccount: PublicKey;
}

/** Args for the pure `buildMintRwtIx` builder (no RPC, no PDA derivation). */
export interface BuildMintRwtIxArgs {
  ctx: MintRwtAccountContext;
  /**
   * User's USDC ATA — source of the deposit. MUST exist on-chain;
   * `mint_rwt::handler` does not bootstrap it (the user has to be
   * holding USDC already to mint).
   */
  userDeposit: PublicKey;
  /**
   * User's RWT ATA — receives minted RWT. MAY not exist; the convenience
   * `buildMintRwtTx` helper can prepend `createAssociatedTokenAccountIdempotent`
   * when `ensureAta=true`.
   */
  userRwt: PublicKey;
  /** Deposit amount (USDC lamports). Must be > 0 and <= u64::MAX. */
  amount: bigint;
  /**
   * Slippage floor on the RWT side. The contract REQUIRES this to be
   * non-zero (`ZeroSlippage` error) — there is no "I trust whatever NAV
   * you quote me" path. Callers derive this from `quoteMintRwt` +
   * `applyMintSlippage`. Must be > 0 and <= u64::MAX.
   */
  minRwtOut: bigint;
}

/** Args for the convenience `buildMintRwtTx` helper. */
export interface BuildMintRwtTxArgs extends BuildMintRwtIxArgs {
  /**
   * RPC connection — used only when `ensureAta=true` to look up the
   * user's RWT ATA before deciding whether to prepend a create-idempotent ix.
   */
  connection: Connection;
  /**
   * When true, RPC-check `userRwt` and prepend a
   * `createAssociatedTokenAccountIdempotent` ix when missing. Defaults
   * to false. Skipping saves one RPC roundtrip when the caller already
   * knows the ATA exists.
   */
  ensureAta?: boolean;
  /**
   * Optional safety check. When `'mainnet'` and `rwtMint` matches the
   * R20 placeholder bytes, the builder throws rather than producing a
   * tx that will fail on-chain with `InvalidTokenAccount`. Devnet/localnet
   * pass through unchanged (placeholder IS expected there).
   */
  cluster?: ClusterName;
  /**
   * RWT mint per cluster — checked against placeholder when
   * `cluster='mainnet'`. Distinct from `ctx.rwtMint` so callers can
   * pass the cluster-resolved mint without rebuilding the context.
   */
  rwtMint?: PublicKey;
}
