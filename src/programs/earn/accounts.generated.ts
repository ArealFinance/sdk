// AUTO-GENERATED — DO NOT EDIT
// IDL: earn v0.1.2
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
// Account: EarnConfig
// ============================================================

export interface EarnConfig {
  totalInvestedCapital: bigint;
  authority: PublicKey;
  pendingAuthority: PublicKey;
  hasPending: boolean;
  mintFeeBps: number;
  basketVault: Bytes32;
  daoFeeDestination: PublicKey;
  rwtMint: PublicKey;
  usdcMint: PublicKey;
  minMintAmount: bigint;
  bump: number;
  schemaVersion: number;
  _reserved: Uint8Array;
}

export const EARNCONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0x8f, 0x6e, 0x3f, 0xb5, 0x95, 0x8c, 0xbe, 0x90]);

export const WIRE_EARNCONFIG_FIELDS: WireFieldMap = {
  "total_invested_capital": "totalInvestedCapital",
  "authority": "authority",
  "pending_authority": "pendingAuthority",
  "has_pending": "hasPending",
  "mint_fee_bps": "mintFeeBps",
  "basket_vault": "basketVault",
  "dao_fee_destination": "daoFeeDestination",
  "rwt_mint": "rwtMint",
  "usdc_mint": "usdcMint",
  "min_mint_amount": "minMintAmount",
  "bump": "bump",
  "schema_version": "schemaVersion",
  "_reserved": "_reserved",
};

/** Pubkey-classified [u8;32] fields for EarnConfig (heuristic + overrides). */
export const PUBKEY_EARNCONFIG_FIELDS = [
  "authority",
  "pendingAuthority",
  "daoFeeDestination",
  "rwtMint",
  "usdcMint",
] as const;

const IDL_EARNCONFIG_FIELDS: IdlField[] = [
  {
    "name": "total_invested_capital",
    "type": "u128"
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
    "name": "mint_fee_bps",
    "type": "u16"
  },
  {
    "name": "basket_vault",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "dao_fee_destination",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "rwt_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "usdc_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "min_mint_amount",
    "type": "u64"
  },
  {
    "name": "bump",
    "type": "u8"
  },
  {
    "name": "schema_version",
    "type": "u8"
  },
  {
    "name": "_reserved",
    "type": {
      "array": [
        "u8",
        128
      ]
    }
  }
];

/**
 * Parse a EarnConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseEarnConfig(data: Buffer | Uint8Array): EarnConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, EARNCONFIG_DISCRIMINATOR, "EarnConfig");
  const raw = deserializeAccount(IDL_EARNCONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_EARNCONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
    pubkeyFields: PUBKEY_EARNCONFIG_FIELDS,
  }) as unknown as EarnConfig;
}
