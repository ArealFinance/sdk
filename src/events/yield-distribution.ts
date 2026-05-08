// Event registry + typed wrappers for the Yield Distribution program.
//
// Source IDL: sdk/idl/yield-distribution.json (events array, 13 events).
// Field literals below mirror the IDL exactly — keep in sync after IDL bumps.
//
// Top-N events (RewardsClaimed, RootPublished, DistributorFunded,
// StreamConverted) expose typed `interface` wrappers consumed by indexers and
// the portfolio claim flow. The remaining 9 events decode through the same
// dynamic registry but are returned as `Record<string, unknown>` until a
// consumer demands a typed shape (Phase 12.x follow-up).

import type { PublicKey } from '@solana/web3.js';
import type { IdlEvent } from '@arlex/client';

import { buildProgramEventRegistry } from './registry.js';
import type { ProgramEventRegistry } from './types.js';

// IDL events array (transcribed from idl/yield-distribution.json).
// `as const satisfies readonly IdlEvent[]` would over-narrow string literals,
// so we use a plain typed array — fidelity is enforced by the round-trip
// tests that compare against the IDL JSON.
const EVENTS: readonly IdlEvent[] = [
  { name: 'ConfigInitialized', fields: [
    { name: 'authority', type: { array: ['u8', 32] } },
    { name: 'publish_authority', type: { array: ['u8', 32] } },
    { name: 'protocol_fee_bps', type: 'u16' },
    { name: 'areal_fee_destination', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'DistributorCreated', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'reward_vault', type: { array: ['u8', 32] } },
    { name: 'accumulator', type: { array: ['u8', 32] } },
    { name: 'vesting_period_secs', type: 'i64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'DistributorFunded', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'protocol_fee', type: 'u64' },
    { name: 'total_funded', type: 'u64' },
    { name: 'locked_vested', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'RootPublished', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'epoch', type: 'u64' },
    { name: 'merkle_root', type: { array: ['u8', 32] } },
    { name: 'max_total_claim', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'RewardsClaimed', fields: [
    { name: 'claimant', type: { array: ['u8', 32] } },
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'cumulative_claimed', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'ConfigUpdated', fields: [
    { name: 'protocol_fee_bps', type: 'u16' },
    { name: 'min_distribution_amount', type: 'u64' },
    { name: 'is_active', type: 'bool' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'PublishAuthorityUpdated', fields: [
    { name: 'old_publish_authority', type: { array: ['u8', 32] } },
    { name: 'new_publish_authority', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'DistributorClosed', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'unclaimed_swept', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'AuthorityTransferProposed', fields: [
    { name: 'current_authority', type: { array: ['u8', 32] } },
    { name: 'pending_authority', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'AuthorityTransferAccepted', fields: [
    { name: 'old_authority', type: { array: ['u8', 32] } },
    { name: 'new_authority', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'LiquidityHoldingInitialized', fields: [
    { name: 'liquidity_holding', type: { array: ['u8', 32] } },
    { name: 'liquidity_holding_ata', type: { array: ['u8', 32] } },
    { name: 'payer', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'StreamConverted', fields: [
    { name: 'distributor', type: { array: ['u8', 32] } },
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'protocol_fee', type: 'u64' },
    { name: 'total_funded', type: 'u64' },
    { name: 'locked_vested', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
    { name: 'usdc_in', type: 'u64' },
    { name: 'swap_out_rwt', type: 'u64' },
    { name: 'mint_out_rwt', type: 'u64' },
  ] },
  { name: 'LiquidityHoldingWithdrawn', fields: [
    { name: 'liquidity_holding', type: { array: ['u8', 32] } },
    { name: 'destination_nexus', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'cumulative_withdrawn', type: 'u64' },
    { name: 'slot', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
];

export const YIELD_DISTRIBUTION_EVENTS: ProgramEventRegistry =
  buildProgramEventRegistry('yield-distribution', EVENTS);

// Internal: exposes the inlined IDL-event literals for the IDL-vs-literal
// drift detection test (tests/unit/events-idl-drift.test.ts). Not part of the
// public SDK surface — do not import from outside `@areal/sdk` internals.
export { EVENTS as YIELD_DISTRIBUTION_EVENT_LITERALS };

// ----------------------------------------------------------------------------
// Typed wrappers (top-4 events used by claim flow + indexer)
// ----------------------------------------------------------------------------

/** Emitted by `yield_distribution::claim` on every successful claim. */
export interface RewardsClaimed {
  claimant: PublicKey;
  otMint: PublicKey;
  amount: bigint;
  cumulativeClaimed: bigint;
  timestamp: bigint;
}

/** Emitted by `yield_distribution::publish_root` on each new merkle epoch. */
export interface RootPublished {
  otMint: PublicKey;
  epoch: bigint;
  merkleRoot: Uint8Array;
  maxTotalClaim: bigint;
  timestamp: bigint;
}

/** Emitted by `yield_distribution::fund_distributor`. */
export interface DistributorFunded {
  otMint: PublicKey;
  amount: bigint;
  protocolFee: bigint;
  totalFunded: bigint;
  lockedVested: bigint;
  timestamp: bigint;
}

/**
 * Emitted by the stream-converter crank when revenue → RWT conversion
 * settles a new tranche into a distributor.
 */
export interface StreamConverted {
  distributor: PublicKey;
  otMint: PublicKey;
  amount: bigint;
  protocolFee: bigint;
  totalFunded: bigint;
  lockedVested: bigint;
  timestamp: bigint;
  usdcIn: bigint;
  swapOutRwt: bigint;
  mintOutRwt: bigint;
}
