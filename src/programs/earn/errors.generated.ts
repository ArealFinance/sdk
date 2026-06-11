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
  /** Signer is not the bootstrap authority */
  UnauthorizedBootstrap = 6002,
  /** Earn program is paused */
  EarnPaused = 6003,
  /** RWT supply must be non-zero */
  NoRwtSupply = 6004,
  /** Amount must be > 0 */
  ZeroAmount = 6005,
  /** Deposit below minimum */
  BelowMinMint = 6006,
  /** mint_fee_bps exceeds the maximum */
  FeeTooHigh = 6007,
  /** min_mint_amount exceeds the maximum */
  MinMintTooHigh = 6008,
  /** min_rwt_out must be > 0 */
  ZeroSlippage = 6009,
  /** Output below min_rwt_out (slippage protection) */
  SlippageExceeded = 6010,
  /** Mint would produce 0 RWT (deposit too small for current NAV) */
  ZeroRwtOutput = 6011,
  /** Arithmetic overflow */
  MathOverflow = 6012,
  /** Writedown would reduce capital below floor */
  InsufficientCapital = 6013,
  /** Invalid token account */
  InvalidTokenAccount = 6014,
  /** RWT mint does not match config.rwt_mint */
  InvalidRwtMint = 6015,
  /** RWT mint authority must be the EarnConfig PDA */
  InvalidMintAuthority = 6016,
  /** RWT mint supply must be zero at initialize */
  InvalidMintSupply = 6017,
  /** RWT mint decimals mismatch */
  InvalidMintDecimals = 6018,
  /** RWT mint freeze authority must be unset */
  InvalidFreezeAuthority = 6019,
  /** Token account owner mismatch */
  InvalidTokenOwner = 6020,
  /** Destination address cannot be zero */
  ZeroDestination = 6021,
  /** Pause authority cannot be zero address */
  InvalidPauseAuthority = 6022,
  /** Fee destination cannot be zero address */
  InvalidFeeDestination = 6023,
  /** No pending authority transfer */
  NoPendingAuthority = 6024,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6025,
  /** Cannot transfer authority to yourself */
  SelfTransfer = 6026,
  /** Fee destination cannot be the basket vault */
  FeeDestinationIsBasketVault = 6027,
  /** Duplicate pause authority */
  DuplicatePauseAuthority = 6028,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "UnauthorizedPause", msg: "Signer is not the pause authority" },
  { code: 6002, name: "UnauthorizedBootstrap", msg: "Signer is not the bootstrap authority" },
  { code: 6003, name: "EarnPaused", msg: "Earn program is paused" },
  { code: 6004, name: "NoRwtSupply", msg: "RWT supply must be non-zero" },
  { code: 6005, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6006, name: "BelowMinMint", msg: "Deposit below minimum" },
  { code: 6007, name: "FeeTooHigh", msg: "mint_fee_bps exceeds the maximum" },
  { code: 6008, name: "MinMintTooHigh", msg: "min_mint_amount exceeds the maximum" },
  { code: 6009, name: "ZeroSlippage", msg: "min_rwt_out must be > 0" },
  { code: 6010, name: "SlippageExceeded", msg: "Output below min_rwt_out (slippage protection)" },
  { code: 6011, name: "ZeroRwtOutput", msg: "Mint would produce 0 RWT (deposit too small for current NAV)" },
  { code: 6012, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6013, name: "InsufficientCapital", msg: "Writedown would reduce capital below floor" },
  { code: 6014, name: "InvalidTokenAccount", msg: "Invalid token account" },
  { code: 6015, name: "InvalidRwtMint", msg: "RWT mint does not match config.rwt_mint" },
  { code: 6016, name: "InvalidMintAuthority", msg: "RWT mint authority must be the EarnConfig PDA" },
  { code: 6017, name: "InvalidMintSupply", msg: "RWT mint supply must be zero at initialize" },
  { code: 6018, name: "InvalidMintDecimals", msg: "RWT mint decimals mismatch" },
  { code: 6019, name: "InvalidFreezeAuthority", msg: "RWT mint freeze authority must be unset" },
  { code: 6020, name: "InvalidTokenOwner", msg: "Token account owner mismatch" },
  { code: 6021, name: "ZeroDestination", msg: "Destination address cannot be zero" },
  { code: 6022, name: "InvalidPauseAuthority", msg: "Pause authority cannot be zero address" },
  { code: 6023, name: "InvalidFeeDestination", msg: "Fee destination cannot be zero address" },
  { code: 6024, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6025, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6026, name: "SelfTransfer", msg: "Cannot transfer authority to yourself" },
  { code: 6027, name: "FeeDestinationIsBasketVault", msg: "Fee destination cannot be the basket vault" },
  { code: 6028, name: "DuplicatePauseAuthority", msg: "Duplicate pause authority" },
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
