// Program IDs for the 5 Areal on-chain programs.
//
// Source of truth: `declare_id!()` macros in `contracts/<program>/src/lib.rs`.
// Mirror these constants when redeploying programs to a new cluster — the
// values are pinned per cluster (mainnet vs. devnet may diverge once a
// program is upgraded with a new vanity address).
//
// The contracts crate selects per-cluster IDs at build time via the
// `cargo build-sbf --features devnet` flag; the SDK mirrors that choice at
// runtime via `getProgramIds(cluster)`.

import { PublicKey } from '@solana/web3.js';
import type { ClusterName } from './clusters.js';

/** Bundle of all 5 Areal on-chain program IDs for a single cluster. */
export interface ProgramIdMap {
  nativeDex: PublicKey;
  ownershipToken: PublicKey;
  rwtEngine: PublicKey;
  yieldDistribution: PublicKey;
  futarchy: PublicKey;
}

/**
 * Per-cluster program IDs.
 *
 * Source of truth: `declare_id!()` macros in `contracts/<program>/src/lib.rs`,
 * with `--features devnet` selecting the devnet pubkeys at SBF build time.
 *
 * Localnet uses the mainnet pubkeys today because the local test-validator
 * deploys with the same vanity keypairs as mainnet. If/when localnet ever
 * needs distinct IDs (e.g. a localnet-only rebuild), replace the localnet
 * entries below.
 */
export const PROGRAM_IDS_BY_CLUSTER: Record<ClusterName, ProgramIdMap> = {
  mainnet: {
    nativeDex:         new PublicKey('DEX8LmvJpjefPS1cGS9zWB9ybxN24vNjTTrusBeqyARL'),
    ownershipToken:    new PublicKey('oWnqbNwmEdjNS5KVbxz8xeuGNjKMd1aiNF89d7qdARL'),
    rwtEngine:         new PublicKey('RWT9hgbjHQDj98xP7FYsT5QYp5X32XyK6QfMRmFtARL'),
    yieldDistribution: new PublicKey('YLD9EBikcTmVCnVzdx6vuNajrDkp8tyCAgZrqTwmMXF'),
    futarchy:          new PublicKey('FUTsbsdyJmEWa5LSYHWXMr9hQFyVsrJ1agGvRQGR1ARL'),
  },
  devnet: {
    nativeDex:         new PublicKey('F9PaTy8SxmrLeheGycdGVAZBEB6FETMhoBfTUeSQLJ9u'),
    ownershipToken:    new PublicKey('Eu7hc5gdjVHGff51bQHEDF1fSsWVRvUE15vBsFwu2oaX'),
    rwtEngine:         new PublicKey('G5zE57v3fBdWuxPvMmpwTPxATdnR99u6j5U9YfU4kABw'),
    yieldDistribution: new PublicKey('DaJvfRk5m6bWYBNMw4CujmBSjni1U4mzhpBLEmN2Lwro'),
    futarchy:          new PublicKey('25PqXCUXetwG19HunKEYJ1GE3YKBZkCo5KwWK4VdUTEQ'),
  },
  // Localnet uses mainnet pubkeys today (test-validator deploys with the same
  // vanity keypairs). If/when localnet needs distinct IDs, replace these.
  localnet: {
    nativeDex:         new PublicKey('DEX8LmvJpjefPS1cGS9zWB9ybxN24vNjTTrusBeqyARL'),
    ownershipToken:    new PublicKey('oWnqbNwmEdjNS5KVbxz8xeuGNjKMd1aiNF89d7qdARL'),
    rwtEngine:         new PublicKey('RWT9hgbjHQDj98xP7FYsT5QYp5X32XyK6QfMRmFtARL'),
    yieldDistribution: new PublicKey('YLD9EBikcTmVCnVzdx6vuNajrDkp8tyCAgZrqTwmMXF'),
    futarchy:          new PublicKey('FUTsbsdyJmEWa5LSYHWXMr9hQFyVsrJ1agGvRQGR1ARL'),
  },
};

/** Resolve the program-ID bundle for a given cluster. */
export function getProgramIds(cluster: ClusterName): ProgramIdMap {
  return PROGRAM_IDS_BY_CLUSTER[cluster];
}

// ─── Backwards-compat shim (DEPRECATED) ──────────────────────────────────────
// These exports keep callers building during the migration to `getProgramIds`.
// They alias the mainnet pubkeys. Remove in the next minor release after all
// callers in app/dashboard/backend/bots have migrated.

/** @deprecated use `getProgramIds(cluster).nativeDex` */
export const NATIVE_DEX_PROGRAM_ID = PROGRAM_IDS_BY_CLUSTER.mainnet.nativeDex;

/** @deprecated use `getProgramIds(cluster).ownershipToken` */
export const OWNERSHIP_TOKEN_PROGRAM_ID = PROGRAM_IDS_BY_CLUSTER.mainnet.ownershipToken;

/** @deprecated use `getProgramIds(cluster).rwtEngine` */
export const RWT_ENGINE_PROGRAM_ID = PROGRAM_IDS_BY_CLUSTER.mainnet.rwtEngine;

/** @deprecated use `getProgramIds(cluster).yieldDistribution` */
export const YIELD_DISTRIBUTION_PROGRAM_ID = PROGRAM_IDS_BY_CLUSTER.mainnet.yieldDistribution;

/** @deprecated use `getProgramIds(cluster).futarchy` */
export const FUTARCHY_PROGRAM_ID = PROGRAM_IDS_BY_CLUSTER.mainnet.futarchy;

/** @deprecated use `getProgramIds(cluster)` */
export const PROGRAM_IDS = PROGRAM_IDS_BY_CLUSTER.mainnet;

export type ProgramName = keyof ProgramIdMap;
