// AUTO-GENERATED — DO NOT EDIT
// IDL: yield-distribution v0.1.0
// Generator: @arlex/client codegen v1

import { Buffer } from 'buffer';

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

/** Type registry shared across all account parsers in this module. */
const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"DistributionConfig","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"publish_authority","type":{"array":["u8",32]}},{"name":"protocol_fee_bps","type":"u16"},{"name":"min_distribution_amount","type":"u64"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"MerkleDistributor","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"reward_vault","type":{"array":["u8",32]}},{"name":"accumulator","type":{"array":["u8",32]}},{"name":"merkle_root","type":{"array":["u8",32]}},{"name":"max_total_claim","type":"u64"},{"name":"total_claimed","type":"u64"},{"name":"total_funded","type":"u64"},{"name":"locked_vested","type":"u64"},{"name":"last_fund_ts","type":"i64"},{"name":"vesting_period_secs","type":"i64"},{"name":"epoch","type":"u64"},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"Accumulator","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"ClaimStatus","type":{"kind":"struct","fields":[{"name":"claimant","type":{"array":["u8",32]}},{"name":"distributor","type":{"array":["u8",32]}},{"name":"claimed_amount","type":"u64"},{"name":"bump","type":"u8"}]}},{"name":"LiquidityHolding","type":{"kind":"struct","fields":[{"name":"bump","type":"u8"},{"name":"initialized","type":"bool"},{"name":"total_received","type":"u64"},{"name":"total_withdrawn","type":"u64"},{"name":"last_funded_slot","type":"u64"},{"name":"last_withdrawn_slot","type":"u64"},{"name":"last_withdrawn_amount","type":"u64"},{"name":"_reserved","type":{"array":["u8",16]}}]}}] as any);

// ============================================================
// Account: DistributionConfig
// ============================================================

export interface DistributionConfig {
  authority: PublicKey;
  pendingAuthority: PublicKey;
  hasPending: boolean;
  publishAuthority: PublicKey;
  protocolFeeBps: number;
  minDistributionAmount: bigint;
  arealFeeDestination: PublicKey;
  isActive: boolean;
  bump: number;
}

export const DISTRIBUTIONCONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf2, 0xa6, 0x23, 0xd4, 0xf4, 0x7d, 0x1b, 0x57]);

export const WIRE_DISTRIBUTIONCONFIG_FIELDS: WireFieldMap = {
  "authority": "authority",
  "pending_authority": "pendingAuthority",
  "has_pending": "hasPending",
  "publish_authority": "publishAuthority",
  "protocol_fee_bps": "protocolFeeBps",
  "min_distribution_amount": "minDistributionAmount",
  "areal_fee_destination": "arealFeeDestination",
  "is_active": "isActive",
  "bump": "bump",
};

const IDL_DISTRIBUTIONCONFIG_FIELDS: IdlField[] = [
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
    "name": "publish_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "protocol_fee_bps",
    "type": "u16"
  },
  {
    "name": "min_distribution_amount",
    "type": "u64"
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
    "name": "is_active",
    "type": "bool"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a DistributionConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseDistributionConfig(data: Buffer | Uint8Array): DistributionConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, DISTRIBUTIONCONFIG_DISCRIMINATOR, "DistributionConfig");
  const raw = deserializeAccount(IDL_DISTRIBUTIONCONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_DISTRIBUTIONCONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as DistributionConfig;
}

// ============================================================
// Account: MerkleDistributor
// ============================================================

export interface MerkleDistributor {
  otMint: PublicKey;
  rewardVault: PublicKey;
  accumulator: PublicKey;
  merkleRoot: Bytes32;
  maxTotalClaim: bigint;
  totalClaimed: bigint;
  totalFunded: bigint;
  lockedVested: bigint;
  lastFundTs: bigint;
  vestingPeriodSecs: bigint;
  epoch: bigint;
  isActive: boolean;
  bump: number;
}

export const MERKLEDISTRIBUTOR_DISCRIMINATOR: Uint8Array = new Uint8Array([0x4d, 0x77, 0x8b, 0x46, 0x54, 0xf7, 0x0c, 0x1a]);

export const WIRE_MERKLEDISTRIBUTOR_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "reward_vault": "rewardVault",
  "accumulator": "accumulator",
  "merkle_root": "merkleRoot",
  "max_total_claim": "maxTotalClaim",
  "total_claimed": "totalClaimed",
  "total_funded": "totalFunded",
  "locked_vested": "lockedVested",
  "last_fund_ts": "lastFundTs",
  "vesting_period_secs": "vestingPeriodSecs",
  "epoch": "epoch",
  "is_active": "isActive",
  "bump": "bump",
};

