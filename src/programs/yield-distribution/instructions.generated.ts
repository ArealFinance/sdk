// AUTO-GENERATED — DO NOT EDIT
// IDL: yield-distribution v0.1.0
// Generator: @arlex/client codegen v1

import { Buffer } from 'buffer';

import {
  PublicKey,
  type Bytes32,
  type WireFieldMap,
  type IdlField,
  serializeArgs,
  instructionDiscriminator,
  remapTsToWire,
} from '@arlex/client/codegen-runtime';

import {
  TYPE_REGISTRY,
} from './defined-types.generated.js';

// ============================================================
// Instruction: initialize_config
// ============================================================

export const INITIALIZE_CONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0xd0, 0x7f, 0x15, 0x01, 0xc2, 0xbe, 0xc4, 0x46]);

export interface InitializeConfigAccounts {
  /** signer, writable */
  deployer: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly */
  arealFeeDestinationAccount: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface InitializeConfigArgs {
  publishAuthority: PublicKey;
  protocolFeeBps: number;
  minDistributionAmount: bigint;
}

const IDL_INITIALIZE_CONFIG_ARG_FIELDS: IdlField[] = [
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
  }
];

export const WIRE_INITIALIZE_CONFIG_ARG_FIELDS: WireFieldMap = {
  "publish_authority": "publishAuthority",
  "protocol_fee_bps": "protocolFeeBps",
  "min_distribution_amount": "minDistributionAmount",
};

/**
 * Encode arguments for the `initialize_config` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeInitializeConfigArgs(args: InitializeConfigArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_INITIALIZE_CONFIG_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_INITIALIZE_CONFIG_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(INITIALIZE_CONFIG_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: create_distributor
// ============================================================

export const CREATE_DISTRIBUTOR_DISCRIMINATOR: Uint8Array = new Uint8Array([0xb8, 0x67, 0x1a, 0x47, 0x8d, 0x40, 0x31, 0xb1]);

export interface CreateDistributorAccounts {
  /** signer, writable */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  distributor: PublicKey;
  /** readonly */
  accumulator: PublicKey;
  /** readonly */
  rwtMint: PublicKey;
  /** readonly */
  usdcMint: PublicKey;
  /** readonly, writable */
  rewardVault: PublicKey;
  /** readonly, writable */
  accumulatorUsdcAta: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
  /** readonly */
  ataProgram: PublicKey;
}

export interface CreateDistributorArgs {
  vestingPeriodSecs: bigint;
}

const IDL_CREATE_DISTRIBUTOR_ARG_FIELDS: IdlField[] = [
  {
    "name": "vesting_period_secs",
    "type": "i64"
  }
];

export const WIRE_CREATE_DISTRIBUTOR_ARG_FIELDS: WireFieldMap = {
  "vesting_period_secs": "vestingPeriodSecs",
};

/**
 * Encode arguments for the `create_distributor` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeCreateDistributorArgs(args: CreateDistributorArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_CREATE_DISTRIBUTOR_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_CREATE_DISTRIBUTOR_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(CREATE_DISTRIBUTOR_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: fund_distributor
// ============================================================

export const FUND_DISTRIBUTOR_DISCRIMINATOR: Uint8Array = new Uint8Array([0xdf, 0xff, 0xa3, 0x59, 0x24, 0xfa, 0x41, 0x9c]);

export interface FundDistributorAccounts {
  /** signer, writable */
  depositor: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  distributor: PublicKey;
  /** readonly, writable */
  depositorToken: PublicKey;
  /** readonly, writable */
  rewardVault: PublicKey;
  /** readonly, writable */
  feeAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface FundDistributorArgs {
  amount: bigint;
}

const IDL_FUND_DISTRIBUTOR_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  }
];

export const WIRE_FUND_DISTRIBUTOR_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
};

/**
 * Encode arguments for the `fund_distributor` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeFundDistributorArgs(args: FundDistributorArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_FUND_DISTRIBUTOR_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_FUND_DISTRIBUTOR_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(FUND_DISTRIBUTOR_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: publish_root
// ============================================================

export const PUBLISH_ROOT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x32, 0xbd, 0x23, 0xd4, 0xb4, 0x64, 0x57, 0x19]);

export interface PublishRootAccounts {
  /** signer */
  publishAuthority: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  distributor: PublicKey;
}

export interface PublishRootArgs {
  merkleRoot: Bytes32;
  maxTotalClaim: bigint;
}

const IDL_PUBLISH_ROOT_ARG_FIELDS: IdlField[] = [
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
  }
];

export const WIRE_PUBLISH_ROOT_ARG_FIELDS: WireFieldMap = {
  "merkle_root": "merkleRoot",
  "max_total_claim": "maxTotalClaim",
};

