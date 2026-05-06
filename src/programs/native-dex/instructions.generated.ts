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
  serializeArgs,
  instructionDiscriminator,
  remapTsToWire,
} from '@arlex/client/codegen-runtime';

/** Type registry shared across all instruction encoders in this module. */
const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([{"name":"Bin","type":{"kind":"struct","fields":[{"name":"liquidity_a","type":"u64"},{"name":"liquidity_b","type":"u64"}]}}] as any, [{"name":"DexConfig","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"pause_authority","type":{"array":["u8",32]}},{"name":"base_fee_bps","type":"u16"},{"name":"lp_fee_share_bps","type":"u16"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"rebalancer","type":{"array":["u8",32]}},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"PoolState","type":{"kind":"struct","fields":[{"name":"pool_type","type":"u8"},{"name":"token_a_mint","type":{"array":["u8",32]}},{"name":"token_b_mint","type":{"array":["u8",32]}},{"name":"vault_a","type":{"array":["u8",32]}},{"name":"vault_b","type":{"array":["u8",32]}},{"name":"reserve_a","type":"u64"},{"name":"reserve_b","type":"u64"},{"name":"total_lp_shares","type":"u128"},{"name":"fee_bps","type":"u16"},{"name":"is_active","type":"bool"},{"name":"total_fees_accumulated","type":"u64"},{"name":"bin_step_bps","type":"u16"},{"name":"active_bin_id","type":"i32"},{"name":"ot_treasury_fee_destination","type":{"array":["u8",32]}},{"name":"has_ot_treasury","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"PoolCreators","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"creators","type":{"array":[{"array":["u8",32]},10]}},{"name":"active_count","type":"u8"},{"name":"bump","type":"u8"}]}},{"name":"LpPosition","type":{"kind":"struct","fields":[{"name":"pool","type":{"array":["u8",32]}},{"name":"owner","type":{"array":["u8",32]}},{"name":"shares","type":"u128"},{"name":"last_update_ts","type":"i64"},{"name":"bump","type":"u8"}]}},{"name":"BinArray","type":{"kind":"struct","fields":[{"name":"pool","type":{"array":["u8",32]}},{"name":"bins","type":{"array":[{"defined":"Bin"},70]}},{"name":"lower_bin_id","type":"i32"},{"name":"bin_step_bps","type":"u16"},{"name":"active_bin_id","type":"i32"},{"name":"bump","type":"u8"}]}}] as any);

// ============================================================
// Instruction: initialize_dex
// ============================================================

export const INITIALIZE_DEX_DISCRIMINATOR: Uint8Array = new Uint8Array([0x22, 0x77, 0x0d, 0xd1, 0x32, 0xa5, 0xfb, 0xb3]);

export interface InitializeDexAccounts {
  /** signer, writable */
  deployer: PublicKey;
  /** readonly, writable */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolCreators: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface InitializeDexArgs {
  arealFeeDestination: PublicKey;
  pauseAuthority: PublicKey;
  rebalancer: Bytes32;
}

const IDL_INITIALIZE_DEX_ARG_FIELDS: IdlField[] = [
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
    "name": "pause_authority",
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
  }
];

export const WIRE_INITIALIZE_DEX_ARG_FIELDS: WireFieldMap = {
  "areal_fee_destination": "arealFeeDestination",
  "pause_authority": "pauseAuthority",
  "rebalancer": "rebalancer",
};

/**
 * Encode arguments for the `initialize_dex` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeInitializeDexArgs(args: InitializeDexArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_INITIALIZE_DEX_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_INITIALIZE_DEX_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(INITIALIZE_DEX_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: create_pool
// ============================================================

export const CREATE_POOL_DISCRIMINATOR: Uint8Array = new Uint8Array([0xe9, 0x92, 0xd1, 0x8e, 0xcf, 0x68, 0x40, 0xbc]);

export interface CreatePoolAccounts {
  /** signer, writable */
  creator: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly */
  poolCreators: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly */
  tokenAMint: PublicKey;
  /** readonly */
  tokenBMint: PublicKey;
  /** signer, writable */
  vaultA: PublicKey;
  /** signer, writable */
  vaultB: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

/** Encode (no args) for the `create_pool` instruction — discriminator only. */
export function encodeCreatePoolArgs(): Buffer {
  return Buffer.from(CREATE_POOL_DISCRIMINATOR);
}

// ============================================================
// Instruction: add_liquidity
// ============================================================

export const ADD_LIQUIDITY_DISCRIMINATOR: Uint8Array = new Uint8Array([0xb5, 0x9d, 0x59, 0x43, 0x8f, 0xb6, 0x34, 0x48]);

export interface AddLiquidityAccounts {
  /** signer */
  provider: PublicKey;
  /** signer, writable */
  payer: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  lpPosition: PublicKey;
  /** readonly, writable */
  providerTokenA: PublicKey;
  /** readonly, writable */
  providerTokenB: PublicKey;
  /** readonly, writable */
  vaultA: PublicKey;
  /** readonly, writable */
  vaultB: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface AddLiquidityArgs {
  amountA: bigint;
  amountB: bigint;
  minShares: bigint;
}

const IDL_ADD_LIQUIDITY_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount_a",
    "type": "u64"
  },
  {
    "name": "amount_b",
    "type": "u64"
  },
  {
    "name": "min_shares",
    "type": "u128"
  }
];

export const WIRE_ADD_LIQUIDITY_ARG_FIELDS: WireFieldMap = {
  "amount_a": "amountA",
  "amount_b": "amountB",
  "min_shares": "minShares",
};

/**
 * Encode arguments for the `add_liquidity` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeAddLiquidityArgs(args: AddLiquidityArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_ADD_LIQUIDITY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_ADD_LIQUIDITY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(ADD_LIQUIDITY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: zap_liquidity
// ============================================================

export const ZAP_LIQUIDITY_DISCRIMINATOR: Uint8Array = new Uint8Array([0x50, 0xc4, 0xc3, 0x1d, 0x15, 0x41, 0xdc, 0x59]);

export interface ZapLiquidityAccounts {
  /** signer */
  provider: PublicKey;
  /** signer, writable */
  payer: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  lpPosition: PublicKey;
  /** readonly, writable */
  providerTokenA: PublicKey;
  /** readonly, writable */
  providerTokenB: PublicKey;
  /** readonly, writable */
  vaultA: PublicKey;
  /** readonly, writable */
  vaultB: PublicKey;
  /** readonly, writable */
  arealFeeAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface ZapLiquidityArgs {
  amountA: bigint;
  amountB: bigint;
  minShares: bigint;
}

const IDL_ZAP_LIQUIDITY_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount_a",
    "type": "u64"
  },
  {
    "name": "amount_b",
    "type": "u64"
  },
  {
    "name": "min_shares",
    "type": "u128"
  }
];

