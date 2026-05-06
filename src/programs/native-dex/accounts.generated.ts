// AUTO-GENERATED — DO NOT EDIT
// IDL: native_dex v0.1.0
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

/** Defined struct from IDL: Bin */
export interface Bin {
  liquidityA: bigint;
  liquidityB: bigint;
}

export const WIRE_BIN_FIELDS: WireFieldMap = {
  "liquidity_a": "liquidityA",
  "liquidity_b": "liquidityB",
};

/** Raw IDL field shape for Bin — used by the runtime serializer. */
export const IDL_BIN_FIELDS: IdlField[] = [
  {
    "name": "liquidity_a",
    "type": "u64"
  },
  {
    "name": "liquidity_b",
    "type": "u64"
  }
];

/** Type registry shared across all account parsers in this module. */
const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([{"name":"Bin","type":{"kind":"struct","fields":[{"name":"liquidity_a","type":"u64"},{"name":"liquidity_b","type":"u64"}]}}] as any, [{"name":"DexConfig","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"pause_authority","type":{"array":["u8",32]}},{"name":"base_fee_bps","type":"u16"},{"name":"lp_fee_share_bps","type":"u16"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"rebalancer","type":{"array":["u8",32]}},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"PoolState","type":{"kind":"struct","fields":[{"name":"pool_type","type":"u8"},{"name":"token_a_mint","type":{"array":["u8",32]}},{"name":"token_b_mint","type":{"array":["u8",32]}},{"name":"vault_a","type":{"array":["u8",32]}},{"name":"vault_b","type":{"array":["u8",32]}},{"name":"reserve_a","type":"u64"},{"name":"reserve_b","type":"u64"},{"name":"total_lp_shares","type":"u128"},{"name":"fee_bps","type":"u16"},{"name":"is_active","type":"bool"},{"name":"total_fees_accumulated","type":"u64"},{"name":"bin_step_bps","type":"u16"},{"name":"active_bin_id","type":"i32"},{"name":"ot_treasury_fee_destination","type":{"array":["u8",32]}},{"name":"has_ot_treasury","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"PoolCreators","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"creators","type":{"array":[{"array":["u8",32]},10]}},{"name":"active_count","type":"u8"},{"name":"bump","type":"u8"}]}},{"name":"LpPosition","type":{"kind":"struct","fields":[{"name":"pool","type":{"array":["u8",32]}},{"name":"owner","type":{"array":["u8",32]}},{"name":"shares","type":"u128"},{"name":"last_update_ts","type":"i64"},{"name":"bump","type":"u8"}]}},{"name":"BinArray","type":{"kind":"struct","fields":[{"name":"pool","type":{"array":["u8",32]}},{"name":"bins","type":{"array":[{"defined":"Bin"},70]}},{"name":"lower_bin_id","type":"i32"},{"name":"bin_step_bps","type":"u16"},{"name":"active_bin_id","type":"i32"},{"name":"bump","type":"u8"}]}}] as any);

// ============================================================
// Account: DexConfig
// ============================================================

export interface DexConfig {
  authority: PublicKey;
  pendingAuthority: PublicKey;
  hasPending: boolean;
  pauseAuthority: PublicKey;
  baseFeeBps: number;
  lpFeeShareBps: number;
  arealFeeDestination: PublicKey;
  rebalancer: PublicKey;
  isActive: boolean;
  bump: number;
}

export const DEXCONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0x50, 0xc5, 0xfc, 0xc4, 0x8e, 0x98, 0xfb, 0x48]);

export const WIRE_DEXCONFIG_FIELDS: WireFieldMap = {
  "authority": "authority",
  "pending_authority": "pendingAuthority",
  "has_pending": "hasPending",
  "pause_authority": "pauseAuthority",
  "base_fee_bps": "baseFeeBps",
  "lp_fee_share_bps": "lpFeeShareBps",
  "areal_fee_destination": "arealFeeDestination",
  "rebalancer": "rebalancer",
  "is_active": "isActive",
  "bump": "bump",
};

const IDL_DEXCONFIG_FIELDS: IdlField[] = [
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
    "name": "pause_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "base_fee_bps",
    "type": "u16"
  },
  {
    "name": "lp_fee_share_bps",
    "type": "u16"
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
    "name": "rebalancer",
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
 * Parse a DexConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseDexConfig(data: Buffer | Uint8Array): DexConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, DEXCONFIG_DISCRIMINATOR, "DexConfig");
  const raw = deserializeAccount(IDL_DEXCONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_DEXCONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as DexConfig;
}

// ============================================================
// Account: PoolState
// ============================================================

export interface PoolState {
  poolType: number;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  totalLpShares: bigint;
  feeBps: number;
  isActive: boolean;
  totalFeesAccumulated: bigint;
  binStepBps: number;
  activeBinId: number;
  otTreasuryFeeDestination: PublicKey;
  hasOtTreasury: boolean;
  bump: number;
}

export const POOLSTATE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf7, 0xed, 0xe3, 0xf5, 0xd7, 0xc3, 0xde, 0x46]);

