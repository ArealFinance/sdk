// Orientation-agnostic guard for "is this pool one of the protocol's
// canonical master pools?". Used by the markets UI to decorate pool rows
// (RWT/USDC and RWT/USDY) and by the LP-builder examples to flag write
// paths the user is not yet expected to touch directly.
//
// SCOPE — UI ONLY. There is NO on-chain enforcement that writes to a
// master pool come from a privileged path; the contract treats every
// pool identically. The matching restriction (master-pool writes go
// through Liquidity Nexus, not user-signed `add_liquidity`) is a
// product-level convention, tracked as R-PHASE-11-1 in plan/follow-ups.md.
// SDK consumers using this helper to gate UI must NOT rely on it as a
// security boundary.

import type { PublicKey } from '@solana/web3.js';

import type { ClusterName } from '../network/clusters.js';
import { RWT_MINTS, USDC_MINTS, USDY_MINTS } from '../network/constants.js';

/**
 * Returns `true` when the pool's `(mintA, mintB)` pair matches a known
 * protocol master pool — RWT/USDC or RWT/USDY — for the given cluster.
 *
 * Orientation-agnostic: `(RWT, USDC)` and `(USDC, RWT)` both return true.
 * Cluster-aware: each cluster's RWT/USDC/USDY mints are looked up
 * independently so this remains correct after the production mints
 * replace today's placeholders.
 *
 * Returns `false` for any other pair (USDC/USDY, RWT/X for some other X,
 * arbitrary token pairs).
 */
export function isMasterPool(
  mintA: PublicKey,
  mintB: PublicKey,
  cluster: ClusterName,
): boolean {
  const rwt = RWT_MINTS[cluster];
  const usdc = USDC_MINTS[cluster];
  const usdy = USDY_MINTS[cluster];

  return matchesPair(mintA, mintB, rwt, usdc) || matchesPair(mintA, mintB, rwt, usdy);
}

function matchesPair(
  a: PublicKey,
  b: PublicKey,
  x: PublicKey,
  y: PublicKey,
): boolean {
  return (a.equals(x) && b.equals(y)) || (a.equals(y) && b.equals(x));
}