export const WIRE_ZAP_LIQUIDITY_ARG_FIELDS: WireFieldMap = {
  "amount_a": "amountA",
  "amount_b": "amountB",
  "min_shares": "minShares",
};

/**
 * Encode arguments for the `zap_liquidity` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeZapLiquidityArgs(args: ZapLiquidityArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_ZAP_LIQUIDITY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_ZAP_LIQUIDITY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(ZAP_LIQUIDITY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: remove_liquidity
// ============================================================

export const REMOVE_LIQUIDITY_DISCRIMINATOR: Uint8Array = new Uint8Array([0x50, 0x55, 0xd1, 0x48, 0x18, 0xce, 0xb1, 0x6c]);

export interface RemoveLiquidityAccounts {
  /** signer, writable */
  provider: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  lpPosition: PublicKey;
  /** readonly, writable */
  providerTokenA: PublicKey;
  /** readonly, writable */
  providerTokenB: PublicKey;
  /** readonly, writable */
  vaultA: PublicKey;
  /** readonly, writable */
  vaultB: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface RemoveLiquidityArgs {
  sharesToBurn: bigint;
}

const IDL_REMOVE_LIQUIDITY_ARG_FIELDS: IdlField[] = [
  {
    "name": "shares_to_burn",
    "type": "u128"
  }
];

