// Event registry for the Futarchy program.
//
// Source IDL: sdk/idl/futarchy.json (events array, 8 events).
// No typed wrappers in Phase 12.1 — proposal flow is admin-only and not in
// the Phase 6/7 user-facing scope. Add typed shapes when a UI consumes them.

import type { IdlEvent } from '@arlex/client';

import { buildProgramEventRegistry } from './registry.js';
import type { ProgramEventRegistry } from './types.js';

const EVENTS: readonly IdlEvent[] = [
  { name: 'FutarchyInitialized', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'authority', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'ProposalCreated', fields: [
    { name: 'proposal_id', type: 'u64' },
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'proposer', type: { array: ['u8', 32] } },
    { name: 'proposal_type', type: 'u8' },
    { name: 'amount', type: 'u64' },
    { name: 'destination', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'ProposalApproved', fields: [
    { name: 'proposal_id', type: 'u64' },
    { name: 'approver', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'ProposalCancelled', fields: [
    { name: 'proposal_id', type: 'u64' },
    { name: 'authority', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'ProposalExecuted', fields: [
    { name: 'proposal_id', type: 'u64' },
    { name: 'proposal_type', type: 'u8' },
    { name: 'executor', type: { array: ['u8', 32] } },
    { name: 'timestamp', type: 'i64' },
  ] },
  { name: 'OtGovernanceClaimed', fields: [
    { name: 'ot_mint', type: { array: ['u8', 32] } },
    { name: 'futarchy_config', type: { array: ['u8', 32] } },
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
];

export const FUTARCHY_EVENTS: ProgramEventRegistry =
  buildProgramEventRegistry('futarchy', EVENTS);
