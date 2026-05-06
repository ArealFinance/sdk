// AUTO-GENERATED — DO NOT EDIT
// IDL: rwt_engine v0.1.0
// Generator: @arlex/client codegen v1

import {
  PublicKey,
  type Bytes32,
  type WireFieldMap,
  type IdlField,
  type TypeRegistry,
  buildTypeRegistry,
  deserializeAccount,
  accountDiscriminator,
  parseDiscriminator,
  remapWireToTs,
} from '@arlex/client/codegen-runtime';
import { Buffer } from 'buffer';

/** Type registry shared across all account parsers in this module. */
const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"RwtVault","type":{"kind":"struct","fields":[{"name":"total_invested_capital","type":"u128"},{"name":"total_rwt_supply","type":"u64"},{"name":"nav_book_value","type":"u64"},{"name":"capital_accumulator_ata","type":{"array":["u8",32]}},{"name":"rwt_mint","type":{"array":["u8",32]}},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"manager","type":{"array":["u8",32]}},{"name":"pause_authority","type":{"array":["u8",32]}},{"name":"mint_paused","type":"bool"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"RwtDistributionConfig","type":{"kind":"struct","fields":[{"name":"book_value_bps","type":"u16"},{"name":"liquidity_bps","type":"u16"},{"name":"protocol_revenue_bps","type":"u16"},{"name":"liquidity_destination","type":{"array":["u8",32]}},{"name":"protocol_revenue_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}}] as any);

// ============================================================
// Account: RwtVault
// ============================================================

export interface RwtVault {
  totalInvestedCapital: bigint;
  totalRwtSupply: bigint;
  navBookValue: bigint;
  capitalAccumulatorAta: PublicKey;
  rwtMint: PublicKey;
  authority: PublicKey;
  pendingAuthority: PublicKey;
  hasPending: boolean;
  manager: PublicKey;
  pauseAuthority: PublicKey;
  mintPaused: boolean;
  arealFeeDestination: PublicKey;
  bump: number;
}

export const RWTVAULT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x60, 0x43, 0xda, 0x41, 0x42, 0x7a, 0x0a, 0x11]);

export const WIRE_RWTVAULT_FIELDS: WireFieldMap = {
  "total_invested_capital": "totalInvestedCapital",
  "total_rwt_supply": "totalRwtSupply",
  "nav_book_value": "navBookValue",
  "capital_accumulator_ata": "capitalAccumulatorAta",
  "rwt_mint": "rwtMint",
  "authority": "authority",
  "pending_authority": "pendingAuthority",
  "has_pending": "hasPending",
  "manager": "manager",
  "pause_authority": "pauseAuthority",
  "mint_paused": "mintPaused",
  "areal_fee_destination": "arealFeeDestination",
  "bump": "bump",
};

const IDL_RWTVAULT_FIELDS: IdlField[] = [
  {
    "name": "total_invested_capital",
    "type": "u128"
  },
  {
    "name": "total_rwt_supply",
    "type": "u64"
  },
  {
    "name": "nav_book_value",
    "type": "u64"
  },
  {
    "name": "capital_accumulator_ata",
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
    "name": "manager",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "pause_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "mint_paused",
    "type": "bool"
  },
  {
    "name": "areal_fee_destination",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a RwtVault account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseRwtVault(data: Buffer | Uint8Array): RwtVault {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, RWTVAULT_DISCRIMINATOR, "RwtVault");
  const raw = deserializeAccount(IDL_RWTVAULT_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_RWTVAULT_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as RwtVault;
}

// ============================================================
// Account: RwtDistributionConfig
// ============================================================

export interface RwtDistributionConfig {
  bookValueBps: number;
  liquidityBps: number;
  protocolRevenueBps: number;
  liquidityDestination: PublicKey;
  protocolRevenueDestination: PublicKey;
  bump: number;
}

export const RWTDISTRIBUTIONCONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf3, 0x8c, 0x09, 0xcb, 0xcb, 0x0d, 0xcf, 0xf3]);

export const WIRE_RWTDISTRIBUTIONCONFIG_FIELDS: WireFieldMap = {
  "book_value_bps": "bookValueBps",
  "liquidity_bps": "liquidityBps",
  "protocol_revenue_bps": "protocolRevenueBps",
  "liquidity_destination": "liquidityDestination",
  "protocol_revenue_destination": "protocolRevenueDestination",
  "bump": "bump",
};

const IDL_RWTDISTRIBUTIONCONFIG_FIELDS: IdlField[] = [
  {
    "name": "book_value_bps",
    "type": "u16"
  },
  {
    "name": "liquidity_bps",
    "type": "u16"
  },
  {
    "name": "protocol_revenue_bps",
    "type": "u16"
  },
  {
    "name": "liquidity_destination",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "protocol_revenue_destination",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a RwtDistributionConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseRwtDistributionConfig(data: Buffer | Uint8Array): RwtDistributionConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, RWTDISTRIBUTIONCONFIG_DISCRIMINATOR, "RwtDistributionConfig");
  const raw = deserializeAccount(IDL_RWTDISTRIBUTIONCONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_RWTDISTRIBUTIONCONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as RwtDistributionConfig;
}