export const WIRE_REMOVE_LIQUIDITY_ARG_FIELDS: WireFieldMap = {
  "shares_to_burn": "sharesToBurn",
};

/**
 * Encode arguments for the `remove_liquidity` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeRemoveLiquidityArgs(args: RemoveLiquidityArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_REMOVE_LIQUIDITY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_REMOVE_LIQUIDITY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(REMOVE_LIQUIDITY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: swap
// ============================================================

export const SWAP_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf8, 0xc6, 0x9e, 0x91, 0xe1, 0x75, 0x87, 0xc8]);

export interface SwapAccounts {
  /** signer */
  user: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  userTokenIn: PublicKey;
  /** readonly, writable */
  userTokenOut: PublicKey;
  /** readonly, writable */
  vaultIn: PublicKey;
  /** readonly, writable */
  vaultOut: PublicKey;
  /** readonly, writable */
  arealFeeAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface SwapArgs {
  amountIn: bigint;
  minAmountOut: bigint;
  aToB: boolean;
}

const IDL_SWAP_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount_in",
    "type": "u64"
  },
  {
    "name": "min_amount_out",
    "type": "u64"
  },
  {
    "name": "a_to_b",
    "type": "bool"
  }
];

export const WIRE_SWAP_ARG_FIELDS: WireFieldMap = {
  "amount_in": "amountIn",
  "min_amount_out": "minAmountOut",
  "a_to_b": "aToB",
};

/**
 * Encode arguments for the `swap` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeSwapArgs(args: SwapArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_SWAP_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_SWAP_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(SWAP_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: update_dex_config
// ============================================================

export const UPDATE_DEX_CONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0xb3, 0x3b, 0x79, 0xc1, 0xf3, 0x6b, 0xca, 0xba]);

export interface UpdateDexConfigAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly, writable */
  dexConfig: PublicKey;
}

export interface UpdateDexConfigArgs {
  baseFeeBps: number;
  lpFeeShareBps: number;
  rebalancer: Bytes32;
  isActive: boolean;
}

const IDL_UPDATE_DEX_CONFIG_ARG_FIELDS: IdlField[] = [
  {
    "name": "base_fee_bps",
    "type": "u16"
  },
  {
    "name": "lp_fee_share_bps",
    "type": "u16"
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
  }
];

export const WIRE_UPDATE_DEX_CONFIG_ARG_FIELDS: WireFieldMap = {
  "base_fee_bps": "baseFeeBps",
  "lp_fee_share_bps": "lpFeeShareBps",
  "rebalancer": "rebalancer",
  "is_active": "isActive",
};

/**
 * Encode arguments for the `update_dex_config` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeUpdateDexConfigArgs(args: UpdateDexConfigArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_UPDATE_DEX_CONFIG_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_UPDATE_DEX_CONFIG_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(UPDATE_DEX_CONFIG_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: update_pool_creators
// ============================================================

export const UPDATE_POOL_CREATORS_DISCRIMINATOR: Uint8Array = new Uint8Array([0x12, 0x38, 0x5a, 0x74, 0x31, 0x37, 0xa2, 0xdd]);

export interface UpdatePoolCreatorsAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolCreators: PublicKey;
}

export interface UpdatePoolCreatorsArgs {
  wallet: Bytes32;
  action: number;
}

const IDL_UPDATE_POOL_CREATORS_ARG_FIELDS: IdlField[] = [
  {
    "name": "wallet",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "action",
    "type": "u8"
  }
];

export const WIRE_UPDATE_POOL_CREATORS_ARG_FIELDS: WireFieldMap = {
  "wallet": "wallet",
  "action": "action",
};

/**
 * Encode arguments for the `update_pool_creators` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeUpdatePoolCreatorsArgs(args: UpdatePoolCreatorsArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_UPDATE_POOL_CREATORS_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_UPDATE_POOL_CREATORS_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(UPDATE_POOL_CREATORS_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: pause_pool
// ============================================================

export const PAUSE_POOL_DISCRIMINATOR: Uint8Array = new Uint8Array([0xa0, 0x0f, 0x0c, 0xbd, 0xa0, 0x00, 0xf3, 0xf5]);

export interface PausePoolAccounts {
  /** signer */
  pauseAuthority: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
}

