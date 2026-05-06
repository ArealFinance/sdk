// AUTO-GENERATED — DO NOT EDIT
// IDL: ownership_token v0.1.0
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

/** Defined struct from IDL: RevenueDestination */
export interface RevenueDestination {
  address: PublicKey;
  allocationBps: number;
  label: Bytes32;
}

export const WIRE_REVENUEDESTINATION_FIELDS: WireFieldMap = {
  "address": "address",
  "allocation_bps": "allocationBps",
  "label": "label",
};

/** Raw IDL field shape for RevenueDestination — used by the runtime serializer. */
export const IDL_REVENUEDESTINATION_FIELDS: IdlField[] = [
  {
    "name": "address",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "allocation_bps",
    "type": "u16"
  },
  {
    "name": "label",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

/** Type registry shared across all account parsers in this module. */
const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([{"name":"RevenueDestination","type":{"kind":"struct","fields":[{"name":"address","type":{"array":["u8",32]}},{"name":"allocation_bps","type":"u16"},{"name":"label","type":{"array":["u8",32]}}]}},{"name":"BatchDestination","type":{"kind":"struct","fields":[{"name":"address","type":{"array":["u8",32]}},{"name":"allocation_bps","type":"u16"},{"name":"label","type":{"array":["u8",32]}}]}}] as any, [{"name":"OtConfig","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"name","type":{"array":["u8",32]}},{"name":"symbol","type":{"array":["u8",10]}},{"name":"decimals","type":"u8"},{"name":"total_minted","type":"u64"},{"name":"uri","type":{"array":["u8",200]}},{"name":"bump","type":"u8"}]}},{"name":"RevenueAccount","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"total_distributed","type":"u64"},{"name":"distribution_count","type":"u64"},{"name":"last_distribution_ts","type":"i64"},{"name":"min_distribution_amount","type":"u64"},{"name":"is_distributing","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"RevenueConfig","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"destinations","type":{"array":[{"defined":"RevenueDestination"},10]}},{"name":"active_count","type":"u8"},{"name":"config_version","type":"u64"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"OtGovernance","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"OtTreasury","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}}] as any);

// ============================================================
// Account: OtConfig
// ============================================================

export interface OtConfig {
  otMint: PublicKey;
  name: Bytes32;
  symbol_: Uint8Array;
  decimals: number;
  totalMinted: bigint;
  uri: Uint8Array;
  bump: number;
}

export const OTCONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0x5c, 0xa7, 0x59, 0x3e, 0xd6, 0xb5, 0x0e, 0xdd]);

export const WIRE_OTCONFIG_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "name": "name",
  "symbol": "symbol_",
  "decimals": "decimals",
  "total_minted": "totalMinted",
  "uri": "uri",
  "bump": "bump",
};

const IDL_OTCONFIG_FIELDS: IdlField[] = [
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
    "name": "name",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "symbol",
    "type": {
      "array": [
        "u8",
        10
      ]
    }
  },
  {
    "name": "decimals",
    "type": "u8"
  },
  {
    "name": "total_minted",
    "type": "u64"
  },
  {
    "name": "uri",
    "type": {
      "array": [
        "u8",
        200
      ]
    }
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a OtConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseOtConfig(data: Buffer | Uint8Array): OtConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, OTCONFIG_DISCRIMINATOR, "OtConfig");
  const raw = deserializeAccount(IDL_OTCONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_OTCONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as OtConfig;
}

// ============================================================
// Account: RevenueAccount
// ============================================================

export interface RevenueAccount {
  otMint: PublicKey;
  totalDistributed: bigint;
  distributionCount: bigint;
  lastDistributionTs: bigint;
  minDistributionAmount: bigint;
  isDistributing: boolean;
  bump: number;
}

export const REVENUEACCOUNT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x8d, 0x9b, 0x0a, 0x01, 0x18, 0xdb, 0x3d, 0xcf]);

