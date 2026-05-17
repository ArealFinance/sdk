// AUTO-GENERATED — DO NOT EDIT
// IDL: native-dex v0.1.0
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
  ARRAY_MAPS_BIN,
  Bin,
  IDL_BIN_FIELDS,
  NESTED_MAPS_BIN,
  PUBKEY_BIN_FIELDS,
  TYPE_REGISTRY,
  WIRE_BIN_FIELDS,
} from './defined-types.generated.js';

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

/** Pubkey-classified [u8;32] fields for DexConfig (heuristic + overrides). */
export const PUBKEY_DEXCONFIG_FIELDS = [
  "authority",
  "pendingAuthority",
  "pauseAuthority",
  "arealFeeDestination",
  "rebalancer",
] as const;

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
    pubkeyFields: PUBKEY_DEXCONFIG_FIELDS,
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
  cumulativeFeesPerShareA: bigint;
  cumulativeFeesPerShareB: bigint;
  leftAnchorBin: number;
  permanentTailFloorBin: number;
  lastRebalanceNavBin: number;
  activeZoneLower: number;
  permanentTailOffsetBps: number;
  _padMonotonic: Uint8Array;
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
  "cumulative_fees_per_share_a": "cumulativeFeesPerShareA",
  "cumulative_fees_per_share_b": "cumulativeFeesPerShareB",
  "left_anchor_bin": "leftAnchorBin",
  "permanent_tail_floor_bin": "permanentTailFloorBin",
  "last_rebalance_nav_bin": "lastRebalanceNavBin",
  "active_zone_lower": "activeZoneLower",
  "permanent_tail_offset_bps": "permanentTailOffsetBps",
  "_pad_monotonic": "_padMonotonic",
};

/** Pubkey-classified [u8;32] fields for PoolState (heuristic + overrides). */
export const PUBKEY_POOLSTATE_FIELDS = [
  "tokenAMint",
  "tokenBMint",
  "vaultA",
  "vaultB",
  "otTreasuryFeeDestination",
] as const;

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
  },
  {
    "name": "cumulative_fees_per_share_a",
    "type": "u128"
  },
  {
    "name": "cumulative_fees_per_share_b",
    "type": "u128"
  },
  {
    "name": "left_anchor_bin",
    "type": "i32"
  },
  {
    "name": "permanent_tail_floor_bin",
    "type": "i32"
  },
  {
    "name": "last_rebalance_nav_bin",
    "type": "i32"
  },
  {
    "name": "active_zone_lower",
    "type": "i32"
  },
  {
    "name": "permanent_tail_offset_bps",
    "type": "u16"
  },
  {
    "name": "_pad_monotonic",
    "type": {
      "array": [
        "u8",
        2
      ]
    }
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
    pubkeyFields: PUBKEY_POOLSTATE_FIELDS,
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

/** Pubkey-classified [u8;32] fields for PoolCreators (heuristic + overrides). */
export const PUBKEY_POOLCREATORS_FIELDS = [
  "authority",
] as const;

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
    pubkeyFields: PUBKEY_POOLCREATORS_FIELDS,
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
  feesClaimedPerShareA: bigint;
  feesClaimedPerShareB: bigint;
}

export const LPPOSITION_DISCRIMINATOR: Uint8Array = new Uint8Array([0x69, 0xf1, 0x25, 0xc8, 0xe0, 0x02, 0xfc, 0x5a]);

export const WIRE_LPPOSITION_FIELDS: WireFieldMap = {
  "pool": "pool",
  "owner": "owner",
  "shares": "shares",
  "last_update_ts": "lastUpdateTs",
  "bump": "bump",
  "fees_claimed_per_share_a": "feesClaimedPerShareA",
  "fees_claimed_per_share_b": "feesClaimedPerShareB",
};

/** Pubkey-classified [u8;32] fields for LpPosition (heuristic + overrides). */
export const PUBKEY_LPPOSITION_FIELDS = [
  "pool",
  "owner",
] as const;

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
  },
  {
    "name": "fees_claimed_per_share_a",
    "type": "u128"
  },
  {
    "name": "fees_claimed_per_share_b",
    "type": "u128"
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
    pubkeyFields: PUBKEY_LPPOSITION_FIELDS,
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

/** Pubkey-classified [u8;32] fields for BinArray (heuristic + overrides). */
export const PUBKEY_BINARRAY_FIELDS = [
  "pool",
] as const;

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
        1000
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
  "bins": { map: WIRE_BIN_FIELDS, pubkeyFields: PUBKEY_BIN_FIELDS, nestedMaps: NESTED_MAPS_BIN, arrayMaps: ARRAY_MAPS_BIN },
},
    pubkeyFields: PUBKEY_BINARRAY_FIELDS,
  }) as unknown as BinArray;
}

// ============================================================
// Account: LiquidityNexus
// ============================================================

export interface LiquidityNexus {
  manager: PublicKey;
  totalDepositedUsdc: bigint;
  totalDepositedRwt: bigint;
  isActive: boolean;
  bump: number;
}

export const LIQUIDITYNEXUS_DISCRIMINATOR: Uint8Array = new Uint8Array([0x24, 0x37, 0xa8, 0xc2, 0xb0, 0x0b, 0xa3, 0x60]);

export const WIRE_LIQUIDITYNEXUS_FIELDS: WireFieldMap = {
  "manager": "manager",
  "total_deposited_usdc": "totalDepositedUsdc",
  "total_deposited_rwt": "totalDepositedRwt",
  "is_active": "isActive",
  "bump": "bump",
};

/** Pubkey-classified [u8;32] fields for LiquidityNexus (heuristic + overrides). */
export const PUBKEY_LIQUIDITYNEXUS_FIELDS = [
  "manager",
] as const;

const IDL_LIQUIDITYNEXUS_FIELDS: IdlField[] = [
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
    "name": "total_deposited_usdc",
    "type": "u64"
  },
  {
    "name": "total_deposited_rwt",
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
 * Parse a LiquidityNexus account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseLiquidityNexus(data: Buffer | Uint8Array): LiquidityNexus {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, LIQUIDITYNEXUS_DISCRIMINATOR, "LiquidityNexus");
  const raw = deserializeAccount(IDL_LIQUIDITYNEXUS_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_LIQUIDITYNEXUS_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
    pubkeyFields: PUBKEY_LIQUIDITYNEXUS_FIELDS,
  }) as unknown as LiquidityNexus;
}