/** Encode (no args) for the `pause_pool` instruction — discriminator only. */
export function encodePausePoolArgs(): Buffer {
  return Buffer.from(PAUSE_POOL_DISCRIMINATOR);
}

// ============================================================
// Instruction: unpause_pool
// ============================================================

export const UNPAUSE_POOL_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf1, 0x94, 0x81, 0xf3, 0xde, 0x7d, 0x7d, 0xa0]);

export interface UnpausePoolAccounts {
  /** signer */
  pauseAuthority: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
}

/** Encode (no args) for the `unpause_pool` instruction — discriminator only. */
export function encodeUnpausePoolArgs(): Buffer {
  return Buffer.from(UNPAUSE_POOL_DISCRIMINATOR);
}

// ============================================================
// Instruction: propose_authority_transfer
// ============================================================

export const PROPOSE_AUTHORITY_TRANSFER_DISCRIMINATOR: Uint8Array = new Uint8Array([0x39, 0xce, 0xe1, 0x81, 0x23, 0x6f, 0xae, 0x91]);

export interface ProposeAuthorityTransferAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly, writable */
  dexConfig: PublicKey;
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
  dexConfig: PublicKey;
  /** readonly, writable */
  poolCreators: PublicKey;
}

/** Encode (no args) for the `accept_authority_transfer` instruction — discriminator only. */
export function encodeAcceptAuthorityTransferArgs(): Buffer {
  return Buffer.from(ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR);
}

// ============================================================
// Instruction: create_concentrated_pool
// ============================================================

export const CREATE_CONCENTRATED_POOL_DISCRIMINATOR: Uint8Array = new Uint8Array([0x43, 0x11, 0x9a, 0xdf, 0xd1, 0xc3, 0xd6, 0xe2]);

export interface CreateConcentratedPoolAccounts {
  /** signer, writable */
  creator: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly */
  poolCreators: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  binArray: PublicKey;
  /** readonly */
  tokenAMint: PublicKey;
  /** readonly */
  tokenBMint: PublicKey;
  /** signer, writable */
  vaultA: PublicKey;
  /** signer, writable */
  vaultB: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface CreateConcentratedPoolArgs {
  binStepBps: number;
  initialActiveBin: number;
}

const IDL_CREATE_CONCENTRATED_POOL_ARG_FIELDS: IdlField[] = [
  {
    "name": "bin_step_bps",
    "type": "u16"
  },
  {
    "name": "initial_active_bin",
    "type": "i32"
  }
];

export const WIRE_CREATE_CONCENTRATED_POOL_ARG_FIELDS: WireFieldMap = {
  "bin_step_bps": "binStepBps",
  "initial_active_bin": "initialActiveBin",
};

/**
 * Encode arguments for the `create_concentrated_pool` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeCreateConcentratedPoolArgs(args: CreateConcentratedPoolArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_CREATE_CONCENTRATED_POOL_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_CREATE_CONCENTRATED_POOL_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(CREATE_CONCENTRATED_POOL_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: shift_liquidity
// ============================================================

export const SHIFT_LIQUIDITY_DISCRIMINATOR: Uint8Array = new Uint8Array([0x5a, 0x93, 0x3b, 0x6c, 0x08, 0x73, 0xe9, 0x05]);

export interface ShiftLiquidityAccounts {
  /** signer */
  rebalancer: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  binArray: PublicKey;
}

