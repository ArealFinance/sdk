// AUTO-GENERATED — DO NOT EDIT
// IDL: staking v0.1.0
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
  authority: PublicKey;
  /** readonly, writable */
  stakingConfig: PublicKey;
  /** readonly */
  rwtMint: PublicKey;
  /** signer, writable */
  strwtMint: PublicKey;
  /** readonly, writable */
  poolVault: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
  /** readonly */
  ataProgram: PublicKey;
}

export interface InitializeArgs {
  pauseAuthority1: Bytes32;
  pauseAuthority2: Bytes32;
  pauseAuthority3: Bytes32;
  rewardDepositor: Bytes32;
}

const IDL_INITIALIZE_ARG_FIELDS: IdlField[] = [
  {
    "name": "pause_authority_1",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "pause_authority_2",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "pause_authority_3",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "reward_depositor",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  }
];

export const WIRE_INITIALIZE_ARG_FIELDS: WireFieldMap = {
  "pause_authority_1": "pauseAuthority1",
  "pause_authority_2": "pauseAuthority2",
  "pause_authority_3": "pauseAuthority3",
  "reward_depositor": "rewardDepositor",
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
// Instruction: stake
// ============================================================

export const STAKE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xce, 0xb0, 0xca, 0x12, 0xc8, 0xd1, 0xb3, 0x6c]);

export interface StakeAccounts {
  /** signer */
  user: PublicKey;
  /** readonly, writable */
  stakingConfig: PublicKey;
  /** readonly, writable */
  strwtMint: PublicKey;
  /** readonly, writable */
  userRwtAta: PublicKey;
  /** readonly, writable */
  userStrwtAta: PublicKey;
  /** readonly, writable */
  poolVault: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface StakeArgs {
  rwtAmount: bigint;
  minStrwtOut: bigint;
}

const IDL_STAKE_ARG_FIELDS: IdlField[] = [
  {
    "name": "rwt_amount",
    "type": "u64"
  },
  {
    "name": "min_strwt_out",
    "type": "u64"
  }
];

export const WIRE_STAKE_ARG_FIELDS: WireFieldMap = {
  "rwt_amount": "rwtAmount",
  "min_strwt_out": "minStrwtOut",
};

/**
 * Encode arguments for the `stake` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeStakeArgs(args: StakeArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_STAKE_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_STAKE_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(STAKE_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: deposit_rewards
// ============================================================

export const DEPOSIT_REWARDS_DISCRIMINATOR: Uint8Array = new Uint8Array([0x34, 0xf9, 0x70, 0x48, 0xce, 0xa1, 0xc4, 0x01]);

export interface DepositRewardsAccounts {
  /** signer */
  depositor: PublicKey;
  /** readonly, writable */
  stakingConfig: PublicKey;
  /** readonly */
  strwtMint: PublicKey;
  /** readonly, writable */
  depositorRwtAta: PublicKey;
  /** readonly, writable */
  poolVault: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface DepositRewardsArgs {
  rwtAmount: bigint;
}

const IDL_DEPOSIT_REWARDS_ARG_FIELDS: IdlField[] = [
  {
    "name": "rwt_amount",
    "type": "u64"
  }
];

export const WIRE_DEPOSIT_REWARDS_ARG_FIELDS: WireFieldMap = {
  "rwt_amount": "rwtAmount",
};

/**
 * Encode arguments for the `deposit_rewards` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeDepositRewardsArgs(args: DepositRewardsArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_DEPOSIT_REWARDS_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_DEPOSIT_REWARDS_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(DEPOSIT_REWARDS_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: initiate_unstake
// ============================================================

export const INITIATE_UNSTAKE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xe5, 0x4f, 0x13, 0x9f, 0xe8, 0xce, 0x60, 0xd2]);

export interface InitiateUnstakeAccounts {
  /** signer, writable */
  user: PublicKey;
  /** readonly, writable */
  stakingConfig: PublicKey;
  /** readonly, writable */
  strwtMint: PublicKey;
  /** readonly, writable */
  userStrwtAta: PublicKey;
  /** readonly, writable */
  ticket: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
  /** readonly */
  systemProgram: PublicKey;
}

