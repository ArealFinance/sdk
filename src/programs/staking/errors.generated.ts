// AUTO-GENERATED — DO NOT EDIT
// IDL: staking v0.1.0
// Generator: @arlex/client codegen v1

import {
  ArlexProgramError,
  decodeError,
  extractErrorCode,
  type IdlError,
} from '@arlex/client/codegen-runtime';

/**
 * Numeric error codes from the program IDL.
 * Names are guaranteed unique within the IDL by Anchor convention.
 */
export enum ProgramErrorCode {
  /** Signer is not the authority */
  Unauthorized = 6000,
  /** Signer is not the pause authority */
  UnauthorizedPause = 6001,
  /** Signer is not the reward depositor */
  UnauthorizedRewardDepositor = 6002,
  /** Staking is paused */
  StakingPaused = 6003,
  /** Stake below minimum */
  BelowMinStake = 6004,
  /** Stake would mint 0 stRWT */
  ZeroStrwtOutput = 6005,
  /** Unstake would release 0 RWT */
  ZeroRwtOutput = 6006,
  /** Output below minimum (slippage protection) */
  SlippageExceeded = 6007,
  /** Cooldown has not elapsed */
  CooldownNotElapsed = 6008,
  /** Ticket owner does not match signer */
  TicketOwnerMismatch = 6009,
  /** rwt_mint does not match the canonical earn-RWT mint */
  InvalidRwtMint = 6010,
  /** No pending authority transfer */
  NoPendingAuthority = 6011,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6012,
  /** Cannot transfer authority to self */
  SelfTransfer = 6013,
  /** Arithmetic overflow */
  MathOverflow = 6014,
  /** Invalid token account */
  InvalidTokenAccount = 6015,
  /** Address cannot be zero */
  ZeroAddress = 6016,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "UnauthorizedPause", msg: "Signer is not the pause authority" },
  { code: 6002, name: "UnauthorizedRewardDepositor", msg: "Signer is not the reward depositor" },
  { code: 6003, name: "StakingPaused", msg: "Staking is paused" },
  { code: 6004, name: "BelowMinStake", msg: "Stake below minimum" },
  { code: 6005, name: "ZeroStrwtOutput", msg: "Stake would mint 0 stRWT" },
  { code: 6006, name: "ZeroRwtOutput", msg: "Unstake would release 0 RWT" },
  { code: 6007, name: "SlippageExceeded", msg: "Output below minimum (slippage protection)" },
  { code: 6008, name: "CooldownNotElapsed", msg: "Cooldown has not elapsed" },
  { code: 6009, name: "TicketOwnerMismatch", msg: "Ticket owner does not match signer" },
  { code: 6010, name: "InvalidRwtMint", msg: "rwt_mint does not match the canonical earn-RWT mint" },
  { code: 6011, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6012, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6013, name: "SelfTransfer", msg: "Cannot transfer authority to self" },
  { code: 6014, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6015, name: "InvalidTokenAccount", msg: "Invalid token account" },
  { code: 6016, name: "ZeroAddress", msg: "Address cannot be zero" },
];

/**
 * Decode a numeric error code (or a Solana RPC error) into a typed
 * `ArlexProgramError`. Returns `null` when no recognizable code is found.
 */
export function decodeProgramError(input: number | unknown): ArlexProgramError | null {
  let code: number | null;
  if (typeof input === 'number') {
    code = input;
  } else {
    code = extractErrorCode(input);
  }
  if (code === null) return null;
  return decodeError(code, ProgramErrors);
}
