// Program IDs for the 5 Areal on-chain programs.
//
// Source of truth: `declare_id!()` macros in `contracts/<program>/src/lib.rs`.
// Mirror these constants when redeploying programs to a new cluster — the
// values are pinned per cluster (mainnet vs. devnet may diverge once a
// program is upgraded with a new vanity address).

import { PublicKey } from '@solana/web3.js';

/** DEX program (native AMM + Liquidity Nexus). Vanity prefix `DEX8`. */
export const NATIVE_DEX_PROGRAM_ID = new PublicKey(
  'DEX8LmvJpjefPS1cGS9zWB9ybxN24vNjTTrusBeqyARL',
);

/** Ownership Token program — per-OT mint, treasury, governance. */
export const OWNERSHIP_TOKEN_PROGRAM_ID = new PublicKey(
  'oWnqbNwmEdjNS5KVbxz8xeuGNjKMd1aiNF89d7qdARL',
);

/** RWT Engine program — RWT mint vault and 70/15/15 distribution split. */
export const RWT_ENGINE_PROGRAM_ID = new PublicKey(
  'RWT9hgbjHQDj98xP7FYsT5QYp5X32XyK6QfMRmFtARL',
);

/** Yield Distribution program — Merkle distributors and per-claimant claims. */
export const YIELD_DISTRIBUTION_PROGRAM_ID = new PublicKey(
  'YLD9EBikcTmVCnVzdx6vuNajrDkp8tyCAgZrqTwmMXF',
);

/** Futarchy program — proposal markets per OT. */
export const FUTARCHY_PROGRAM_ID = new PublicKey(
  'FUTsbsdyJmEWa5LSYHWXMr9hQFyVsrJ1agGvRQGR1ARL',
);

/**
 * Bundle of all 5 program IDs. Convenient for callers that need to look up by
 * label (e.g., the error mapper) rather than by import name.
 */
export const PROGRAM_IDS = {
  nativeDex: NATIVE_DEX_PROGRAM_ID,
  ownershipToken: OWNERSHIP_TOKEN_PROGRAM_ID,
  rwtEngine: RWT_ENGINE_PROGRAM_ID,
  yieldDistribution: YIELD_DISTRIBUTION_PROGRAM_ID,
  futarchy: FUTARCHY_PROGRAM_ID,
} as const;

export type ProgramName = keyof typeof PROGRAM_IDS;
