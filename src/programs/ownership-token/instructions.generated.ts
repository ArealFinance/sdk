// AUTO-GENERATED — DO NOT EDIT
// IDL: ownership-token v0.1.0
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

/** Type registry shared across all instruction encoders in this module. */
const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([{"name":"RevenueDestination","type":{"kind":"struct","fields":[{"name":"address","type":{"array":["u8",32]}},{"name":"allocation_bps","type":"u16"},{"name":"label","type":{"array":["u8",32]}}]}},{"name":"BatchDestination","type":{"kind":"struct","fields":[{"name":"address","type":{"array":["u8",32]}},{"name":"allocation_bps","type":"u16"},{"name":"label","type":{"array":["u8",32]}}]}}] as any, [{"name":"OtConfig","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"name","type":{"array":["u8",32]}},{"name":"symbol","type":{"array":["u8",10]}},{"name":"decimals","type":"u8"},{"name":"total_minted","type":"u64"},{"name":"uri","type":{"array":["u8",200]}},{"name":"bump","type":"u8"}]}},{"name":"RevenueAccount","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"revenue_token_account","type":{"array":["u8",32]}},{"name":"total_distributed","type":"u64"},{"name":"distribution_count","type":"u64"},{"name":"last_distribution_ts","type":"i64"},{"name":"min_distribution_amount","type":"u64"},{"name":"is_distributing","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"RevenueConfig","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"destinations","type":{"array":[{"defined":"RevenueDestination"},10]}},{"name":"active_count","type":"u8"},{"name":"config_version","type":"u64"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"OtGovernance","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"OtTreasury","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}}] as any);

// ============================================================
// Instruction: initialize_ot
// ============================================================

export const INITIALIZE_OT_DISCRIMINATOR: Uint8Array = new Uint8Array([0xf5, 0x47, 0xed, 0xcb, 0xec, 0x1e, 0x9e, 0x91]);

export interface InitializeOtAccounts {
  /** signer, writable */
  deployer: PublicKey;
  /** readonly, writable */
  otMint: PublicKey;
  /** readonly */
  usdcMint: PublicKey;
  /** readonly */
  otConfig: PublicKey;
  /** readonly */
  revenueAccount: PublicKey;
  /** readonly, writable */
  revenueTokenAccount: PublicKey;
  /** readonly */
  revenueConfig: PublicKey;
  /** readonly */
  otGovernance: PublicKey;
  /** readonly */
  otTreasury: PublicKey;
  /** readonly */
  arealFeeDestinationAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
  /** readonly */
  ataProgram: PublicKey;
}

export interface InitializeOtArgs {
  name: Bytes32;
  symbol_: Uint8Array;
  uri: Uint8Array;
  initialAuthority: PublicKey;
}

const IDL_INITIALIZE_OT_ARG_FIELDS: IdlField[] = [
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
    "name": "uri",
    "type": {
      "array": [
        "u8",
        200
      ]
    }
  },
  {
    "name": "initial_authority",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_INITIALIZE_OT_ARG_FIELDS: WireFieldMap = {
  "name": "name",
  "symbol": "symbol_",
  "uri": "uri",
  "initial_authority": "initialAuthority",
};

/**
 * Encode arguments for the `initialize_ot` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeInitializeOtArgs(args: InitializeOtArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_INITIALIZE_OT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_INITIALIZE_OT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(INITIALIZE_OT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: mint_ot
// ============================================================

export const MINT_OT_DISCRIMINATOR: Uint8Array = new Uint8Array([0x51, 0x5c, 0x22, 0x93, 0xdd, 0x72, 0x43, 0xe0]);

export interface MintOtAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  otGovernance: PublicKey;
  /** readonly */
  otConfig: PublicKey;
  /** readonly, writable */
  otMint: PublicKey;
  /** readonly, writable */
  recipientTokenAccount: PublicKey;
  /** readonly */
  recipient: PublicKey;
  /** signer, writable */
  payer: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
  /** readonly */
  ataProgram: PublicKey;
}

export interface MintOtArgs {
  amount: bigint;
}

const IDL_MINT_OT_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  }
];

export const WIRE_MINT_OT_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
};

/**
 * Encode arguments for the `mint_ot` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeMintOtArgs(args: MintOtArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_MINT_OT_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_MINT_OT_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(MINT_OT_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: distribute_revenue
// ============================================================

export const DISTRIBUTE_REVENUE_DISCRIMINATOR: Uint8Array = new Uint8Array([0x5e, 0x22, 0xef, 0xc9, 0x93, 0xe3, 0x1d, 0x1e]);

export interface DistributeRevenueAccounts {
  /** signer */
  crank: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  revenueAccount: PublicKey;
  /** readonly, writable */
  revenueTokenAccount: PublicKey;
  /** readonly */
  revenueConfig: PublicKey;
  /** readonly, writable */
  arealFeeAccount: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

