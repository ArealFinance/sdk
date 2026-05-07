// AUTO-GENERATED — DO NOT EDIT
// IDL: ownership-token v0.1.0
// Generator: @arlex/client codegen v1

import {
  PublicKey,
  type Bytes32,
  type WireFieldMap,
  type IdlField,
  type TypeRegistry,
  buildTypeRegistry,
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

/** Pubkey-classified [u8;32] fields for RevenueDestination (heuristic + overrides). */
export const PUBKEY_REVENUEDESTINATION_FIELDS = [
  "address",
] as const;

/** Nested defined-struct remap targets for RevenueDestination (single, non-array). */
export const NESTED_MAPS_REVENUEDESTINATION = {} as const;

/** Nested defined-struct remap targets for RevenueDestination (vec/array of struct). */
export const ARRAY_MAPS_REVENUEDESTINATION = {} as const;

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

/** Defined struct from IDL: BatchDestination */
export interface BatchDestination {
  address: PublicKey;
  allocationBps: number;
  label: Bytes32;
}

export const WIRE_BATCHDESTINATION_FIELDS: WireFieldMap = {
  "address": "address",
  "allocation_bps": "allocationBps",
  "label": "label",
};

/** Pubkey-classified [u8;32] fields for BatchDestination (heuristic + overrides). */
export const PUBKEY_BATCHDESTINATION_FIELDS = [
  "address",
] as const;

/** Nested defined-struct remap targets for BatchDestination (single, non-array). */
export const NESTED_MAPS_BATCHDESTINATION = {} as const;

/** Nested defined-struct remap targets for BatchDestination (vec/array of struct). */
export const ARRAY_MAPS_BATCHDESTINATION = {} as const;

/** Raw IDL field shape for BatchDestination — used by the runtime serializer. */
export const IDL_BATCHDESTINATION_FIELDS: IdlField[] = [
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

/** Type registry shared across all parsers and encoders in this program. */
export const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([{"name":"RevenueDestination","type":{"kind":"struct","fields":[{"name":"address","type":{"array":["u8",32]}},{"name":"allocation_bps","type":"u16"},{"name":"label","type":{"array":["u8",32]}}]}},{"name":"BatchDestination","type":{"kind":"struct","fields":[{"name":"address","type":{"array":["u8",32]}},{"name":"allocation_bps","type":"u16"},{"name":"label","type":{"array":["u8",32]}}]}}] as any, [{"name":"OtConfig","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"name","type":{"array":["u8",32]}},{"name":"symbol","type":{"array":["u8",10]}},{"name":"decimals","type":"u8"},{"name":"total_minted","type":"u64"},{"name":"uri","type":{"array":["u8",200]}},{"name":"bump","type":"u8"}]}},{"name":"RevenueAccount","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"revenue_token_account","type":{"array":["u8",32]}},{"name":"total_distributed","type":"u64"},{"name":"distribution_count","type":"u64"},{"name":"last_distribution_ts","type":"i64"},{"name":"min_distribution_amount","type":"u64"},{"name":"is_distributing","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"RevenueConfig","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"destinations","type":{"array":[{"defined":"RevenueDestination"},10]}},{"name":"active_count","type":"u8"},{"name":"config_version","type":"u64"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"OtGovernance","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"OtTreasury","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}}] as any);