/**
 * Encode arguments for the `publish_root` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodePublishRootArgs(args: PublishRootArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_PUBLISH_ROOT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_PUBLISH_ROOT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(PUBLISH_ROOT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: claim
// ============================================================

export const CLAIM_DISCRIMINATOR: Uint8Array = new Uint8Array([0x3e, 0xc6, 0xd6, 0xc1, 0xd5, 0x9f, 0x6c, 0xd2]);

export interface ClaimAccounts {
  /** signer */
  claimant: PublicKey;
  /** signer, writable */
  payer: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  distributor: PublicKey;
  /** readonly */
  claimStatus: PublicKey;
  /** readonly, writable */
  rewardVault: PublicKey;
  /** readonly, writable */
  claimantToken: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface ClaimArgs {
  cumulativeAmount: bigint;
  proof: Bytes32[];
}

const IDL_CLAIM_ARG_FIELDS: IdlField[] = [
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

export const WIRE_CLAIM_ARG_FIELDS: WireFieldMap = {
  "cumulative_amount": "cumulativeAmount",
  "proof": "proof",
};

/**
 * Encode arguments for the `claim` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeClaimArgs(args: ClaimArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_CLAIM_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_CLAIM_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(CLAIM_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: close_distributor
// ============================================================

export const CLOSE_DISTRIBUTOR_DISCRIMINATOR: Uint8Array = new Uint8Array([0xca, 0x38, 0xb4, 0x8f, 0x2e, 0x68, 0x6a, 0x70]);

export interface CloseDistributorAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  distributor: PublicKey;
  /** readonly, writable */
  rewardVault: PublicKey;
  /** readonly, writable */
  unclaimedDestination: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

/** Encode (no args) for the `close_distributor` instruction — discriminator only. */
export function encodeCloseDistributorArgs(): Buffer {
  return Buffer.from(CLOSE_DISTRIBUTOR_DISCRIMINATOR);
}

// ============================================================
// Instruction: update_config
// ============================================================

export const UPDATE_CONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0x1d, 0x9e, 0xfc, 0xbf, 0x0a, 0x53, 0xdb, 0x63]);

export interface UpdateConfigAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
}

export interface UpdateConfigArgs {
  protocolFeeBps: number;
  minDistributionAmount: bigint;
  isActive: boolean;
}

const IDL_UPDATE_CONFIG_ARG_FIELDS: IdlField[] = [
  {
    "name": "protocol_fee_bps",
    "type": "u16"
  },
  {
    "name": "min_distribution_amount",
    "type": "u64"
  },
  {
    "name": "is_active",
    "type": "bool"
  }
];

export const WIRE_UPDATE_CONFIG_ARG_FIELDS: WireFieldMap = {
  "protocol_fee_bps": "protocolFeeBps",
  "min_distribution_amount": "minDistributionAmount",
  "is_active": "isActive",
};

/**
 * Encode arguments for the `update_config` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeUpdateConfigArgs(args: UpdateConfigArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_UPDATE_CONFIG_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_UPDATE_CONFIG_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(UPDATE_CONFIG_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: update_publish_authority
// ============================================================

export const UPDATE_PUBLISH_AUTHORITY_DISCRIMINATOR: Uint8Array = new Uint8Array([0xe9, 0x03, 0x4f, 0xf1, 0x11, 0xf7, 0xbb, 0x82]);

export interface UpdatePublishAuthorityAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
}

export interface UpdatePublishAuthorityArgs {
  newPublishAuthority: PublicKey;
}

const IDL_UPDATE_PUBLISH_AUTHORITY_ARG_FIELDS: IdlField[] = [
  {
    "name": "new_publish_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_UPDATE_PUBLISH_AUTHORITY_ARG_FIELDS: WireFieldMap = {
  "new_publish_authority": "newPublishAuthority",
};

/**
 * Encode arguments for the `update_publish_authority` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeUpdatePublishAuthorityArgs(args: UpdatePublishAuthorityArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_UPDATE_PUBLISH_AUTHORITY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_UPDATE_PUBLISH_AUTHORITY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(UPDATE_PUBLISH_AUTHORITY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: propose_authority_transfer
// ============================================================

export const PROPOSE_AUTHORITY_TRANSFER_DISCRIMINATOR: Uint8Array = new Uint8Array([0x39, 0xce, 0xe1, 0x81, 0x23, 0x6f, 0xae, 0x91]);

export interface ProposeAuthorityTransferAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
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
  config: PublicKey;
}

/** Encode (no args) for the `accept_authority_transfer` instruction — discriminator only. */
export function encodeAcceptAuthorityTransferArgs(): Buffer {
  return Buffer.from(ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR);
}

