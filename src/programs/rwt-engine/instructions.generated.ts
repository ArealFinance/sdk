// AUTO-GENERATED — DO NOT EDIT
// IDL: rwt-engine v0.1.0
// Generator: @arlex/client codegen v1

import { Buffer } from 'buffer';

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
const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"RwtVault","type":{"kind":"struct","fields":[{"name":"total_invested_capital","type":"u128"},{"name":"total_rwt_supply","type":"u64"},{"name":"nav_book_value","type":"u64"},{"name":"capital_accumulator_ata","type":{"array":["u8",32]}},{"name":"rwt_mint","type":{"array":["u8",32]}},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"manager","type":{"array":["u8",32]}},{"name":"pause_authority","type":{"array":["u8",32]}},{"name":"mint_paused","type":"bool"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"RwtDistributionConfig","type":{"kind":"struct","fields":[{"name":"book_value_bps","type":"u16"},{"name":"liquidity_bps","type":"u16"},{"name":"protocol_revenue_bps","type":"u16"},{"name":"liquidity_destination","type":{"array":["u8",32]}},{"name":"protocol_revenue_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}}] as any);

// ============================================================
// Instruction: initialize_vault
// ============================================================

export const INITIALIZE_VAULT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x30, 0xbf, 0xa3, 0x2c, 0x47, 0x81, 0x3f, 0xa4]);

export interface InitializeVaultAccounts {
  /** signer, writable */
  deployer: PublicKey;
  /** readonly */
  rwtVault: PublicKey;
  /** readonly */
  distConfig: PublicKey;
  /** signer, writable */
  rwtMint: PublicKey;
  /** readonly */
  usdcMint: PublicKey;
  /** readonly, writable */
  capitalAccumulatorAta: PublicKey;
  /** readonly */
  arealFeeDestinationAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
  /** readonly */
  ataProgram: PublicKey;
}

export interface InitializeVaultArgs {
  initialAuthority: PublicKey;
  pauseAuthority: PublicKey;
  liquidityDestination: PublicKey;
  protocolRevenueDestination: PublicKey;
}

const IDL_INITIALIZE_VAULT_ARG_FIELDS: IdlField[] = [
  {
    "name": "initial_authority",
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
  }
];

export const WIRE_INITIALIZE_VAULT_ARG_FIELDS: WireFieldMap = {
  "initial_authority": "initialAuthority",
  "pause_authority": "pauseAuthority",
  "liquidity_destination": "liquidityDestination",
  "protocol_revenue_destination": "protocolRevenueDestination",
};

/**
 * Encode arguments for the `initialize_vault` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeInitializeVaultArgs(args: InitializeVaultArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_INITIALIZE_VAULT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_INITIALIZE_VAULT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(INITIALIZE_VAULT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: mint_rwt
// ============================================================

export const MINT_RWT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x62, 0x20, 0x73, 0xde, 0x44, 0x0c, 0xa1, 0xa2]);

export interface MintRwtAccounts {
  /** signer */
  user: PublicKey;
  /** readonly, writable */
  rwtVault: PublicKey;
  /** readonly, writable */
  rwtMint: PublicKey;
  /** readonly, writable */
  userDeposit: PublicKey;
  /** readonly, writable */
  userRwt: PublicKey;
  /** readonly, writable */
  capitalAcc: PublicKey;
  /** readonly, writable */
  daoFeeAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface MintRwtArgs {
  amount: bigint;
  minRwtOut: bigint;
}

const IDL_MINT_RWT_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  },
  {
    "name": "min_rwt_out",
    "type": "u64"
  }
];

export const WIRE_MINT_RWT_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
  "min_rwt_out": "minRwtOut",
};

/**
 * Encode arguments for the `mint_rwt` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeMintRwtArgs(args: MintRwtArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_MINT_RWT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_MINT_RWT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(MINT_RWT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: admin_mint_rwt
// ============================================================

export const ADMIN_MINT_RWT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x01, 0xdf, 0x16, 0x2e, 0xb8, 0x7f, 0x96, 0x19]);

export interface AdminMintRwtAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  rwtVault: PublicKey;
  /** readonly, writable */
  rwtMint: PublicKey;
  /** readonly, writable */
  recipientRwt: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface AdminMintRwtArgs {
  rwtAmount: bigint;
  backingCapitalUsd: bigint;
}

const IDL_ADMIN_MINT_RWT_ARG_FIELDS: IdlField[] = [
  {
    "name": "rwt_amount",
    "type": "u64"
  },
  {
    "name": "backing_capital_usd",
    "type": "u64"
  }
];