/** Encode (no args) for the `distribute_revenue` instruction — discriminator only. */
export function encodeDistributeRevenueArgs(): Buffer {
  return Buffer.from(DISTRIBUTE_REVENUE_DISCRIMINATOR);
}

// ============================================================
// Instruction: spend_treasury
// ============================================================

export const SPEND_TREASURY_DISCRIMINATOR: Uint8Array = new Uint8Array([0x14, 0x5c, 0x94, 0x75, 0x89, 0x2e, 0x8e, 0x85]);

export interface SpendTreasuryAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  otGovernance: PublicKey;
  /** readonly */
  otTreasury: PublicKey;
  /** readonly, writable */
  treasuryTokenAccount: PublicKey;
  /** readonly, writable */
  destinationTokenAccount: PublicKey;
  /** readonly */
  tokenMint: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface SpendTreasuryArgs {
  amount: bigint;
}

const IDL_SPEND_TREASURY_ARG_FIELDS: IdlField[] = [
  {
    "name": "amount",
    "type": "u64"
  }
];

export const WIRE_SPEND_TREASURY_ARG_FIELDS: WireFieldMap = {
  "amount": "amount",
};

/**
 * Encode arguments for the `spend_treasury` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeSpendTreasuryArgs(args: SpendTreasuryArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_SPEND_TREASURY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_SPEND_TREASURY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(SPEND_TREASURY_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: batch_update_destinations
// ============================================================

export const BATCH_UPDATE_DESTINATIONS_DISCRIMINATOR: Uint8Array = new Uint8Array([0x9b, 0x62, 0xc3, 0x95, 0x5c, 0x05, 0x00, 0xed]);

export interface BatchUpdateDestinationsAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  otGovernance: PublicKey;
  /** readonly */
  revenueConfig: PublicKey;
}

export interface BatchUpdateDestinationsArgs {
  destinations: BatchDestination[];
}

const IDL_BATCH_UPDATE_DESTINATIONS_ARG_FIELDS: IdlField[] = [
  {
    "name": "destinations",
    "type": {
      "vec": {
        "defined": "BatchDestination"
      }
    }
  }
];

export const WIRE_BATCH_UPDATE_DESTINATIONS_ARG_FIELDS: WireFieldMap = {
  "destinations": "destinations",
};

/**
 * Encode arguments for the `batch_update_destinations` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeBatchUpdateDestinationsArgs(args: BatchUpdateDestinationsArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_BATCH_UPDATE_DESTINATIONS_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {
  "destinations": WIRE_BATCHDESTINATION_FIELDS,
},
  });
  const argBuf = serializeArgs(IDL_BATCH_UPDATE_DESTINATIONS_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(BATCH_UPDATE_DESTINATIONS_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: propose_authority_transfer
// ============================================================

export const PROPOSE_AUTHORITY_TRANSFER_DISCRIMINATOR: Uint8Array = new Uint8Array([0x39, 0xce, 0xe1, 0x81, 0x23, 0x6f, 0xae, 0x91]);

export interface ProposeAuthorityTransferAccounts {
  /** signer */
  authority: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  otGovernance: PublicKey;
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
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  otGovernance: PublicKey;
}

/** Encode (no args) for the `accept_authority_transfer` instruction — discriminator only. */
export function encodeAcceptAuthorityTransferArgs(): Buffer {
  return Buffer.from(ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR);
}

// ============================================================
// Instruction: claim_yd_for_treasury
// ============================================================

export const CLAIM_YD_FOR_TREASURY_DISCRIMINATOR: Uint8Array = new Uint8Array([0xbb, 0x8d, 0xf0, 0xbe, 0x60, 0xed, 0x4b, 0xf9]);

export interface ClaimYdForTreasuryAccounts {
  /** signer, writable */
  crank: PublicKey;
  /** readonly */
  otMint: PublicKey;
  /** readonly */
  otTreasury: PublicKey;
  /** readonly, writable */
  treasuryRwtAta: PublicKey;
  /** readonly */
  ydConfig: PublicKey;
  /** readonly */
  ydOtMint: PublicKey;
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

export interface ClaimYdForTreasuryArgs {
  cumulativeAmount: bigint;
  proof: Bytes32[];
}

const IDL_CLAIM_YD_FOR_TREASURY_ARG_FIELDS: IdlField[] = [
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

export const WIRE_CLAIM_YD_FOR_TREASURY_ARG_FIELDS: WireFieldMap = {
  "cumulative_amount": "cumulativeAmount",
  "proof": "proof",
};

/**
 * Encode arguments for the `claim_yd_for_treasury` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeClaimYdForTreasuryArgs(args: ClaimYdForTreasuryArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_CLAIM_YD_FOR_TREASURY_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_CLAIM_YD_FOR_TREASURY_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(CLAIM_YD_FOR_TREASURY_DISCRIMINATOR), argBuf]);
}