export const WIRE_REVENUEACCOUNT_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "total_distributed": "totalDistributed",
  "distribution_count": "distributionCount",
  "last_distribution_ts": "lastDistributionTs",
  "min_distribution_amount": "minDistributionAmount",
  "is_distributing": "isDistributing",
  "bump": "bump",
};

const IDL_REVENUEACCOUNT_FIELDS: IdlField[] = [
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
    "name": "total_distributed",
    "type": "u64"
  },
  {
    "name": "distribution_count",
    "type": "u64"
  },
  {
    "name": "last_distribution_ts",
    "type": "i64"
  },
  {
    "name": "min_distribution_amount",
    "type": "u64"
  },
  {
    "name": "is_distributing",
    "type": "bool"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a RevenueAccount account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseRevenueAccount(data: Buffer | Uint8Array): RevenueAccount {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, REVENUEACCOUNT_DISCRIMINATOR, "RevenueAccount");
  const raw = deserializeAccount(IDL_REVENUEACCOUNT_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_REVENUEACCOUNT_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as RevenueAccount;
}

// ============================================================
// Account: RevenueConfig
// ============================================================

export interface RevenueConfig {
  otMint: PublicKey;
  destinations: RevenueDestination[];
  activeCount: number;
  configVersion: bigint;
  arealFeeDestination: PublicKey;
  bump: number;
}

export const REVENUECONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0x07, 0x1b, 0xd8, 0x0b, 0x88, 0x32, 0x7d, 0x39]);

export const WIRE_REVENUECONFIG_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "destinations": "destinations",
  "active_count": "activeCount",
  "config_version": "configVersion",
  "areal_fee_destination": "arealFeeDestination",
  "bump": "bump",
};

const IDL_REVENUECONFIG_FIELDS: IdlField[] = [
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
    "name": "destinations",
    "type": {
      "array": [
        {
          "defined": "RevenueDestination"
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
    "name": "config_version",
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
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a RevenueConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseRevenueConfig(data: Buffer | Uint8Array): RevenueConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, REVENUECONFIG_DISCRIMINATOR, "RevenueConfig");
  const raw = deserializeAccount(IDL_REVENUECONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_REVENUECONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {
  "destinations": WIRE_REVENUEDESTINATION_FIELDS,
},
  }) as unknown as RevenueConfig;
}

// ============================================================
// Account: OtGovernance
// ============================================================

export interface OtGovernance {
  otMint: PublicKey;
  authority: PublicKey;
  pendingAuthority: PublicKey;
  hasPending: boolean;
  isActive: boolean;
  bump: number;
}

export const OTGOVERNANCE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xe0, 0x64, 0xe5, 0xd3, 0x15, 0xd8, 0xea, 0x34]);

export const WIRE_OTGOVERNANCE_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "authority": "authority",
  "pending_authority": "pendingAuthority",
  "has_pending": "hasPending",
  "is_active": "isActive",
  "bump": "bump",
};

const IDL_OTGOVERNANCE_FIELDS: IdlField[] = [
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
    "name": "is_active",
    "type": "bool"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a OtGovernance account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseOtGovernance(data: Buffer | Uint8Array): OtGovernance {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, OTGOVERNANCE_DISCRIMINATOR, "OtGovernance");
  const raw = deserializeAccount(IDL_OTGOVERNANCE_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_OTGOVERNANCE_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as OtGovernance;
}

// ============================================================
// Account: OtTreasury
// ============================================================

export interface OtTreasury {
  otMint: PublicKey;
  bump: number;
}

export const OTTREASURY_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf5, 0x91, 0x02, 0x32, 0x6b, 0x87, 0x9a, 0x3d]);

export const WIRE_OTTREASURY_FIELDS: WireFieldMap = {
  "ot_mint": "otMint",
  "bump": "bump",
};

const IDL_OTTREASURY_FIELDS: IdlField[] = [
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
 * Parse a OtTreasury account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseOtTreasury(data: Buffer | Uint8Array): OtTreasury {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, OTTREASURY_DISCRIMINATOR, "OtTreasury");
  const raw = deserializeAccount(IDL_OTTREASURY_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_OTTREASURY_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  }) as unknown as OtTreasury;
}