export const WIRE_ADMIN_MINT_RWT_ARG_FIELDS: WireFieldMap = {
  "rwt_amount": "rwtAmount",
  "backing_capital_usd": "backingCapitalUsd",
};

/**
 * Encode arguments for the `admin_mint_rwt` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeAdminMintRwtArgs(args: AdminMintRwtArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_ADMIN_MINT_RWT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_ADMIN_MINT_RWT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(ADMIN_MINT_RWT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: adjust_capital
// ============================================================

export const ADJUST_CAPITAL_DISCRIMINATOR: Uint8Array = new Uint8Array([0x14, 0x2a, 0x59, 0x12, 0x73, 0x60, 0xc2, 0x3e]);

export interface AdjustCapitalAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  rwtVault: PublicKey;
}

export interface AdjustCapitalArgs {
  writedownAmount: bigint;
}

const IDL_ADJUST_CAPITAL_ARG_FIELDS: IdlField[] = [
  {
    "name": "writedown_amount",
    "type": "u64"
  }
];

export const WIRE_ADJUST_CAPITAL_ARG_FIELDS: WireFieldMap = {
  "writedown_amount": "writedownAmount",
};

/**
 * Encode arguments for the `adjust_capital` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeAdjustCapitalArgs(args: AdjustCapitalArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_ADJUST_CAPITAL_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_ADJUST_CAPITAL_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(ADJUST_CAPITAL_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: update_vault_manager
// ============================================================

export const UPDATE_VAULT_MANAGER_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf6, 0x50, 0xa2, 0xcf, 0xe4, 0x1c, 0x85, 0xaa]);

export interface UpdateVaultManagerAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  rwtVault: PublicKey;
}

export interface UpdateVaultManagerArgs {
  newManager: Bytes32;
}

const IDL_UPDATE_VAULT_MANAGER_ARG_FIELDS: IdlField[] = [
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

export const WIRE_UPDATE_VAULT_MANAGER_ARG_FIELDS: WireFieldMap = {
  "new_manager": "newManager",
};

/**
 * Encode arguments for the `update_vault_manager` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeUpdateVaultManagerArgs(args: UpdateVaultManagerArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_UPDATE_VAULT_MANAGER_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_UPDATE_VAULT_MANAGER_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(UPDATE_VAULT_MANAGER_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: update_distribution_config
// ============================================================

export const UPDATE_DISTRIBUTION_CONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0xa2, 0x5f, 0x18, 0xf0, 0x90, 0xf7, 0x75, 0x16]);

export interface UpdateDistributionConfigAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  rwtVault: PublicKey;
  /** readonly, writable */
  distConfig: PublicKey;
}

export interface UpdateDistributionConfigArgs {
  bookValueBps: number;
  liquidityBps: number;
  protocolRevenueBps: number;
  liquidityDestination: PublicKey;
  protocolRevenueDestination: PublicKey;
}

const IDL_UPDATE_DISTRIBUTION_CONFIG_ARG_FIELDS: IdlField[] = [
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
  }
];

export const WIRE_UPDATE_DISTRIBUTION_CONFIG_ARG_FIELDS: WireFieldMap = {
  "book_value_bps": "bookValueBps",
  "liquidity_bps": "liquidityBps",
  "protocol_revenue_bps": "protocolRevenueBps",
  "liquidity_destination": "liquidityDestination",
  "protocol_revenue_destination": "protocolRevenueDestination",
};

/**
 * Encode arguments for the `update_distribution_config` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeUpdateDistributionConfigArgs(args: UpdateDistributionConfigArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_UPDATE_DISTRIBUTION_CONFIG_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_UPDATE_DISTRIBUTION_CONFIG_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(UPDATE_DISTRIBUTION_CONFIG_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: pause_mint
// ============================================================

export const PAUSE_MINT_DISCRIMINATOR: Uint8Array = new Uint8Array([0xfc, 0xde, 0xe8, 0x16, 0xda, 0xd2, 0xc3, 0xc4]);

export interface PauseMintAccounts {
  /** signer */
  pauseAuthority: PublicKey;
  /** readonly, writable */
  rwtVault: PublicKey;
}

/** Encode (no args) for the `pause_mint` instruction — discriminator only. */
export function encodePauseMintArgs(): Buffer {
  return Buffer.from(PAUSE_MINT_DISCRIMINATOR);
}

