// Account-context types for the Layer 9 Nexus tx-builders.
//
// These mirror `bots/nexus-manager/src/types.ts` so an SDK consumer can
// migrate the bot's call sites with no changes other than the import path.

import type { PublicKey } from '@solana/web3.js';

/** Singleton wiring for the Liquidity Nexus — same across all 4 sibling ix. */
export interface NexusAccountContext {
  /** DEX program ID (vanity `DEX8...`). */
  dexProgramId: PublicKey;
  /** `["dex_config"]` singleton. */
  dexConfig: PublicKey;
  /** `["liquidity_nexus"]` singleton. */
  liquidityNexus: PublicKey;
  /** Manager wallet — Tx signer. */
  manager: PublicKey;
  /** Areal Finance fee destination — RWT ATA per `dex_config.areal_fee_destination`. */
  arealFeeAccount: PublicKey;
  /** Nexus-owned USDC ATA. */
  nexusUsdcAta: PublicKey;
  /** Nexus-owned RWT ATA. */
  nexusRwtAta: PublicKey;
}

/** Per-pool wiring used by the Nexus tx-builders. */
export interface PoolAccountContext {
  pool: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  /** Nexus's `LpPosition` PDA for this pool. */
  lpPosition: PublicKey;
}
