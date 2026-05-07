// AUTO-GENERATED — DO NOT EDIT
// IDL: futarchy v0.1.0
// Generator: @arlex/client codegen v1

import { Buffer } from 'buffer';

import {
  PublicKey,
  type Bytes32,
  type WireFieldMap,
  type IdlField,
  serializeArgs,
  instructionDiscriminator,
  remapTsToWire,
} from '@arlex/client/codegen-runtime';

import {
  TYPE_REGISTRY,
} from './defined-types.generated.js';

// ============================================================
// Instruction: initialize_futarchy
// ============================================================

export const INITIALIZE_FUTARCHY_DISCRIMINATOR: Uint8Array = new Uint8Array([0x66, 0x44, 0x33, 0x1e, 0xc4, 0x80, 0xc0, 0x64]);

export interface InitializeFutarchyAccounts {
  /** signer, writable */
  deployer: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  otGovernance: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

/** Encode (no args) for the `initialize_futarchy` instruction — discriminator only. */
export function encodeInitializeFutarchyArgs(): Buffer {
  return Buffer.from(INITIALIZE_FUTARCHY_DISCRIMINATOR);
}

// ============================================================
// Instruction: create_proposal
// ============================================================

export const CREATE_PROPOSAL_DISCRIMINATOR: Uint8Array = new Uint8Array([0x84, 0x74, 0x44, 0xae, 0xd8, 0xa0, 0xc6, 0x16]);

export interface CreateProposalAccounts {
  /** signer, writable */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly, writable */
  proposal: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface CreateProposalArgs {
  proposalType: number;
  amount: bigint;
  destination: PublicKey;
  tokenMint: PublicKey;
  paramsHash: Bytes32;
}

const IDL_CREATE_PROPOSAL_ARG_FIELDS: IdlField[] = [
  {
    "name": "proposal_type",
    "type": "u8"
  },
  {
    "name": "amount",
    "type": "u64"
  },
  {
    "name": "destination",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "token_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "params_hash",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_CREATE_PROPOSAL_ARG_FIELDS: WireFieldMap = {
  "proposal_type": "proposalType",
  "amount": "amount",
  "destination": "destination",
  "token_mint": "tokenMint",
  "params_hash": "paramsHash",
};

/**
 * Encode arguments for the `create_proposal` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeCreateProposalArgs(args: CreateProposalArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_CREATE_PROPOSAL_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_CREATE_PROPOSAL_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(CREATE_PROPOSAL_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: approve_proposal
// ============================================================

export const APPROVE_PROPOSAL_DISCRIMINATOR: Uint8Array = new Uint8Array([0x88, 0x6c, 0x66, 0x55, 0x62, 0x72, 0x07, 0x93]);

export interface ApproveProposalAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly, writable */
  proposal: PublicKey;
}

/** Encode (no args) for the `approve_proposal` instruction — discriminator only. */
export function encodeApproveProposalArgs(): Buffer {
  return Buffer.from(APPROVE_PROPOSAL_DISCRIMINATOR);
}

// ============================================================
// Instruction: cancel_proposal
// ============================================================

export const CANCEL_PROPOSAL_DISCRIMINATOR: Uint8Array = new Uint8Array([0x6a, 0x4a, 0x80, 0x92, 0x13, 0x41, 0x27, 0x17]);

export interface CancelProposalAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly, writable */
  proposal: PublicKey;
}

/** Encode (no args) for the `cancel_proposal` instruction — discriminator only. */
export function encodeCancelProposalArgs(): Buffer {
  return Buffer.from(CANCEL_PROPOSAL_DISCRIMINATOR);
}

// ============================================================
// Instruction: execute_proposal
// ============================================================

export const EXECUTE_PROPOSAL_DISCRIMINATOR: Uint8Array = new Uint8Array([0xba, 0x3c, 0x74, 0x85, 0x6c, 0x80, 0x6f, 0x1c]);

export interface ExecuteProposalAccounts {
  /** signer, writable */
  executor: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly, writable */
  proposal: PublicKey;
  /** readonly */
  otProgram: PublicKey;
}

/** Encode (no args) for the `execute_proposal` instruction — discriminator only. */
export function encodeExecuteProposalArgs(): Buffer {
  return Buffer.from(EXECUTE_PROPOSAL_DISCRIMINATOR);
}

// ============================================================
// Instruction: claim_ot_governance
// ============================================================

export const CLAIM_OT_GOVERNANCE_DISCRIMINATOR: Uint8Array = new Uint8Array([0x6c, 0x1b, 0xd4, 0xc7, 0xe6, 0x67, 0x72, 0x3a]);

export interface ClaimOtGovernanceAccounts {
  /** signer, writable */
  executor: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly, writable */
  otGovernance: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  otProgram: PublicKey;
}

/** Encode (no args) for the `claim_ot_governance` instruction — discriminator only. */
export function encodeClaimOtGovernanceArgs(): Buffer {
  return Buffer.from(CLAIM_OT_GOVERNANCE_DISCRIMINATOR);
}

// ============================================================
// Instruction: propose_authority_transfer
// ============================================================

export const PROPOSE_AUTHORITY_TRANSFER_DISCRIMINATOR: Uint8Array = new Uint8Array([0x39, 0xce, 0xe1, 0x81, 0x23, 0x6f, 0xae, 0x91]);

export interface ProposeAuthorityTransferAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
}

export interface ProposeAuthorityTransferArgs {
  newAuthority: PublicKey;
}

const IDL_PROPOSE_AUTHORITY_TRANSFER_ARG_FIELDS: IdlField[] = [
  {
    "name": "new_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_PROPOSE_AUTHORITY_TRANSFER_ARG_FIELDS: WireFieldMap = {
  "new_authority": "newAuthority",
};

/**
 * Encode arguments for the `propose_authority_transfer` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeProposeAuthorityTransferArgs(args: ProposeAuthorityTransferArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_PROPOSE_AUTHORITY_TRANSFER_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_PROPOSE_AUTHORITY_TRANSFER_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(PROPOSE_AUTHORITY_TRANSFER_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: accept_authority_transfer
// ============================================================

export const ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR: Uint8Array = new Uint8Array([0xef, 0xf8, 0xb1, 0x02, 0xce, 0x61, 0x2e, 0xff]);

export interface AcceptAuthorityTransferAccounts {
  /** signer */
  newAuthority: PublicKey;
  /** readonly, writable */
  config: PublicKey;
}

/** Encode (no args) for the `accept_authority_transfer` instruction — discriminator only. */
export function encodeAcceptAuthorityTransferArgs(): Buffer {
  return Buffer.from(ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR);
}
