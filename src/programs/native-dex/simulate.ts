// Ergonomic wrapper for `quoteSwap` that handles the RPC fetch + parse
// boilerplate.
//
// Why this exists:
//   `quoteSwap` is a pure function — it requires fully decoded `PoolState`
//   and `DexConfig` accounts plus the RWT mint. Every consumer either
//   re-implements the fetch+parse glue or copies it. `simulateSwap` collapses
//   that to a single async call so UI and indexer code can hand it a pool
//   address + amount and forward the result.
//
// Scope:
//   - Reads `PoolState` and `DexConfig` in parallel via `getAccountInfo`.
//   - Throws on RPC/parse-level errors (account not found, wrong
//     discriminator, malformed data) — these are integration bugs callers
//     should not paper over with a slippage error.
//   - Returns the same `QuoteOutcome` discriminated union `quoteSwap`
//     returns; business-logic rejections (PoolPaused, ZeroOutput, etc.)
//     remain `{ ok: false, error }` so UI can branch on the tag.

import type { Connection, PublicKey } from '@solana/web3.js';

import type { ClusterName } from '../../network/clusters.js';
import { findDexConfigPda } from '../../pda/native-dex.js';
import {
  parseDexConfig,
  parsePoolState,
} from './accounts.generated.js';
import { quoteSwap, type QuoteOutcome } from './quote.js';

/** Direction of the swap, expressed in the user's token-flow vocabulary. */
export type SwapSide = 'a-to-b' | 'b-to-a';

export interface SimulateSwapOptions {
  /**
   * DEX program ID — used to derive the `["dex_config"]` PDA. Required so
   * the helper can stay cluster-agnostic without touching `network/constants`.
   */
  dexProgramId: PublicKey;
  /**
   * RWT mint for the target cluster. Forwarded to `quoteSwap.rwtMint`; the
   * underlying quote helper uses it to detect which side of the pool is
   * the RWT (fees come off the RWT side).
   */
  rwtMint: PublicKey;
  /**
   * Optional cluster tag — when set to `'mainnet'` and `rwtMint` is the
   * placeholder, `quoteSwap` returns `MainnetNotDeployed` instead of a
   * misleading quote. Mirrors the invariant in `buildSwapTx`. Devnet/
   * localnet (or omitting the field) preserves the prior behaviour.
   */
  cluster?: ClusterName;
  /**
   * Optional commitment for the two `getAccountInfo` reads. Defaults to
   * `'confirmed'` — matches every other read helper in the SDK.
   */
  commitment?: Parameters<Connection['getAccountInfo']>[1];
}

/**
 * Quote a swap end-to-end: fetch pool + dex config, parse, and forward to
 * `quoteSwap`.
 *
 * Throws:
 *   - `Error('pool not found')` if `getAccountInfo(poolAddress)` returns null.
 *   - `Error('dex config not found')` if the singleton `["dex_config"]`
 *     account is missing — almost always indicates the wrong program ID.
 *   - The original parse error from `parsePoolState` / `parseDexConfig` if
 *     the on-chain data does not match the expected discriminator/layout.
 *
 * Returns:
 *   - `{ ok: true, quote }` on a buildable swap.
 *   - `{ ok: false, error }` with the same tags `quoteSwap` returns
 *     (PoolPaused, PoolNotActive, ZeroAmount, EmptyReserves, ZeroOutput,
 *     MathOverflow, MainnetNotDeployed).
 */
export async function simulateSwap(
  connection: Connection,
  poolAddress: PublicKey,
  amountIn: bigint,
  side: SwapSide,
  options: SimulateSwapOptions,
): Promise<QuoteOutcome> {
  const { dexProgramId, rwtMint, cluster, commitment } = options;

  // Resolve the singleton DexConfig PDA up-front. The derivation is cheap
  // (sync, deterministic) so we do it before the RPC dispatch.
  const [dexConfigPda] = findDexConfigPda(dexProgramId);

  // Fetch both accounts in parallel. We intentionally do NOT use
  // `Promise.allSettled` here — either account being missing is a hard
  // configuration error, not a degraded-snapshot condition.
  const [poolInfo, configInfo] = await Promise.all([
    connection.getAccountInfo(poolAddress, commitment ?? 'confirmed'),
    connection.getAccountInfo(dexConfigPda, commitment ?? 'confirmed'),
  ]);

  if (!poolInfo) {
    throw new Error('pool not found');
  }
  if (!configInfo) {
    throw new Error('dex config not found');
  }

  // `parsePoolState` / `parseDexConfig` throw with a clear discriminator
  // mismatch message — surface them unchanged so a deploy-mismatch bug is
  // diagnosable from the stack trace.
  const pool = parsePoolState(poolInfo.data);
  const config = parseDexConfig(configInfo.data);

  return quoteSwap({
    pool,
    config,
    amountIn,
    aToB: side === 'a-to-b',
    rwtMint,
    cluster,
  });
}
