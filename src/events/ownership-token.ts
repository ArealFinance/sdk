// Event registry + typed wrappers for the Ownership Token program.
//
// Source IDL: sdk/idl/ownership-token.json (events array, 8 events).
// Typed wrappers cover OtMinted (mint flow) and RevenueDistributed
// (yield-distribution feeder).

import type { PublicKey } from '@solana/web3.js';
import type { IdlEvent } from '@arlex/client';

import { buildProgramEventRegistry } from './registry.js';
import type { ProgramEventRegistry } from './types.js';

const EVENTS: readonly IdlEvent[] = [
  { name: 'OtInitialized', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'authority', type: { array: ['u8', 32] } },
    { name: 'decimals', type: 'u8' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'OtMinted', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'recipient', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'new_total_minted', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'RevenueDistributed', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'total_amount', type: 'u64' },
    { name: 'protocol_fee', type: 'u64' },
    { name: 'distribution_count', type: 'u64' },
    { name: 'num_destinations', type: 'u8' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'DestinationConfigUpdated', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'config_version', type: 'u64' },
    { name: 'active_count', type: 'u8' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'AuthorityTransferProposed', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'current_authority', type: { array: ['u8', 32] } },
    { name: 'pending_authority', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'AuthorityTransferAccepted', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'old_authority', type: { array: ['u8', 32] } },
    { name: 'new_authority', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'TreasurySpent', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'token_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'destination', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'TreasuryYieldClaimed', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'yd_ot_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
];

export const OWNERSHIP_TOKEN_EVENTS: ProgramEventRegistry =
  buildProgramEventRegistry('ownership-token', EVENTS);

// Internal: exposes the inlined IDL-event literals for the IDL-vs-literal
// drift detection test (tests/unit/events-idl-drift.test.ts). Not part of the
// public SDK surface — do not import from outside `@areal/sdk` internals.
export { EVENTS as OWNERSHIP_TOKEN_EVENT_LITERALS };

// ----------------------------------------------------------------------------
// Typed wrappers
// ----------------------------------------------------------------------------

/** Emitted by `mint_ot` on a successful OT mint. */
export interface OtMinted {
  otMint: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  newTotalMinted: bigint;
  timestamp: bigint;
}

/** Emitted by `distribute_revenue` on each fan-out cycle. */
export interface RevenueDistributed {
  otMint: PublicKey;
  totalAmount: bigint;
  protocolFee: bigint;
  distributionCount: bigint;
  numDestinations: number;
  timestamp: bigint;
}