// ============================================================
// Instruction: initialize_liquidity_holding
// ============================================================

export const INITIALIZE_LIQUIDITY_HOLDING_DISCRIMINATOR: Uint8Array = new Uint8Array([0xbe, 0xce, 0x60, 0xa6, 0x31, 0x95, 0x5b, 0xb0]);

export interface InitializeLiquidityHoldingAccounts {
  /** signer, writable */
  payer: PublicKey;
  /** readonly */
  liquidityHolding: PublicKey;
  /** readonly */
  rwtMint: PublicKey;
  /** readonly, writable */
  liquidityHoldingAta: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
  /** readonly */
  ataProgram: PublicKey;
}

/** Encode (no args) for the `initialize_liquidity_holding` instruction — discriminator only. */
export function encodeInitializeLiquidityHoldingArgs(): Buffer {
  return Buffer.from(INITIALIZE_LIQUIDITY_HOLDING_DISCRIMINATOR);
}

// ============================================================
// Instruction: withdraw_liquidity_holding
// ============================================================

export const WITHDRAW_LIQUIDITY_HOLDING_DISCRIMINATOR: Uint8Array = new Uint8Array([0x07, 0x14, 0x13, 0x12, 0xe4, 0x2e, 0xb3, 0x36]);

export interface WithdrawLiquidityHoldingAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly, writable */
  liquidityHolding: PublicKey;
  /** readonly, writable */
  liquidityHoldingAta: PublicKey;
  /** readonly, writable */
  nexusTokenAta: PublicKey;
  /** readonly, writable */
  liquidityNexus: PublicKey;
  /** readonly */
  dexProgram: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface WithdrawLiquidityHoldingArgs {
  amount: bigint;
}

const IDL_WITHDRAW_LIQUIDITY_HOLDING_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  }
];

export const WIRE_WITHDRAW_LIQUIDITY_HOLDING_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
};

/**
 * Encode arguments for the `withdraw_liquidity_holding` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeWithdrawLiquidityHoldingArgs(args: WithdrawLiquidityHoldingArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_WITHDRAW_LIQUIDITY_HOLDING_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_WITHDRAW_LIQUIDITY_HOLDING_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(WITHDRAW_LIQUIDITY_HOLDING_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: convert_to_rwt
// ============================================================

export const CONVERT_TO_RWT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x1e, 0x72, 0x49, 0x6e, 0x4c, 0x4d, 0x7f, 0x8d]);

export interface ConvertToRwtAccounts {
  /** signer, writable */
  crank: PublicKey;
  /** readonly */
  config: PublicKey;
  /** readonly, writable */
  distributor: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  accumulator: PublicKey;
  /** readonly, writable */
  accumulatorUsdcAta: PublicKey;
  /** readonly, writable */
  accumulatorRwtAta: PublicKey;
  /** readonly, writable */
  feeAccount: PublicKey;
  /** readonly, writable */
  rewardVault: PublicKey;
  /** readonly */
  rwtMint: PublicKey;
  /** readonly */
  dexConfig: PublicKey;
  /** readonly, writable */
  poolState: PublicKey;
  /** readonly, writable */
  dexPoolVaultIn: PublicKey;
  /** readonly, writable */
  dexPoolVaultOut: PublicKey;
  /** readonly, writable */
  dexArealFeeAccount: PublicKey;
  /** readonly, writable */
  rwtVault: PublicKey;
  /** readonly, writable */
  rwtCapitalAcc: PublicKey;
  /** readonly, writable */
  rwtDaoFeeAccount: PublicKey;
  /** readonly */
  dexProgram: PublicKey;
  /** readonly */
  rwtEngineProgram: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface ConvertToRwtArgs {
  usdcAmount: bigint;
  minRwtOut: bigint;
  swapFirst: boolean;
}

const IDL_CONVERT_TO_RWT_ARG_FIELDS: IdlField[] = [
  {
    "name": "usdc_amount",
    "type": "u64"
  },
  {
    "name": "min_rwt_out",
    "type": "u64"
  },
  {
    "name": "swap_first",
    "type": "bool"
  }
];

export const WIRE_CONVERT_TO_RWT_ARG_FIELDS: WireFieldMap = {
  "usdc_amount": "usdcAmount",
  "min_rwt_out": "minRwtOut",
  "swap_first": "swapFirst",
};

/**
 * Encode arguments for the `convert_to_rwt` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeConvertToRwtArgs(args: ConvertToRwtArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_CONVERT_TO_RWT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_CONVERT_TO_RWT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(CONVERT_TO_RWT_DISCRIMINATOR), argBuf]);
}
