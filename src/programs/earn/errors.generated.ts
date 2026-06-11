// AUTO-GENERATED — DO NOT EDIT
// IDL: earn v0.1.2
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
  /** Signer is not the bootstrap authority */
  UnauthorizedBootstrap = 6001,
  /** RWT supply must be non-zero */
  NoRwtSupply = 6002,
  /** Amount must be > 0 */
  ZeroAmount = 6003,
  /** Deposit below minimum */
  BelowMinMint = 6004,
  /** mint_fee_bps exceeds the maximum */
  FeeTooHigh = 6005,
  /** min_mint_amount exceeds the maximum */
  MinMintTooHigh = 6006,
  /** min_rwt_out must be > 0 */
  ZeroSlippage = 6007,
  /** Output below min_rwt_out (slippage protection) */
  SlippageExceeded = 6008,
  /** Mint would produce 0 RWT (deposit too small for current NAV) */
  ZeroRwtOutput = 6009,
  /** Arithmetic overflow */
  MathOverflow = 6010,
  /** Writedown would reduce capital below floor */
  InsufficientCapital = 6011,
  /** Invalid token account */
  InvalidTokenAccount = 6012,
  /** RWT mint does not match config.rwt_mint */
  InvalidRwtMint = 6013,
  /** RWT mint authority must be the EarnConfig PDA */
  InvalidMintAuthority = 6014,
  /** RWT mint supply must be zero at initialize */
  InvalidMintSupply = 6015,
  /** RWT mint decimals mismatch */
  InvalidMintDecimals = 6016,
  /** RWT mint freeze authority must be unset */
  InvalidFreezeAuthority = 6017,
  /** Token account owner mismatch */
  InvalidTokenOwner = 6018,
  /** Destination address cannot be zero */
  ZeroDestination = 6019,
  /** Fee destination cannot be zero address */
  InvalidFeeDestination = 6020,
  /** No pending authority transfer */
  NoPendingAuthority = 6021,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6022,
  /** Cannot transfer authority to yourself */
  SelfTransfer = 6023,
  /** Fee destination cannot be the basket vault */
  FeeDestinationIsBasketVault = 6024,
  /** Basket vault is not configured */
  BasketVaultNotSet = 6025,
  /** Basket vault cannot be the zero address */
  ZeroBasketVault = 6026,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "UnauthorizedBootstrap", msg: "Signer is not the bootstrap authority" },
  { code: 6002, name: "NoRwtSupply", msg: "RWT supply must be non-zero" },
  { code: 6003, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6004, name: "BelowMinMint", msg: "Deposit below minimum" },
  { code: 6005, name: "FeeTooHigh", msg: "mint_fee_bps exceeds the maximum" },
  { code: 6006, name: "MinMintTooHigh", msg: "min_mint_amount exceeds the maximum" },
  { code: 6007, name: "ZeroSlippage", msg: "min_rwt_out must be > 0" },
  { code: 6008, name: "SlippageExceeded", msg: "Output below min_rwt_out (slippage protection)" },
  { code: 6009, name: "ZeroRwtOutput", msg: "Mint would produce 0 RWT (deposit too small for current NAV)" },
  { code: 6010, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6011, name: "InsufficientCapital", msg: "Writedown would reduce capital below floor" },
  { code: 6012, name: "InvalidTokenAccount", msg: "Invalid token account" },
  { code: 6013, name: "InvalidRwtMint", msg: "RWT mint does not match config.rwt_mint" },
  { code: 6014, name: "InvalidMintAuthority", msg: "RWT mint authority must be the EarnConfig PDA" },
  { code: 6015, name: "InvalidMintSupply", msg: "RWT mint supply must be zero at initialize" },
  { code: 6016, name: "InvalidMintDecimals", msg: "RWT mint decimals mismatch" },
  { code: 6017, name: "InvalidFreezeAuthority", msg: "RWT mint freeze authority must be unset" },
  { code: 6018, name: "InvalidTokenOwner", msg: "Token account owner mismatch" },
  { code: 6019, name: "ZeroDestination", msg: "Destination address cannot be zero" },
  { code: 6020, name: "InvalidFeeDestination", msg: "Fee destination cannot be zero address" },
  { code: 6021, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6022, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6023, name: "SelfTransfer", msg: "Cannot transfer authority to yourself" },
  { code: 6024, name: "FeeDestinationIsBasketVault", msg: "Fee destination cannot be the basket vault" },
  { code: 6025, name: "BasketVaultNotSet", msg: "Basket vault is not configured" },
  { code: 6026, name: "ZeroBasketVault", msg: "Basket vault cannot be the zero address" },
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
