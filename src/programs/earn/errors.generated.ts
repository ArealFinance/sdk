// AUTO-GENERATED — DO NOT EDIT
// IDL: earn v0.1.0
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
  /** Earn program is paused */
  EarnPaused = 6002,
  /** Amount must be > 0 */
  ZeroAmount = 6003,
  /** Deposit below minimum */
  BelowMinMint = 6004,
  /** min_rwt_out must be > 0 */
  ZeroSlippage = 6005,
  /** Output below min_rwt_out (slippage protection) */
  SlippageExceeded = 6006,
  /** Mint would produce 0 RWT (deposit too small for current NAV) */
  ZeroRwtOutput = 6007,
  /** Arithmetic overflow */
  MathOverflow = 6008,
  /** Writedown would reduce capital below floor */
  InsufficientCapital = 6009,
  /** Invalid token account */
  InvalidTokenAccount = 6010,
  /** RWT mint does not match config.rwt_mint */
  InvalidRwtMint = 6011,
  /** Destination address cannot be zero */
  ZeroDestination = 6012,
  /** Pause authority cannot be zero address */
  InvalidPauseAuthority = 6013,
  /** Fee destination cannot be zero address */
  InvalidFeeDestination = 6014,
  /** No pending authority transfer */
  NoPendingAuthority = 6015,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6016,
  /** Cannot transfer authority to yourself */
  SelfTransfer = 6017,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "UnauthorizedPause", msg: "Signer is not the pause authority" },
  { code: 6002, name: "EarnPaused", msg: "Earn program is paused" },
  { code: 6003, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6004, name: "BelowMinMint", msg: "Deposit below minimum" },
  { code: 6005, name: "ZeroSlippage", msg: "min_rwt_out must be > 0" },
  { code: 6006, name: "SlippageExceeded", msg: "Output below min_rwt_out (slippage protection)" },
  { code: 6007, name: "ZeroRwtOutput", msg: "Mint would produce 0 RWT (deposit too small for current NAV)" },
  { code: 6008, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6009, name: "InsufficientCapital", msg: "Writedown would reduce capital below floor" },
  { code: 6010, name: "InvalidTokenAccount", msg: "Invalid token account" },
  { code: 6011, name: "InvalidRwtMint", msg: "RWT mint does not match config.rwt_mint" },
  { code: 6012, name: "ZeroDestination", msg: "Destination address cannot be zero" },
  { code: 6013, name: "InvalidPauseAuthority", msg: "Pause authority cannot be zero address" },
  { code: 6014, name: "InvalidFeeDestination", msg: "Fee destination cannot be zero address" },
  { code: 6015, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6016, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6017, name: "SelfTransfer", msg: "Cannot transfer authority to yourself" },
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
