// AUTO-GENERATED — DO NOT EDIT
// IDL: staking v0.1.2
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
  /** Signer is not the reward depositor */
  UnauthorizedRewardDepositor = 6001,
  /** Stake below minimum */
  BelowMinStake = 6002,
  /** Stake would mint 0 stRWT */
  ZeroStrwtOutput = 6003,
  /** Unstake would release 0 RWT */
  ZeroRwtOutput = 6004,
  /** Output below minimum (slippage protection) */
  SlippageExceeded = 6005,
  /** Cooldown has not elapsed */
  CooldownNotElapsed = 6006,
  /** Ticket owner does not match signer */
  TicketOwnerMismatch = 6007,
  /** rwt_mint does not match the canonical earn-RWT mint */
  InvalidRwtMint = 6008,
  /** No pending authority transfer */
  NoPendingAuthority = 6009,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6010,
  /** Cannot transfer authority to self */
  SelfTransfer = 6011,
  /** Arithmetic overflow */
  MathOverflow = 6012,
  /** Invalid token account */
  InvalidTokenAccount = 6013,
  /** Address cannot be zero */
  ZeroAddress = 6014,
  /** Signer is not the bootstrap authority */
  UnauthorizedBootstrap = 6015,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "UnauthorizedRewardDepositor", msg: "Signer is not the reward depositor" },
  { code: 6002, name: "BelowMinStake", msg: "Stake below minimum" },
  { code: 6003, name: "ZeroStrwtOutput", msg: "Stake would mint 0 stRWT" },
  { code: 6004, name: "ZeroRwtOutput", msg: "Unstake would release 0 RWT" },
  { code: 6005, name: "SlippageExceeded", msg: "Output below minimum (slippage protection)" },
  { code: 6006, name: "CooldownNotElapsed", msg: "Cooldown has not elapsed" },
  { code: 6007, name: "TicketOwnerMismatch", msg: "Ticket owner does not match signer" },
  { code: 6008, name: "InvalidRwtMint", msg: "rwt_mint does not match the canonical earn-RWT mint" },
  { code: 6009, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6010, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6011, name: "SelfTransfer", msg: "Cannot transfer authority to self" },
  { code: 6012, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6013, name: "InvalidTokenAccount", msg: "Invalid token account" },
  { code: 6014, name: "ZeroAddress", msg: "Address cannot be zero" },
  { code: 6015, name: "UnauthorizedBootstrap", msg: "Signer is not the bootstrap authority" },
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