export interface ShiftLiquidityArgs {
  navBin: number;
  targetBinCount: number;
}

const IDL_SHIFT_LIQUIDITY_ARG_FIELDS: IdlField[] = [
  {
    "name": "nav_bin",
    "type": "i32"
  },
  {
    "name": "target_bin_count",
    "type": "u16"
  }
];

export const WIRE_SHIFT_LIQUIDITY_ARG_FIELDS: WireFieldMap = {
  "nav_bin": "navBin",
  "target_bin_count": "targetBinCount",
};

/**
 * Encode arguments for the `shift_liquidity` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeShiftLiquidityArgs(args: ShiftLiquidityArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_SHIFT_LIQUIDITY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_SHIFT_LIQUIDITY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(SHIFT_LIQUIDITY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: initialize_nexus
// ============================================================

export const INITIALIZE_NEXUS_DISCRIMINATOR: Uint8Array = new Uint8Array([0xaa, 0x01, 0xa4, 0x4a, 0xb0, 0x17, 0x74, 0xc8]);

export interface InitializeNexusAccounts {
  /** signer, writable */
  authority: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface InitializeNexusArgs {
  manager: Bytes32;
}

const IDL_INITIALIZE_NEXUS_ARG_FIELDS: IdlField[] = [
  {
    "name": "manager",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_INITIALIZE_NEXUS_ARG_FIELDS: WireFieldMap = {
  "manager": "manager",
};

/**
 * Encode arguments for the `initialize_nexus` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeInitializeNexusArgs(args: InitializeNexusArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_INITIALIZE_NEXUS_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_INITIALIZE_NEXUS_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(INITIALIZE_NEXUS_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: update_nexus_manager
// ============================================================

export const UPDATE_NEXUS_MANAGER_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf8, 0x29, 0xd8, 0xb8, 0xa9, 0x60, 0x97, 0xd0]);

export interface UpdateNexusManagerAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
}

export interface UpdateNexusManagerArgs {
  newManager: Bytes32;
}

const IDL_UPDATE_NEXUS_MANAGER_ARG_FIELDS: IdlField[] = [
  {
    "name": "new_manager",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_UPDATE_NEXUS_MANAGER_ARG_FIELDS: WireFieldMap = {
  "new_manager": "newManager",
};

/**
 * Encode arguments for the `update_nexus_manager` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeUpdateNexusManagerArgs(args: UpdateNexusManagerArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_UPDATE_NEXUS_MANAGER_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_UPDATE_NEXUS_MANAGER_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(UPDATE_NEXUS_MANAGER_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: nexus_swap
// ============================================================

export const NEXUS_SWAP_DISCRIMINATOR: Uint8Array = new Uint8Array([0x38, 0x6b, 0xde, 0xef, 0x19, 0x3b, 0x92, 0x6d]);

export interface NexusSwapAccounts {
  /** signer */
  manager: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  nexusTokenIn: PublicKey;
  /** readonly, writable */
  nexusTokenOut: PublicKey;
  /** readonly, writable */
  vaultIn: PublicKey;
  /** readonly, writable */
  vaultOut: PublicKey;
  /** readonly, writable */
  arealFeeAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface NexusSwapArgs {
  amountIn: bigint;
  minAmountOut: bigint;
  aToB: boolean;
}

const IDL_NEXUS_SWAP_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount_in",
    "type": "u64"
  },
  {
    "name": "min_amount_out",
    "type": "u64"
  },
  {
    "name": "a_to_b",
    "type": "bool"
  }
];

export const WIRE_NEXUS_SWAP_ARG_FIELDS: WireFieldMap = {
  "amount_in": "amountIn",
  "min_amount_out": "minAmountOut",
  "a_to_b": "aToB",
};

