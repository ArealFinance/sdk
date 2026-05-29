// AUTO-GENERATED — DO NOT EDIT
// IDL: staking v0.1.0
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
  TYPE_REGISTRY,
} from './defined-types.generated.js';

// ============================================================
// Account: StakingConfig
// ============================================================

export interface StakingConfig {
  authority: PublicKey;
  pendingAuthority: PublicKey;
  hasPending: boolean;
  pauseAuthority: PublicKey;
  isPaused: boolean;
  rwtMint: PublicKey;
  strwtMint: PublicKey;
  rewardDepositor: Bytes32;
  poolVault: Bytes32;
  totalRwtActive: bigint;
  totalRwtReserved: bigint;
  cooldownSeconds: bigint;
  minStakeAmount: bigint;
  bump: number;
}

export const STAKINGCONFIG_DISCRIMINATOR: Uint8Array = new Uint8Array([0x2d, 0x86, 0xfc, 0x52, 0x25, 0x39, 0x54, 0x19]);

export const WIRE_STAKINGCONFIG_FIELDS: WireFieldMap = {
  "authority": "authority",
  "pending_authority": "pendingAuthority",
  "has_pending": "hasPending",
  "pause_authority": "pauseAuthority",
  "is_paused": "isPaused",
  "rwt_mint": "rwtMint",
  "strwt_mint": "strwtMint",
  "reward_depositor": "rewardDepositor",
  "pool_vault": "poolVault",
  "total_rwt_active": "totalRwtActive",
  "total_rwt_reserved": "totalRwtReserved",
  "cooldown_seconds": "cooldownSeconds",
  "min_stake_amount": "minStakeAmount",
  "bump": "bump",
};

/** Pubkey-classified [u8;32] fields for StakingConfig (heuristic + overrides). */
export const PUBKEY_STAKINGCONFIG_FIELDS = [
  "authority",
  "pendingAuthority",
  "pauseAuthority",
  "rwtMint",
  "strwtMint",
] as const;

const IDL_STAKINGCONFIG_FIELDS: IdlField[] = [
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
    "name": "is_paused",
    "type": "bool"
  },
  {
    "name": "rwt_mint",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "strwt_mint",
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
  },
  {
    "name": "pool_vault",
    "type": {
      "array": [
        "u8",
        32
      ]
    }
  },
  {
    "name": "total_rwt_active",
    "type": "u64"
  },
  {
    "name": "total_rwt_reserved",
    "type": "u64"
  },
  {
    "name": "cooldown_seconds",
    "type": "i64"
  },
  {
    "name": "min_stake_amount",
    "type": "u64"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a StakingConfig account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseStakingConfig(data: Buffer | Uint8Array): StakingConfig {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, STAKINGCONFIG_DISCRIMINATOR, "StakingConfig");
  const raw = deserializeAccount(IDL_STAKINGCONFIG_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_STAKINGCONFIG_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
    pubkeyFields: PUBKEY_STAKINGCONFIG_FIELDS,
  }) as unknown as StakingConfig;
}

// ============================================================
// Account: UnstakeTicket
// ============================================================

export interface UnstakeTicket {
  owner: PublicKey;
  amountRwt: bigint;
  unlockTs: bigint;
  nonce: bigint;
  bump: number;
}

export const UNSTAKETICKET_DISCRIMINATOR: Uint8Array = new Uint8Array([0x83, 0x54, 0xd1, 0x26, 0x91, 0x9d, 0xb5, 0x7f]);

export const WIRE_UNSTAKETICKET_FIELDS: WireFieldMap = {
  "owner": "owner",
  "amount_rwt": "amountRwt",
  "unlock_ts": "unlockTs",
  "nonce": "nonce",
  "bump": "bump",
};

/** Pubkey-classified [u8;32] fields for UnstakeTicket (heuristic + overrides). */
export const PUBKEY_UNSTAKETICKET_FIELDS = [
  "owner",
] as const;

const IDL_UNSTAKETICKET_FIELDS: IdlField[] = [
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
    "name": "amount_rwt",
    "type": "u64"
  },
  {
    "name": "unlock_ts",
    "type": "i64"
  },
  {
    "name": "nonce",
    "type": "u64"
  },
  {
    "name": "bump",
    "type": "u8"
  }
];

/**
 * Parse a UnstakeTicket account from raw bytes (including 8-byte discriminator).
 * Throws if the discriminator does not match.
 */
export function parseUnstakeTicket(data: Buffer | Uint8Array): UnstakeTicket {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  parseDiscriminator(buf, UNSTAKETICKET_DISCRIMINATOR, "UnstakeTicket");
  const raw = deserializeAccount(IDL_UNSTAKETICKET_FIELDS, buf, TYPE_REGISTRY);
  return remapWireToTs(raw, WIRE_UNSTAKETICKET_FIELDS, {
    nestedMaps: {},
    arrayMaps: {},
    pubkeyFields: PUBKEY_UNSTAKETICKET_FIELDS,
  }) as unknown as UnstakeTicket;
}