// ============================================================
// Instruction: unpause_mint
// ============================================================

export const UNPAUSE_MINT_DISCRIMINATOR: Uint8Array = new Uint8Array([0xee, 0x10, 0xf3, 0x97, 0x55, 0xf7, 0x43, 0xd6]);

export interface UnpauseMintAccounts {
  /** signer */
  pauseAuthority: PublicKey;
  /** readonly, writable */
  rwtVault: PublicKey;
}

/** Encode (no args) for the `unpause_mint` instruction — discriminator only. */
export function encodeUnpauseMintArgs(): Buffer {
  return Buffer.from(UNPAUSE_MINT_DISCRIMINATOR);
}

// ============================================================
// Instruction: propose_authority_transfer
// ============================================================

export const PROPOSE_AUTHORITY_TRANSFER_DISCRIMINATOR: Uint8Array = new Uint8Array([0x39, 0xce, 0xe1, 0x81, 0x23, 0x6f, 0xae, 0x91]);

export interface ProposeAuthorityTransferAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  rwtVault: PublicKey;
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
  rwtVault: PublicKey;
}

/** Encode (no args) for the `accept_authority_transfer` instruction — discriminator only. */
export function encodeAcceptAuthorityTransferArgs(): Buffer {
  return Buffer.from(ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR);
}

// ============================================================
// Instruction: vault_swap
// ============================================================

export const VAULT_SWAP_DISCRIMINATOR: Uint8Array = new Uint8Array([0x8f, 0xc2, 0x9a, 0x8a, 0xe6, 0xde, 0xed, 0x1c]);

export interface VaultSwapAccounts {
  /** signer */
  manager: PublicKey;
  /** readonly, writable */
  rwtVault: PublicKey;
  /** readonly, writable */
  vaultTokenIn: PublicKey;
  /** readonly, writable */
  vaultTokenOut: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  poolVaultIn: PublicKey;
  /** readonly, writable */
  poolVaultOut: PublicKey;
  /** readonly, writable */
  arealFeeAccount: PublicKey;
  /** readonly */
  dexProgram: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface VaultSwapArgs {
  amountIn: bigint;
  minAmountOut: bigint;
  aToB: boolean;
}

const IDL_VAULT_SWAP_ARG_FIELDS: IdlField[] = [
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

export const WIRE_VAULT_SWAP_ARG_FIELDS: WireFieldMap = {
  "amount_in": "amountIn",
  "min_amount_out": "minAmountOut",
  "a_to_b": "aToB",
};

/**
 * Encode arguments for the `vault_swap` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeVaultSwapArgs(args: VaultSwapArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_VAULT_SWAP_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_VAULT_SWAP_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(VAULT_SWAP_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: claim_yield
// ============================================================

export const CLAIM_YIELD_DISCRIMINATOR: Uint8Array = new Uint8Array([0x31, 0x4a, 0x6f, 0x07, 0xba, 0x16, 0x3d, 0xa5]);

export interface ClaimYieldAccounts {
  /** signer, writable */
  crank: PublicKey;
  /** readonly, writable */
  rwtVault: PublicKey;
  /** readonly */
  distConfig: PublicKey;
  /** readonly, writable */
  rwtClaimAta: PublicKey;
  /** readonly, writable */
  liquidityDest: PublicKey;
  /** readonly, writable */
  protocolRevenueDest: PublicKey;
  /** readonly */
  ydConfig: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly, writable */
  ydDistributor: PublicKey;
  /** readonly, writable */
  ydClaimStatus: PublicKey;
  /** readonly, writable */
  ydRewardVault: PublicKey;
  /** readonly */
  ydProgram: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface ClaimYieldArgs {
  cumulativeAmount: bigint;
  proof: Bytes32[];
}

const IDL_CLAIM_YIELD_ARG_FIELDS: IdlField[] = [
  {
    "name": "cumulative_amount",
    "type": "u64"
  },
  {
    "name": "proof",
    "type": {
      "vec": {
        "array": [
          "u8",
          32
        ]
      }
    }
  }
];

export const WIRE_CLAIM_YIELD_ARG_FIELDS: WireFieldMap = {
  "cumulative_amount": "cumulativeAmount",
  "proof": "proof",
};

/**
 * Encode arguments for the `claim_yield` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeClaimYieldArgs(args: ClaimYieldArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_CLAIM_YIELD_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_CLAIM_YIELD_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(CLAIM_YIELD_DISCRIMINATOR), argBuf]);
}