/**
 * Encode arguments for the `nexus_swap` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeNexusSwapArgs(args: NexusSwapArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_NEXUS_SWAP_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_NEXUS_SWAP_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(NEXUS_SWAP_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: nexus_add_liquidity
// ============================================================

export const NEXUS_ADD_LIQUIDITY_DISCRIMINATOR: Uint8Array = new Uint8Array([0x43, 0xf5, 0xd2, 0x61, 0x7e, 0x2e, 0xbb, 0xb6]);

export interface NexusAddLiquidityAccounts {
  /** signer, writable */
  manager: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  lpPosition: PublicKey;
  /** readonly, writable */
  nexusTokenA: PublicKey;
  /** readonly, writable */
  nexusTokenB: PublicKey;
  /** readonly, writable */
  vaultA: PublicKey;
  /** readonly, writable */
  vaultB: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface NexusAddLiquidityArgs {
  amountA: bigint;
  amountB: bigint;
  minShares: bigint;
}

const IDL_NEXUS_ADD_LIQUIDITY_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount_a",
    "type": "u64"
  },
  {
    "name": "amount_b",
    "type": "u64"
  },
  {
    "name": "min_shares",
    "type": "u128"
  }
];

export const WIRE_NEXUS_ADD_LIQUIDITY_ARG_FIELDS: WireFieldMap = {
  "amount_a": "amountA",
  "amount_b": "amountB",
  "min_shares": "minShares",
};

/**
 * Encode arguments for the `nexus_add_liquidity` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeNexusAddLiquidityArgs(args: NexusAddLiquidityArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_NEXUS_ADD_LIQUIDITY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_NEXUS_ADD_LIQUIDITY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(NEXUS_ADD_LIQUIDITY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: nexus_remove_liquidity
// ============================================================

export const NEXUS_REMOVE_LIQUIDITY_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf7, 0xd7, 0xb7, 0xae, 0xc3, 0x8e, 0x84, 0x52]);

export interface NexusRemoveLiquidityAccounts {
  /** signer */
  manager: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  lpPosition: PublicKey;
  /** readonly, writable */
  nexusTokenA: PublicKey;
  /** readonly, writable */
  nexusTokenB: PublicKey;
  /** readonly, writable */
  vaultA: PublicKey;
  /** readonly, writable */
  vaultB: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface NexusRemoveLiquidityArgs {
  sharesToBurn: bigint;
}

const IDL_NEXUS_REMOVE_LIQUIDITY_ARG_FIELDS: IdlField[] = [
  {
    "name": "shares_to_burn",
    "type": "u128"
  }
];

export const WIRE_NEXUS_REMOVE_LIQUIDITY_ARG_FIELDS: WireFieldMap = {
  "shares_to_burn": "sharesToBurn",
};

/**
 * Encode arguments for the `nexus_remove_liquidity` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeNexusRemoveLiquidityArgs(args: NexusRemoveLiquidityArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_NEXUS_REMOVE_LIQUIDITY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_NEXUS_REMOVE_LIQUIDITY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(NEXUS_REMOVE_LIQUIDITY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: nexus_deposit
// ============================================================

export const NEXUS_DEPOSIT_DISCRIMINATOR: Uint8Array = new Uint8Array([0xc6, 0xf4, 0x3e, 0x6f, 0xa2, 0x93, 0x33, 0x1c]);

export interface NexusDepositAccounts {
  /** signer, writable */
  depositor: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly, writable */
  depositorTokenAta: PublicKey;
  /** readonly, writable */
  nexusTokenAta: PublicKey;
}

export interface NexusDepositArgs {
  amount: bigint;
  tokenKind: number;
}

const IDL_NEXUS_DEPOSIT_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  },
  {
    "name": "token_kind",
    "type": "u8"
  }
];

export const WIRE_NEXUS_DEPOSIT_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
  "token_kind": "tokenKind",
};