export interface InitiateUnstakeArgs {
  strwtAmount: bigint;
  nonce: bigint;
}

const IDL_INITIATE_UNSTAKE_ARG_FIELDS: IdlField[] = [
  {
    "name": "strwt_amount",
    "type": "u64"
  },
  {
    "name": "nonce",
    "type": "u64"
  }
];

export const WIRE_INITIATE_UNSTAKE_ARG_FIELDS: WireFieldMap = {
  "strwt_amount": "strwtAmount",
  "nonce": "nonce",
};

/**
 * Encode arguments for the `initiate_unstake` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeInitiateUnstakeArgs(args: InitiateUnstakeArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_INITIATE_UNSTAKE_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_INITIATE_UNSTAKE_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(INITIATE_UNSTAKE_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: complete_unstake
// ============================================================

export const COMPLETE_UNSTAKE_DISCRIMINATOR: Uint8Array = new Uint8Array([0x4f, 0x62, 0x28, 0xf1, 0x64, 0x1e, 0x19, 0xea]);

export interface CompleteUnstakeAccounts {
  /** signer, writable */
  user: PublicKey;
  /** readonly, writable */
  stakingConfig: PublicKey;
  /** readonly, writable */
  ticket: PublicKey;
  /** readonly, writable */
  poolVault: PublicKey;
  /** readonly, writable */
  userRwtAta: PublicKey;
  /** readonly */
  tokenProgram: PublicKey;
}

export interface CompleteUnstakeArgs {
  nonce: bigint;
}

const IDL_COMPLETE_UNSTAKE_ARG_FIELDS: IdlField[] = [
  {
    "name": "nonce",
    "type": "u64"
  }
];

export const WIRE_COMPLETE_UNSTAKE_ARG_FIELDS: WireFieldMap = {
  "nonce": "nonce",
};

/**
 * Encode arguments for the `complete_unstake` instruction.
 * Returns a Buffer with discriminator + serialized args.
 */
export function encodeCompleteUnstakeArgs(args: CompleteUnstakeArgs): Buffer {
  const wire = remapTsToWire(args as unknown as Record<string, unknown>, WIRE_COMPLETE_UNSTAKE_ARG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
  });
  const argBuf = serializeArgs(IDL_COMPLETE_UNSTAKE_ARG_FIELDS, wire, TYPE_REGISTRY);
  return Buffer.concat([Buffer.from(COMPLETE_UNSTAKE_DISCRIMINATOR), argBuf]);
}

// ============================================================
// Instruction: pause
// ============================================================

export const PAUSE_DISCRIMINATOR: Uint8Array = new Uint8Array([0xd3, 0x16, 0xdd, 0xfb, 0x4a, 0x79, 0xc1, 0x2f]);

export interface PauseAccounts {
  /** signer */
  pauseAuthority: PublicKey;
  /** readonly, writable */
  stakingConfig: PublicKey;
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
  authority: PublicKey;
  /** readonly, writable */
  stakingConfig: PublicKey;
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
  stakingConfig: PublicKey;
}

export interface UpdateConfigArgs {
  rewardDepositor: Bytes32;
  minStakeAmount: bigint;
  cooldownSeconds: bigint;
}

const IDL_UPDATE_CONFIG_ARG_FIELDS: IdlField[] = [
  {
    "name": "reward_depositor",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "min_stake_amount",
    "type": "u64"
  },
  {
    "name": "cooldown_seconds",
    "type": "i64"
  }
];

export const WIRE_UPDATE_CONFIG_ARG_FIELDS: WireFieldMap = {
  "reward_depositor": "rewardDepositor",
  "min_stake_amount": "minStakeAmount",
  "cooldown_seconds": "cooldownSeconds",
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
  stakingConfig: PublicKey;
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
  stakingConfig: PublicKey;
}

/** Encode (no args) for the `accept_authority_transfer` instruction — discriminator only. */
export function encodeAcceptAuthorityTransferArgs(): Buffer {
  return Buffer.from(ACCEPT_AUTHORITY_TRANSFER_DISCRIMINATOR);
}
