// AUTO-GENERATED — DO NOT EDIT
// IDL: earn v0.1.0
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
// Instruction: initialize
// ============================================================

export const INITIALIZE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xaf, 0xaf, 0x6d, 0x1f, 0x0d, 0x98, 0x9b, 0xed]);

export interface InitializeAccounts {
  /** signer, writable */
  deployer: PublicKey;
  /** readonly */
  earnConfig: PublicKey;
  /** readonly */
  rwtMint: PublicKey;
  /** readonly */
  usdcMint: PublicKey;
  /** readonly */
  basketVault: PublicKey;
  /** readonly */
  daoFeeDestination: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface InitializeArgs {
  authority: PublicKey;
  pauseAuthority: PublicKey;
}

const IDL_INITIALIZE_ARG_FIELDS: IdlField[] = [
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
    "name": "pause_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_INITIALIZE_ARG_FIELDS: WireFieldMap = {
  "authority": "authority",
  "pause_authority": "pauseAuthority",
};

/**
 * Encode arguments for the `initialize` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeInitializeArgs(args: InitializeArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_INITIALIZE_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_INITIALIZE_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(INITIALIZE_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: mint_rwt
// ============================================================

export const MINT_RWT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x62, 0x20, 0x73, 0xde, 0x44, 0x0c, 0xa1, 0xa2]);

export interface MintRwtAccounts {
  /** signer */
  user: PublicKey;
  /** readonly, writable */
  earnConfig: PublicKey;
  /** readonly, writable */
  rwtMint: PublicKey;
  /** readonly, writable */
  userUsdc: PublicKey;
  /** readonly, writable */
  userRwt: PublicKey;
  /** readonly, writable */
  basketVault: PublicKey;
  /** readonly, writable */
  daoFeeDestination: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface MintRwtArgs {
  usdcAmount: bigint;
  minRwtOut: bigint;
}

const IDL_MINT_RWT_ARG_FIELDS: IdlField[] = [
  {
    "name": "usdc_amount",
    "type": "u64"
  },
  {
    "name": "min_rwt_out",
    "type": "u64"
  }
];

export const WIRE_MINT_RWT_ARG_FIELDS: WireFieldMap = {
  "usdc_amount": "usdcAmount",
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
// Instruction: add_to_basket
// ============================================================

export const ADD_TO_BASKET_DISCRIMINATOR: Uint8Array = new Uint8Array([0x82, 0x9b, 0xd0, 0x92, 0xfe, 0x14, 0x87, 0x38]);

export interface AddToBasketAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly, writable */
  earnConfig: PublicKey;
  /** readonly */
  rwtMint: PublicKey;
  /** readonly, writable */
  authoritySource: PublicKey;
  /** readonly, writable */
  basketVault: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface AddToBasketArgs {
  amount: bigint;
}

const IDL_ADD_TO_BASKET_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  }
];

export const WIRE_ADD_TO_BASKET_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
};

/**
 * Encode arguments for the `add_to_basket` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeAddToBasketArgs(args: AddToBasketArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_ADD_TO_BASKET_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_ADD_TO_BASKET_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(ADD_TO_BASKET_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: writedown_capital
// ============================================================

export const WRITEDOWN_CAPITAL_DISCRIMINATOR: Uint8Array = new Uint8Array([0xde, 0x0b, 0xbd, 0x7c, 0xa7, 0x46, 0x4e, 0x8f]);

export interface WritedownCapitalAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly, writable */
  earnConfig: PublicKey;
  /** readonly */
  rwtMint: PublicKey;
}

export interface WritedownCapitalArgs {
  amount: bigint;
  reasonCode: number;
}

const IDL_WRITEDOWN_CAPITAL_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  },
  {
    "name": "reason_code",
    "type": "u8"
  }
];

export const WIRE_WRITEDOWN_CAPITAL_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
  "reason_code": "reasonCode",
};

/**
 * Encode arguments for the `writedown_capital` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeWritedownCapitalArgs(args: WritedownCapitalArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_WRITEDOWN_CAPITAL_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_WRITEDOWN_CAPITAL_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(WRITEDOWN_CAPITAL_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: pause
// ============================================================

export const PAUSE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xd3, 0x16, 0xdd, 0xfb, 0x4a, 0x79, 0xc1, 0x2f]);

export interface PauseAccounts {
  /** signer */
  pauseAuthority: PublicKey;
  /** readonly, writable */
  earnConfig: PublicKey;
}

/** Encode (no args) for the `pause` instruction — discriminator only. */
export function encodePauseArgs(): Buffer {
  return Buffer.from(PAUSE_DISCRIMINATOR);
}

// ============================================================
// Instruction: unpause
// ============================================================

export const UNPAUSE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xa9, 0x90, 0x04, 0x26, 0x0a, 0x8d, 0xbc, 0xff]);

export interface UnpauseAccounts {
  /** signer */
  pauseAuthority: PublicKey;
  /** readonly, writable */
  earnConfig: PublicKey;
}

/** Encode (no args) for the `unpause` instruction — discriminator only. */
export function encodeUnpauseArgs(): Buffer {
  return Buffer.from(UNPAUSE_DISCRIMINATOR);
}

// ============================================================
// Instruction: update_config
// ============================================================

export const UPDATE_CONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0x1d, 0x9e, 0xfc, 0xbf, 0x0a, 0x53, 0xdb, 0x63]);

export interface UpdateConfigAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly, writable */
  earnConfig: PublicKey;
}

export interface UpdateConfigArgs {
  mintFeeBps: number;
  minMintAmount: bigint;
  daoFeeDestination: PublicKey;
}

const IDL_UPDATE_CONFIG_ARG_FIELDS: IdlField[] = [
  {
    "name": "mint_fee_bps",
    "type": "u16"
  },
  {
    "name": "min_mint_amount",
    "type": "u64"
  },
  {
    "name": "dao_fee_destination",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_UPDATE_CONFIG_ARG_FIELDS: WireFieldMap = {
  "mint_fee_bps": "mintFeeBps",
  "min_mint_amount": "minMintAmount",
  "dao_fee_destination": "daoFeeDestination",
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
// Instruction: propose_authority_transfer
// ============================================================

export const PROPOSE_AUTHORITY_TRANSFER_DISCRIMINATOR: Uint8Array = new Uint8Array([0x39, 0xce, 0xe1, 0x81, 0x23, 0x6f, 0xae, 0x91]);

export interface ProposeAuthorityTransferAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly, writable */
  earnConfig: PublicKey;
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
  earnConfig: PublicKey;
}

/** Encode (no args) for the `accept_authority_transfer` instruction — discriminator only. */
export function encodeAcceptAuthorityTransferArgs(): Buffer {
  return Buffer.from(ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR);
}