/**
 * Encode arguments for the `nexus_deposit` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeNexusDepositArgs(args: NexusDepositArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_NEXUS_DEPOSIT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_NEXUS_DEPOSIT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(NEXUS_DEPOSIT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: nexus_record_deposit
// ============================================================

export const NEXUS_RECORD_DEPOSIT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x88, 0x20, 0x8d, 0x28, 0x72, 0xf6, 0x1b, 0x97]);

export interface NexusRecordDepositAccounts {
  /** signer */
  liquidityHolding: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
}

export interface NexusRecordDepositArgs {
  amount: bigint;
  tokenKind: number;
}

const IDL_NEXUS_RECORD_DEPOSIT_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  },
  {
    "name": "token_kind",
    "type": "u8"
  }
];

export const WIRE_NEXUS_RECORD_DEPOSIT_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
  "token_kind": "tokenKind",
};

/**
 * Encode arguments for the `nexus_record_deposit` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeNexusRecordDepositArgs(args: NexusRecordDepositArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_NEXUS_RECORD_DEPOSIT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_NEXUS_RECORD_DEPOSIT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(NEXUS_RECORD_DEPOSIT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: nexus_withdraw_profits
// ============================================================

export const NEXUS_WITHDRAW_PROFITS_DISCRIMINATOR: Uint8Array = new Uint8Array([0xe7, 0x2b, 0xaf, 0x91, 0xbc, 0x11, 0xc6, 0xaf]);

export interface NexusWithdrawProfitsAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly, writable */
  nexusTokenAta: PublicKey;
  /** readonly, writable */
  recipientTokenAta: PublicKey;
}

export interface NexusWithdrawProfitsArgs {
  amount: bigint;
  tokenKind: number;
}

const IDL_NEXUS_WITHDRAW_PROFITS_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  },
  {
    "name": "token_kind",
    "type": "u8"
  }
];

export const WIRE_NEXUS_WITHDRAW_PROFITS_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
  "token_kind": "tokenKind",
};

/**
 * Encode arguments for the `nexus_withdraw_profits` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeNexusWithdrawProfitsArgs(args: NexusWithdrawProfitsArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_NEXUS_WITHDRAW_PROFITS_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_NEXUS_WITHDRAW_PROFITS_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(NEXUS_WITHDRAW_PROFITS_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: nexus_claim_rewards
// ============================================================

export const NEXUS_CLAIM_REWARDS_DISCRIMINATOR: Uint8Array = new Uint8Array([0x57, 0x9c, 0x3c, 0xb9, 0xbd, 0x04, 0xe8, 0xaa]);

export interface NexusClaimRewardsAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  lpPosition: PublicKey;
  /** readonly, writable */
  poolVaultA: PublicKey;
  /** readonly, writable */
  poolVaultB: PublicKey;
  /** readonly, writable */
  nexusTokenAAta: PublicKey;
  /** readonly, writable */
  nexusTokenBAta: PublicKey;
}

/** Encode (no args) for the `nexus_claim_rewards` instruction — discriminator only. */
export function encodeNexusClaimRewardsArgs(): Buffer {
  return Buffer.from(NEXUS_CLAIM_REWARDS_DISCRIMINATOR);
}

// ============================================================
// Instruction: claim_lp_fees
// ============================================================

export const CLAIM_LP_FEES_DISCRIMINATOR: Uint8Array = new Uint8Array([0x48, 0x56, 0xd4, 0x8e, 0x3c, 0x26, 0x4a, 0x4b]);

export interface ClaimLpFeesAccounts {
  /** signer */
  recipient: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  lpPosition: PublicKey;
  /** readonly, writable */
  poolVaultA: PublicKey;
  /** readonly, writable */
  poolVaultB: PublicKey;
  /** readonly, writable */
  recipientTokenAAta: PublicKey;
  /** readonly, writable */
  recipientTokenBAta: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

/** Encode (no args) for the `claim_lp_fees` instruction — discriminator only. */
export function encodeClaimLpFeesArgs(): Buffer {
  return Buffer.from(CLAIM_LP_FEES_DISCRIMINATOR);
}
