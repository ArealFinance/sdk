// Event registry + typed wrappers for the RWT Engine program.
//
// Source IDL: sdk/idl/rwt-engine.json (events array, 11 events).
// Typed wrapper covers RwtMinted (the headline mint flow consumed by the
// portfolio + indexer); the remaining 10 events decode dynamically.

import type { PublicKey } from '@solana/web3.js';
import type { IdlEvent } from '@arlex/client';

import { buildProgramEventRegistry } from './registry.js';
import type { ProgramEventRegistry } from './types.js';

const EVENTS: readonly IdlEvent[] = [
  { name: 'VaultInitialized', fields: [
    { name: 'authority', type: { array: ['u8', 32] } },
    { name: 'rwt_mint', type: { array: ['u8', 32] } },
    { name: 'nav', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'RwtMinted', fields: [
    { name: 'user', type: { array: ['u8', 32] } },
    { name: 'deposit_amount', type: 'u64' },
    { name: 'rwt_amount', type: 'u64' },
    { name: 'fee_vault', type: 'u64' },
    { name: 'fee_dao', type: 'u64' },
    { name: 'nav_after', type: 'u64' },
    { name: 'is_admin', type: 'bool' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'CapitalAdjusted', fields: [
    { name: 'old_capital', type: 'u128' },
    { name: 'new_capital', type: 'u128' },
    { name: 'writedown_amount', type: 'u64' },
    { name: 'old_nav', type: 'u64' },
    { name: 'new_nav', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'VaultManagerUpdated', fields: [
    { name: 'old_manager', type: { array: ['u8', 32] } },
    { name: 'new_manager', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'DistributionConfigUpdated', fields: [
    { name: 'book_value_bps', type: 'u16' },
    { name: 'liquidity_bps', type: 'u16' },
    { name: 'protocol_revenue_bps', type: 'u16' },
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
  { name: 'MintPauseToggled', fields: [
    { name: 'paused', type: 'bool' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'VaultSwapExecuted', fields: [
    { name: 'token_in_mint', type: { array: ['u8', 32] } },
    { name: 'token_out_mint', type: { array: ['u8', 32] } },
    { name: 'amount_in', type: 'u64' },
    { name: 'amount_out', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'YieldDistributed', fields: [
    { name: 'vault', type: { array: ['u8', 32] } },
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'total_yield', type: 'u64' },
    { name: 'book_value_share', type: 'u64' },
    { name: 'liquidity_share', type: 'u64' },
    { name: 'protocol_revenue_share', type: 'u64' },
    { name: 'nav_before', type: 'u64' },
    { name: 'nav_after', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'LiquidityHoldingFunded', fields: [
    { name: 'liquidity_holding', type: { array: ['u8', 32] } },
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'amount', type: 'u64' },
    { name: 'timestamp', type: 'i64' },
  ] },
];

export const RWT_ENGINE_EVENTS: ProgramEventRegistry =
  buildProgramEventRegistry('rwt-engine', EVENTS);

// ----------------------------------------------------------------------------
// Typed wrappers
// ----------------------------------------------------------------------------

/** Emitted by `mint_rwt` on a successful deposit → RWT mint. */
export interface RwtMinted {
  user: PublicKey;
  depositAmount: bigint;
  rwtAmount: bigint;
  feeVault: bigint;
  feeDao: bigint;
  navAfter: bigint;
  isAdmin: boolean;
  timestamp: bigint;
}
