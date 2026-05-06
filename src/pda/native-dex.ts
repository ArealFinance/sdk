// Native DEX program PDAs.
//
// All seed prefixes mirror `contracts/native-dex/src/constants.rs` and the
// per-instruction `seeds = [...]` clauses verbatim. Argument order follows
// the convention `(...payload, programId)` — `programId` is always last so
// the call site reads naturally.

import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

/** `["dex_config"]` singleton. */
export function findDexConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('dex_config')], programId);
}

/** `["pool_creators"]` singleton — allowlist for `create_pool` callers. */
export function findPoolCreatorsPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool_creators')],
    programId,
  );
}

/**
 * `["pool", token_a_mint, token_b_mint]` PoolState PDA.
 *
 * Caller must pass mints in the canonical order (a < b lexicographically) —
 * the on-chain handler enforces this.
 */
export function findPoolStatePda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
    programId,
  );
}

/**
 * `["lp", pool, owner]` LP position PDA.
 *
 * For Nexus-owned positions, `owner` equals the LiquidityNexus PDA address.
 */
export function findLpPositionPda(
  pool: PublicKey,
  owner: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lp'), pool.toBuffer(), owner.toBuffer()],
    programId,
  );
}

/** `["bins", pool_state]` BinArray PDA for concentrated pools. */
export function findBinArrayPda(
  poolState: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bins'), poolState.toBuffer()],
    programId,
  );
}

/**
 * `["liquidity_nexus"]` singleton — Layer 9, DEX-program-owned per D17.
 *
 * Pinned to `contracts/native-dex/src/constants.rs::LIQUIDITY_NEXUS_SEED`.
 */
export function findLiquidityNexusPda(
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('liquidity_nexus')],
    programId,
  );
}