const IDL_MERKLEDISTRIBUTOR_FIELDS: IdlField[] = [
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
    "name": "reward_vault",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "accumulator",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "merkle_root",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "max_total_claim",
    "type": "u64"
  },
  {
    "name": "total_claimed",
    "type": "u64"
  },
  {
    "name": "total_funded",
    "type": "u64"
  },
  {
    "name": "locked_vested",
    "type": "u64"
  },
  {
    "name": "last_fund_ts",
    "type": "i64"
  },
  {
    "name": "vesting_period_secs",
    "type": "i64"
  },
  {
    "name": "epoch",
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
 * Parse a MerkleDistributor account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseMerkleDistributor(data: Buffer | Uint8Array): MerkleDistributor {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, MERKLEDISTRIBUTOR_DISCRIMINATOR, "MerkleDistributor");
  const raw = deserializeAccount(IDL_MERKLEDISTRIBUTOR_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_MERKLEDISTRIBUTOR_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as MerkleDistributor;
}

// ============================================================
// Account: Accumulator
// ============================================================

export interface Accumulator {
  otMint: PublicKey;
  bump: number;
}

export const ACCUMULATOR_DISCRIMINATOR: Uint8Array = new Uint8Array([0xa4, 0x42, 0x5b, 0x8b, 0x9e, 0x1a, 0x3f, 0x69]);

export const WIRE_ACCUMULATOR_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "bump": "bump",
};

const IDL_ACCUMULATOR_FIELDS: IdlField[] = [
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
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a Accumulator account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseAccumulator(data: Buffer | Uint8Array): Accumulator {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, ACCUMULATOR_DISCRIMINATOR, "Accumulator");
  const raw = deserializeAccount(IDL_ACCUMULATOR_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_ACCUMULATOR_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as Accumulator;
}

// ============================================================
// Account: ClaimStatus
// ============================================================

export interface ClaimStatus {
  claimant: PublicKey;
  distributor: PublicKey;
  claimedAmount: bigint;
  bump: number;
}

export const CLAIMSTATUS_DISCRIMINATOR: Uint8Array = new Uint8Array([0x16, 0xb7, 0xf9, 0x9d, 0xf7, 0x5f, 0x96, 0x60]);

export const WIRE_CLAIMSTATUS_FIELDS: WireFieldMap = {
  "claimant": "claimant",
  "distributor": "distributor",
  "claimed_amount": "claimedAmount",
  "bump": "bump",
};

const IDL_CLAIMSTATUS_FIELDS: IdlField[] = [
  {
    "name": "claimant",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "distributor",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "claimed_amount",
    "type": "u64"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a ClaimStatus account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseClaimStatus(data: Buffer | Uint8Array): ClaimStatus {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, CLAIMSTATUS_DISCRIMINATOR, "ClaimStatus");
  const raw = deserializeAccount(IDL_CLAIMSTATUS_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_CLAIMSTATUS_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as ClaimStatus;
}

// ============================================================
// Account: LiquidityHolding
// ============================================================

export interface LiquidityHolding {
  bump: number;
  initialized: boolean;
  totalReceived: bigint;
  totalWithdrawn: bigint;
  lastFundedSlot: bigint;
  lastWithdrawnSlot: bigint;
  lastWithdrawnAmount: bigint;
  _reserved: Uint8Array;
}

export const LIQUIDITYHOLDING_DISCRIMINATOR: Uint8Array = new Uint8Array([0x42, 0xcb, 0x9c, 0x40, 0x14, 0x8c, 0x72, 0x8d]);

export const WIRE_LIQUIDITYHOLDING_FIELDS: WireFieldMap = {
  "bump": "bump",
  "initialized": "initialized",
  "total_received": "totalReceived",
  "total_withdrawn": "totalWithdrawn",
  "last_funded_slot": "lastFundedSlot",
  "last_withdrawn_slot": "lastWithdrawnSlot",
  "last_withdrawn_amount": "lastWithdrawnAmount",
  "_reserved": "_reserved",
};

const IDL_LIQUIDITYHOLDING_FIELDS: IdlField[] = [
  {
    "name": "bump",
    "type": "u8"
  },
  {
    "name": "initialized",
    "type": "bool"
  },
  {
    "name": "total_received",
    "type": "u64"
  },
  {
    "name": "total_withdrawn",
    "type": "u64"
  },
  {
    "name": "last_funded_slot",
    "type": "u64"
  },
  {
    "name": "last_withdrawn_slot",
    "type": "u64"
  },
  {
    "name": "last_withdrawn_amount",
    "type": "u64"
  },
  {
    "name": "_reserved",
    "type": {
      "array": [
        "u8",
        16
      ]
    }
  }
];

/**
 * Parse a LiquidityHolding account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseLiquidityHolding(data: Buffer | Uint8Array): LiquidityHolding {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, LIQUIDITYHOLDING_DISCRIMINATOR, "LiquidityHolding");
  const raw = deserializeAccount(IDL_LIQUIDITYHOLDING_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_LIQUIDITYHOLDING_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as LiquidityHolding;
}