export const WIRE_POOLSTATE_FIELDS: WireFieldMap = {
  "pool_type": "poolType",
  "token_a_mint": "tokenAMint",
  "token_b_mint": "tokenBMint",
  "vault_a": "vaultA",
  "vault_b": "vaultB",
  "reserve_a": "reserveA",
  "reserve_b": "reserveB",
  "total_lp_shares": "totalLpShares",
  "fee_bps": "feeBps",
  "is_active": "isActive",
  "total_fees_accumulated": "totalFeesAccumulated",
  "bin_step_bps": "binStepBps",
  "active_bin_id": "activeBinId",
  "ot_treasury_fee_destination": "otTreasuryFeeDestination",
  "has_ot_treasury": "hasOtTreasury",
  "bump": "bump",
};

const IDL_POOLSTATE_FIELDS: IdlField[] = [
  {
    "name": "pool_type",
    "type": "u8"
  },
  {
    "name": "token_a_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "token_b_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "vault_a",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "vault_b",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "reserve_a",
    "type": "u64"
  },
  {
    "name": "reserve_b",
    "type": "u64"
  },
  {
    "name": "total_lp_shares",
    "type": "u128"
  },
  {
    "name": "fee_bps",
    "type": "u16"
  },
  {
    "name": "is_active",
    "type": "bool"
  },
  {
    "name": "total_fees_accumulated",
    "type": "u64"
  },
  {
    "name": "bin_step_bps",
    "type": "u16"
  },
  {
    "name": "active_bin_id",
    "type": "i32"
  },
  {
    "name": "ot_treasury_fee_destination",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "has_ot_treasury",
    "type": "bool"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a PoolState account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parsePoolState(data: Buffer | Uint8Array): PoolState {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, POOLSTATE_DISCRIMINATOR, "PoolState");
  const raw = deserializeAccount(IDL_POOLSTATE_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_POOLSTATE_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as PoolState;
}

// ============================================================
// Account: PoolCreators
// ============================================================

export interface PoolCreators {
  authority: PublicKey;
  creators: Bytes32[];
  activeCount: number;
  bump: number;
}

export const POOLCREATORS_DISCRIMINATOR: Uint8Array = new Uint8Array([0x61, 0xdf, 0x17, 0x09, 0x0d, 0x8a, 0x75, 0x88]);

export const WIRE_POOLCREATORS_FIELDS: WireFieldMap = {
  "authority": "authority",
  "creators": "creators",
  "active_count": "activeCount",
  "bump": "bump",
};

const IDL_POOLCREATORS_FIELDS: IdlField[] = [
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
    "name": "creators",
    "type": {
      "array": [
        {
          "array": [
            "u8",
            32
          ]
        },
        10
      ]
    }
  },
  {
    "name": "active_count",
    "type": "u8"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a PoolCreators account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parsePoolCreators(data: Buffer | Uint8Array): PoolCreators {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, POOLCREATORS_DISCRIMINATOR, "PoolCreators");
  const raw = deserializeAccount(IDL_POOLCREATORS_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_POOLCREATORS_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as PoolCreators;
}

// ============================================================
// Account: LpPosition
// ============================================================

export interface LpPosition {
  pool: PublicKey;
  owner: PublicKey;
  shares: bigint;
  lastUpdateTs: bigint;
  bump: number;
}

export const LPPOSITION_DISCRIMINATOR: Uint8Array = new Uint8Array([0x69, 0xf1, 0x25, 0xc8, 0xe0, 0x02, 0xfc, 0x5a]);

export const WIRE_LPPOSITION_FIELDS: WireFieldMap = {
  "pool": "pool",
  "owner": "owner",
  "shares": "shares",
  "last_update_ts": "lastUpdateTs",
  "bump": "bump",
};

const IDL_LPPOSITION_FIELDS: IdlField[] = [
  {
    "name": "pool",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "owner",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "shares",
    "type": "u128"
  },
  {
    "name": "last_update_ts",
    "type": "i64"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a LpPosition account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseLpPosition(data: Buffer | Uint8Array): LpPosition {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, LPPOSITION_DISCRIMINATOR, "LpPosition");
  const raw = deserializeAccount(IDL_LPPOSITION_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_LPPOSITION_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as LpPosition;
}

// ============================================================
// Account: BinArray
// ============================================================

export interface BinArray {
  pool: PublicKey;
  bins: Bin[];
  lowerBinId: number;
  binStepBps: number;
  activeBinId: number;
  bump: number;
}

export const BINARRAY_DISCRIMINATOR: Uint8Array = new Uint8Array([0x5c, 0x8e, 0x5c, 0xdc, 0x05, 0x94, 0x46, 0xb5]);

export const WIRE_BINARRAY_FIELDS: WireFieldMap = {
  "pool": "pool",
  "bins": "bins",
  "lower_bin_id": "lowerBinId",
  "bin_step_bps": "binStepBps",
  "active_bin_id": "activeBinId",
  "bump": "bump",
};

const IDL_BINARRAY_FIELDS: IdlField[] = [
  {
    "name": "pool",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "bins",
    "type": {
      "array": [
        {
          "defined": "Bin"
        },
        70
      ]
    }
  },
  {
    "name": "lower_bin_id",
    "type": "i32"
  },
  {
    "name": "bin_step_bps",
    "type": "u16"
  },
  {
    "name": "active_bin_id",
    "type": "i32"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a BinArray account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseBinArray(data: Buffer | Uint8Array): BinArray {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, BINARRAY_DISCRIMINATOR, "BinArray");
  const raw = deserializeAccount(IDL_BINARRAY_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_BINARRAY_FIELDS, {
    nestedMaps: {},
    arrayMaps: {
  "bins": WIRE_BIN_FIELDS,
},
  }) as unknown as BinArray;
}
