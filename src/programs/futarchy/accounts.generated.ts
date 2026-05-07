// AUTO-GENERATED — DO NOT EDIT
// IDL: futarchy v0.1.0
// Generator: @arlex/client codegen v1

import { Buffer } from 'buffer';

import {
  PublicKey,
  type Bytes32,
  type WireFieldMap,
  type IdlField,
  deserializeAccount,
  accountDiscriminator,
  parseDiscriminator,
  remapWireToTs,
} from '@arlex/client/codegen-runtime';

import {
  TYPE_REGISTRY,
} from './defined-types.generated.js';

// ============================================================
// Account: FutarchyConfig
// ============================================================

export interface FutarchyConfig {
  otMint: PublicKey;
  authority: PublicKey;
  pendingAuthority: PublicKey;
  hasPending: boolean;
  nextProposalId: bigint;
  isActive: boolean;
  bump: number;
}

export const FUTARCHYCONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0xe3, 0xa5, 0x06, 0x66, 0x6d, 0x3b, 0x5d, 0x83]);

export const WIRE_FUTARCHYCONFIG_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "authority": "authority",
  "pending_authority": "pendingAuthority",
  "has_pending": "hasPending",
  "next_proposal_id": "nextProposalId",
  "is_active": "isActive",
  "bump": "bump",
};

/** Pubkey-classified [u8;32] fields for FutarchyConfig (heuristic + overrides). */
export const PUBKEY_FUTARCHYCONFIG_FIELDS = [
  "otMint",
  "authority",
  "pendingAuthority",
] as const;

const IDL_FUTARCHYCONFIG_FIELDS: IdlField[] = [
  {
    "name": "ot_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "pending_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "has_pending",
    "type": "bool"
  },
  {
    "name": "next_proposal_id",
    "type": "u64"
  },
  {
    "name": "is_active",
    "type": "bool"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a FutarchyConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseFutarchyConfig(data: Buffer | Uint8Array): FutarchyConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, FUTARCHYCONFIG_DISCRIMINATOR, "FutarchyConfig");
  const raw = deserializeAccount(IDL_FUTARCHYCONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_FUTARCHYCONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
    pubkeyFields: PUBKEY_FUTARCHYCONFIG_FIELDS,
  }) as unknown as FutarchyConfig;
}

// ============================================================
// Account: Proposal
// ============================================================

export interface Proposal {
  proposalId: bigint;
  otMint: PublicKey;
  proposer: PublicKey;
  proposalType: number;
  amount: bigint;
  destination: PublicKey;
  tokenMint: PublicKey;
  paramsHash: Bytes32;
  status: number;
  createdTs: bigint;
  executedTs: bigint;
  bump: number;
}

export const PROPOSAL_DISCRIMINATOR: Uint8Array = new Uint8Array([0x1a, 0x5e, 0xbd, 0xbb, 0x74, 0x88, 0x35, 0x21]);

export const WIRE_PROPOSAL_FIELDS: WireFieldMap = {
  "proposal_id": "proposalId",
  "ot_mint": "otMint",
  "proposer": "proposer",
  "proposal_type": "proposalType",
  "amount": "amount",
  "destination": "destination",
  "token_mint": "tokenMint",
  "params_hash": "paramsHash",
  "status": "status",
  "created_ts": "createdTs",
  "executed_ts": "executedTs",
  "bump": "bump",
};

/** Pubkey-classified [u8;32] fields for Proposal (heuristic + overrides). */
export const PUBKEY_PROPOSAL_FIELDS = [
  "otMint",
  "proposer",
  "destination",
  "tokenMint",
] as const;

const IDL_PROPOSAL_FIELDS: IdlField[] = [
  {
    "name": "proposal_id",
    "type": "u64"
  },
  {
    "name": "ot_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "proposer",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
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
  },
  {
    "name": "status",
    "type": "u8"
  },
  {
    "name": "created_ts",
    "type": "i64"
  },
  {
    "name": "executed_ts",
    "type": "i64"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a Proposal account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseProposal(data: Buffer | Uint8Array): Proposal {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, PROPOSAL_DISCRIMINATOR, "Proposal");
  const raw = deserializeAccount(IDL_PROPOSAL_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_PROPOSAL_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
    pubkeyFields: PUBKEY_PROPOSAL_FIELDS,
  }) as unknown as Proposal;
}
