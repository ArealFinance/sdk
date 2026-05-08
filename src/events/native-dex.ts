// Event registry + typed wrappers for the Native DEX program.
//
// Source IDL: sdk/idl/native-dex.json (events array, 20 events).
// Typed wrappers cover the four most-consumed events (SwapExecuted,
// LiquidityAdded, LiquidityRemoved, ZapLiquidityExecuted) — these drive the
// price ticker, position changes, and the indexer's pool-volume aggregations.

import type { PublicKey } from '@solana/web3.js';
import type { IdlEvent } from '@arlex/client';

import { buildProgramEventRegistry } from './registry.js';
import type { ProgramEventRegistry } from './types.js';

const EVENTS: readonly IdlEvent[] = [
  { name: 'DexInitialized', fields: [
    { name: 'authority', type: { array: ['u8', 32] } },
    { name: 'base_fee_bps', type: 'u16' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'PoolCreated', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'token_a_mint', type: { array: ['u8', 32] } },
    { name: 'token_b_mint', type: { array: ['u8', 32] } },
    { name: 'pool_type', type: 'u8' },
    { name: 'creator', type: { array: ['u8', 32] } },
    { name: 'ot_treasury_fee_destination', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'LiquidityAdded', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'provider', type: { array: ['u8', 32] } },
    { name: 'amount_a', type: 'u64' },
    { name: 'amount_b', type: 'u64' },
    { name: 'shares_minted', type: 'u128' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'ZapLiquidityExecuted', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'provider', type: { array: ['u8', 32] } },
    { name: 'input_a', type: 'u64' },
    { name: 'input_b', type: 'u64' },
    { name: 'swapped_amount', type: 'u64' },
    { name: 'shares_minted', type: 'u128' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'LiquidityRemoved', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'provider', type: { array: ['u8', 32] } },
    { name: 'amount_a', type: 'u64' },
    { name: 'amount_b', type: 'u64' },
    { name: 'shares_burned', type: 'u128' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'SwapExecuted', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'user', type: { array: ['u8', 32] } },
    { name: 'a_to_b', type: 'bool' },
    { name: 'amount_in', type: 'u64' },
    { name: 'amount_out', type: 'u64' },
    { name: 'fee_lp', type: 'u64' },
    { name: 'fee_protocol', type: 'u64' },
    { name: 'fee_ot_treasury', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'PoolCreatorsUpdated', fields: [
    { name: 'wallet', type: { array: ['u8', 32] } },
    { name: 'action', type: 'u8' },
    { name: 'active_count', type: 'u8' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'DexConfigUpdated', fields: [
    { name: 'base_fee_bps', type: 'u16' },
    { name: 'lp_fee_share_bps', type: 'u16' },
    { name: 'rebalancer', type: { array: ['u8', 32] } },
    { name: 'is_active', type: 'bool' },
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
  { name: 'PoolPaused', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'PoolUnpaused', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'LiquidityShifted', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'rebalancer', type: { array: ['u8', 32] } },
    { name: 'old_lower', type: 'i32' },
    { name: 'old_upper', type: 'i32' },
    { name: 'new_lower', type: 'i32' },
    { name: 'new_upper', type: 'i32' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'CompoundYieldExecuted', fields: [
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'rwt_claimed', type: 'u64' },
    { name: 'rwt_side', type: 'u8' },
    { name: 'reserve_after', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'NexusInitialized', fields: [
    { name: 'manager', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'NexusDeposited', fields: [
    { name: 'token_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'new_total_deposited', type: 'u64' },
    { name: 'source_kind', type: 'u8' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'NexusProfitsWithdrawn', fields: [
    { name: 'token_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'remaining_profit', type: 'u64' },
    { name: 'treasury_destination', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'NexusRewardsClaimed', fields: [
    { name: 'amount', type: 'u64' },
    { name: 'treasury_destination', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'NexusManagerUpdated', fields: [
    { name: 'old_manager', type: { array: ['u8', 32] } },
    { name: 'new_manager', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'LpFeesClaimed', fields: [
    { name: 'recipient', type: { array: ['u8', 32] } },
    { name: 'pool', type: { array: ['u8', 32] } },
    { name: 'claimable_a', type: 'u64' },
    { name: 'claimable_b', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
];

export const NATIVE_DEX_EVENTS: ProgramEventRegistry =
  buildProgramEventRegistry('native-dex', EVENTS);

// Internal: exposes the inlined IDL-event literals for the IDL-vs-literal
// drift detection test (tests/unit/events-idl-drift.test.ts). Not part of the
// public SDK surface — do not import from outside `@areal/sdk` internals.
export { EVENTS as NATIVE_DEX_EVENT_LITERALS };

// ----------------------------------------------------------------------------
// Typed wrappers (top-4 events used by price ticker + LP UI + indexer)
// ----------------------------------------------------------------------------

/** Emitted by `swap` on every successful swap leg. */
export interface SwapExecuted {
  pool: PublicKey;
  user: PublicKey;
  aToB: boolean;
  amountIn: bigint;
  amountOut: bigint;
  feeLp: bigint;
  feeProtocol: bigint;
  feeOtTreasury: bigint;
  timestamp: bigint;
}

/** Emitted by `add_liquidity` on a successful balanced deposit. */
export interface LiquidityAdded {
  pool: PublicKey;
  provider: PublicKey;
  amountA: bigint;
  amountB: bigint;
  sharesMinted: bigint; // u128 — bigint
  timestamp: bigint;
}

/** Emitted by `remove_liquidity` on a successful exit. */
export interface LiquidityRemoved {
  pool: PublicKey;
  provider: PublicKey;
  amountA: bigint;
  amountB: bigint;
  sharesBurned: bigint; // u128 — bigint
  timestamp: bigint;
}

/** Emitted by `zap_liquidity` on a single-sided deposit (auto-swap then add). */
export interface ZapLiquidityExecuted {
  pool: PublicKey;
  provider: PublicKey;
  inputA: bigint;
  inputB: bigint;
  swappedAmount: bigint;
  sharesMinted: bigint; // u128 — bigint
  timestamp: bigint;
}
