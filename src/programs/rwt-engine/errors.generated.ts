// AUTO-GENERATED — DO NOT EDIT
// IDL: rwt_engine v0.1.0
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
  /** Signer is not the manager */
  UnauthorizedManager = 6001,
  /** Signer is not the pause authority */
  UnauthorizedPause = 6002,
  /** Minting is paused */
  MintPaused = 6003,
  /** Amount must be > 0 */
  ZeroAmount = 6004,
  /** Backing capital must be > 0 */
  ZeroBackingCapital = 6005,
  /** min_amount_out must be > 0 */
  ZeroSlippage = 6006,
  /** Deposit below minimum ($1) */
  BelowMinMint = 6007,
  /** Arithmetic overflow */
  MathOverflow = 6008,
  /** Writedown would reduce capital below floor */
  InsufficientCapital = 6009,
  /** Distribution ratios don't sum to 10,000 */
  InvalidDistributionRatios = 6010,
  /** Cannot transfer authority to yourself */
  SelfTransfer = 6011,
  /** No pending authority transfer */
  NoPendingAuthority = 6012,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6013,
  /** Mint would produce 0 RWT (deposit too small for current NAV) */
  ZeroRwtOutput = 6014,
  /** Pause authority cannot be zero address */
  InvalidPauseAuthority = 6015,
  /** Fee destination cannot be zero address */
  InvalidFeeDestination = 6016,
  /** Invalid token account */
  InvalidTokenAccount = 6017,
  /** Output below minimum (slippage protection) */
  SlippageExceeded = 6018,
  /** Destination address cannot be zero */
  ZeroDestination = 6019,
  /** DEX program account does not match DEX_PROGRAM_ID */
  InvalidDexProgram = 6020,
  /** Vault token account not owned by vault PDA */
  InvalidVaultTokenOwner = 6021,
  /** Manager wallet not set (zero address) */
  ManagerDisabled = 6022,
  /** Input and output token accounts must be different */
  SameTokenAccount = 6023,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "UnauthorizedManager", msg: "Signer is not the manager" },
  { code: 6002, name: "UnauthorizedPause", msg: "Signer is not the pause authority" },
  { code: 6003, name: "MintPaused", msg: "Minting is paused" },
  { code: 6004, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6005, name: "ZeroBackingCapital", msg: "Backing capital must be > 0" },
  { code: 6006, name: "ZeroSlippage", msg: "min_amount_out must be > 0" },
  { code: 6007, name: "BelowMinMint", msg: "Deposit below minimum ($1)" },
  { code: 6008, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6009, name: "InsufficientCapital", msg: "Writedown would reduce capital below floor" },
  { code: 6010, name: "InvalidDistributionRatios", msg: "Distribution ratios don't sum to 10,000" },
  { code: 6011, name: "SelfTransfer", msg: "Cannot transfer authority to yourself" },
  { code: 6012, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6013, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6014, name: "ZeroRwtOutput", msg: "Mint would produce 0 RWT (deposit too small for current NAV)" },
  { code: 6015, name: "InvalidPauseAuthority", msg: "Pause authority cannot be zero address" },
  { code: 6016, name: "InvalidFeeDestination", msg: "Fee destination cannot be zero address" },
  { code: 6017, name: "InvalidTokenAccount", msg: "Invalid token account" },
  { code: 6018, name: "SlippageExceeded", msg: "Output below minimum (slippage protection)" },
  { code: 6019, name: "ZeroDestination", msg: "Destination address cannot be zero" },
  { code: 6020, name: "InvalidDexProgram", msg: "DEX program account does not match DEX_PROGRAM_ID" },
  { code: 6021, name: "InvalidVaultTokenOwner", msg: "Vault token account not owned by vault PDA" },
  { code: 6022, name: "ManagerDisabled", msg: "Manager wallet not set (zero address)" },
  { code: 6023, name: "SameTokenAccount", msg: "Input and output token accounts must be different" },
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
