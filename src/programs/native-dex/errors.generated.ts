// AUTO-GENERATED — DO NOT EDIT
// IDL: native-dex v0.1.0
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
  /** Not DEX authority */
  Unauthorized = 6000,
  /** Not in pool creators whitelist */
  CreatorNotWhitelisted = 6001,
  /** Global DEX is paused */
  DexPaused = 6002,
  /** Pool is paused */
  PoolNotActive = 6003,
  /** Max 10 creators */
  WhitelistFull = 6004,
  /** token_a == token_b */
  IdenticalMints = 6005,
  /** Creator not found in whitelist */
  CreatorNotFound = 6006,
  /** Amount must be > 0 */
  ZeroAmount = 6007,
  /** Pool reserves empty */
  InsufficientLiquidity = 6008,
  /** LP has fewer shares than burn amount */
  InsufficientShares = 6009,
  /** First LP deposit too small (< MIN_LIQUIDITY) */
  InitialLiquidityTooSmall = 6010,
  /** Output below min_amount_out */
  SlippageExceeded = 6011,
  /** Swap would produce 0 output */
  ZeroOutput = 6012,
  /** Cannot swap with empty reserves */
  EmptyReserves = 6013,
  /** Arithmetic overflow */
  MathOverflow = 6014,
  /** base_fee_bps exceeds MAX_FEE_BPS */
  InvalidFee = 6015,
  /** lp_fee_share_bps exceeds 10,000 */
  InvalidFeeShare = 6016,
  /** Neither token is RWT_MINT */
  MissingRwtMint = 6017,
  /** token_a_mint >= token_b_mint (must be canonical order) */
  InvalidMintOrder = 6018,
  /** Vault account does not match pool_state vault */
  InvalidVault = 6019,
  /** OT Treasury PDA derivation or ownership mismatch */
  InvalidOtTreasuryDestination = 6020,
  /** Pool has OT fee but ot_treasury_fee_account not provided */
  MissingOtTreasuryAccount = 6021,
  /** OT treasury fee account does not match stored destination */
  OtTreasuryAccountMismatch = 6022,
  /** Cannot transfer authority to yourself */
  SelfTransfer = 6023,
  /** No pending authority transfer */
  NoPendingAuthority = 6024,
  /** Signer is not pending authority */
  InvalidPendingAuthority = 6025,
  /** Signer is not pause authority */
  UnauthorizedPause = 6026,
  /** Creator already in whitelist */
  CreatorAlreadyExists = 6027,
  /** Pause authority cannot be zero address */
  InvalidPauseAuthority = 6028,
  /** Fee destination cannot be zero address */
  InvalidFeeDestination = 6029,
  /** Address cannot be zero */
  ZeroAddress = 6030,
  /** Invalid token account */
  InvalidTokenAccount = 6031,
  /** bin_step_bps must be > 0 for concentrated pools */
  InvalidBinStep = 6032,
  /** Bin range out of BinArray bounds */
  InvalidBinRange = 6033,
  /** No liquidity in bins for swap */
  InsufficientBinLiquidity = 6034,
  /** Shift distance exceeds MAX_SHIFT_DISTANCE */
  ShiftTooLarge = 6035,
  /** New range must differ from current range */
  ShiftNoOp = 6036,
  /** Conservation invariant violated after shift */
  ConservationViolation = 6037,
  /** Pool type mismatch */
  InvalidPoolType = 6038,
  /** yd_program account does not match pinned YD_PROGRAM_ID */
  InvalidYdProgram = 6039,
  /** pool PDA does not match expected derivation */
  InvalidPoolPda = 6040,
  /** target_vault does not match pool.vault_a/b on the RWT side */
  InvalidTargetVault = 6041,
  /** neither token_a_mint nor token_b_mint is RWT_MINT */
  TargetVaultNotRwt = 6042,
  /** ot_mint does not match the pool's OT side mint */
  InvalidOtMint = 6043,
  /** Nexus is_active = false */
  NexusNotActive = 6044,
  /** Signer is not the Nexus manager */
  InvalidNexusManager = 6045,
  /** Nexus manager is the zero pubkey kill-switch */
  NexusManagerDisabled = 6046,
  /** nexus_deposit token_mint is not USDC_MINT or RWT_MINT */
  InvalidNexusToken = 6047,
  /** Withdraw amount exceeds (ATA balance - principal floor) profit */
  InsufficientNexusProfit = 6048,
  /** Nexus PDA not found in merkle tree or proof invalid */
  NexusClaimFailed = 6049,
  /** Nexus LP position is missing or owner mismatch */
  InvalidNexusLpPosition = 6050,
  /** nexus_record_deposit may only be invoked via CPI from Yield Distribution */
  NexusRecordDepositOnlyFromYd = 6051,
  /** LiquidityHolding PDA derivation does not match passed account */
  InvalidLiquidityHoldingPda = 6052,
  /** LpPosition.pool does not match the supplied pool_state */
  InvalidLpPosition = 6053,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Not DEX authority" },
  { code: 6001, name: "CreatorNotWhitelisted", msg: "Not in pool creators whitelist" },
  { code: 6002, name: "DexPaused", msg: "Global DEX is paused" },
  { code: 6003, name: "PoolNotActive", msg: "Pool is paused" },
  { code: 6004, name: "WhitelistFull", msg: "Max 10 creators" },
  { code: 6005, name: "IdenticalMints", msg: "token_a == token_b" },
  { code: 6006, name: "CreatorNotFound", msg: "Creator not found in whitelist" },
  { code: 6007, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6008, name: "InsufficientLiquidity", msg: "Pool reserves empty" },
  { code: 6009, name: "InsufficientShares", msg: "LP has fewer shares than burn amount" },
  { code: 6010, name: "InitialLiquidityTooSmall", msg: "First LP deposit too small (< MIN_LIQUIDITY)" },
  { code: 6011, name: "SlippageExceeded", msg: "Output below min_amount_out" },
  { code: 6012, name: "ZeroOutput", msg: "Swap would produce 0 output" },
  { code: 6013, name: "EmptyReserves", msg: "Cannot swap with empty reserves" },
  { code: 6014, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6015, name: "InvalidFee", msg: "base_fee_bps exceeds MAX_FEE_BPS" },
  { code: 6016, name: "InvalidFeeShare", msg: "lp_fee_share_bps exceeds 10,000" },
  { code: 6017, name: "MissingRwtMint", msg: "Neither token is RWT_MINT" },
  { code: 6018, name: "InvalidMintOrder", msg: "token_a_mint >= token_b_mint (must be canonical order)" },
  { code: 6019, name: "InvalidVault", msg: "Vault account does not match pool_state vault" },
  { code: 6020, name: "InvalidOtTreasuryDestination", msg: "OT Treasury PDA derivation or ownership mismatch" },
  { code: 6021, name: "MissingOtTreasuryAccount", msg: "Pool has OT fee but ot_treasury_fee_account not provided" },
  { code: 6022, name: "OtTreasuryAccountMismatch", msg: "OT treasury fee account does not match stored destination" },
  { code: 6023, name: "SelfTransfer", msg: "Cannot transfer authority to yourself" },
  { code: 6024, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6025, name: "InvalidPendingAuthority", msg: "Signer is not pending authority" },
  { code: 6026, name: "UnauthorizedPause", msg: "Signer is not pause authority" },
  { code: 6027, name: "CreatorAlreadyExists", msg: "Creator already in whitelist" },
  { code: 6028, name: "InvalidPauseAuthority", msg: "Pause authority cannot be zero address" },
  { code: 6029, name: "InvalidFeeDestination", msg: "Fee destination cannot be zero address" },
  { code: 6030, name: "ZeroAddress", msg: "Address cannot be zero" },
  { code: 6031, name: "InvalidTokenAccount", msg: "Invalid token account" },
  { code: 6032, name: "InvalidBinStep", msg: "bin_step_bps must be > 0 for concentrated pools" },
  { code: 6033, name: "InvalidBinRange", msg: "Bin range out of BinArray bounds" },
  { code: 6034, name: "InsufficientBinLiquidity", msg: "No liquidity in bins for swap" },
  { code: 6035, name: "ShiftTooLarge", msg: "Shift distance exceeds MAX_SHIFT_DISTANCE" },
  { code: 6036, name: "ShiftNoOp", msg: "New range must differ from current range" },
  { code: 6037, name: "ConservationViolation", msg: "Conservation invariant violated after shift" },
  { code: 6038, name: "InvalidPoolType", msg: "Pool type mismatch" },
  { code: 6039, name: "InvalidYdProgram", msg: "yd_program account does not match pinned YD_PROGRAM_ID" },
  { code: 6040, name: "InvalidPoolPda", msg: "pool PDA does not match expected derivation" },
  { code: 6041, name: "InvalidTargetVault", msg: "target_vault does not match pool.vault_a/b on the RWT side" },
  { code: 6042, name: "TargetVaultNotRwt", msg: "neither token_a_mint nor token_b_mint is RWT_MINT" },
  { code: 6043, name: "InvalidOtMint", msg: "ot_mint does not match the pool's OT side mint" },
  { code: 6044, name: "NexusNotActive", msg: "Nexus is_active = false" },
  { code: 6045, name: "InvalidNexusManager", msg: "Signer is not the Nexus manager" },
  { code: 6046, name: "NexusManagerDisabled", msg: "Nexus manager is the zero pubkey kill-switch" },
  { code: 6047, name: "InvalidNexusToken", msg: "nexus_deposit token_mint is not USDC_MINT or RWT_MINT" },
  { code: 6048, name: "InsufficientNexusProfit", msg: "Withdraw amount exceeds (ATA balance - principal floor) profit" },
  { code: 6049, name: "NexusClaimFailed", msg: "Nexus PDA not found in merkle tree or proof invalid" },
  { code: 6050, name: "InvalidNexusLpPosition", msg: "Nexus LP position is missing or owner mismatch" },
  { code: 6051, name: "NexusRecordDepositOnlyFromYd", msg: "nexus_record_deposit may only be invoked via CPI from Yield Distribution" },
  { code: 6052, name: "InvalidLiquidityHoldingPda", msg: "LiquidityHolding PDA derivation does not match passed account" },
  { code: 6053, name: "InvalidLpPosition", msg: "LpPosition.pool does not match the supplied pool_state" },
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
