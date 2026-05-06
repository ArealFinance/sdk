// AUTO-GENERATED — DO NOT EDIT
// IDL: ownership_token v0.1.0
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
  /** Signer is not the governance authority */
  Unauthorized = 6000,
  /** Amount must be > 0 */
  ZeroAmount = 6001,
  /** Destination allocations don't sum to 10,000 */
  InvalidBpsTotal = 6002,
  /** BPS not in range 1-10,000 */
  InvalidAllocationBps = 6003,
  /** Same address used twice in destinations */
  DuplicateDestination = 6004,
  /** Destination list is empty */
  EmptyDestinationList = 6005,
  /** More than 10 destinations */
  TooManyDestinations = 6006,
  /** ATA balance < minimum distribution amount */
  BelowMinDistribution = 6007,
  /** Less than 7 days since last distribution */
  DistributionCooldown = 6008,
  /** Distribution already in progress (reentrancy) */
  DistributionInProgress = 6009,
  /** Not enough remaining accounts for all destinations */
  InsufficientRemainingAccounts = 6010,
  /** Remaining account doesn't match destination address */
  DestinationAccountMismatch = 6011,
  /** Arithmetic overflow */
  MathOverflow = 6012,
  /** Mint supply must be 0 (fresh mint) */
  InvalidMintSupply = 6013,
  /** Mint authority must be deployer */
  InvalidMintAuthority = 6014,
  /** Freeze authority must be None */
  FreezeAuthoritySet = 6015,
  /** Token name is empty */
  InvalidName = 6016,
  /** Token symbol is empty */
  InvalidSymbol = 6017,
  /** Decimals must be 1-9 */
  InvalidDecimals = 6018,
  /** No pending authority transfer */
  NoPendingAuthority = 6019,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6020,
  /** Cannot transfer authority to yourself */
  AuthorityTransferToSelf = 6021,
  /** Destination address cannot be the fee destination */
  FeeDestinationCollision = 6022,
  /** Destination address cannot be zero */
  ZeroDestinationAddress = 6023,
  /** Active destinations BPS sum must be 10,000 */
  ActiveBpsSumMismatch = 6024,
  /** Governance is inactive */
  GovernanceInactive = 6025,
  /** Token account not owned by SPL Token Program */
  InvalidTokenAccountOwner = 6026,
  /** Token account mint mismatch */
  TokenMintMismatch = 6027,
  /** Areal fee account does not match revenue config */
  InvalidFeeAccount = 6028,
  /** Initial authority cannot be zero address */
  InvalidInitialAuthority = 6029,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the governance authority" },
  { code: 6001, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6002, name: "InvalidBpsTotal", msg: "Destination allocations don't sum to 10,000" },
  { code: 6003, name: "InvalidAllocationBps", msg: "BPS not in range 1-10,000" },
  { code: 6004, name: "DuplicateDestination", msg: "Same address used twice in destinations" },
  { code: 6005, name: "EmptyDestinationList", msg: "Destination list is empty" },
  { code: 6006, name: "TooManyDestinations", msg: "More than 10 destinations" },
  { code: 6007, name: "BelowMinDistribution", msg: "ATA balance < minimum distribution amount" },
  { code: 6008, name: "DistributionCooldown", msg: "Less than 7 days since last distribution" },
  { code: 6009, name: "DistributionInProgress", msg: "Distribution already in progress (reentrancy)" },
  { code: 6010, name: "InsufficientRemainingAccounts", msg: "Not enough remaining accounts for all destinations" },
  { code: 6011, name: "DestinationAccountMismatch", msg: "Remaining account doesn't match destination address" },
  { code: 6012, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6013, name: "InvalidMintSupply", msg: "Mint supply must be 0 (fresh mint)" },
  { code: 6014, name: "InvalidMintAuthority", msg: "Mint authority must be deployer" },
  { code: 6015, name: "FreezeAuthoritySet", msg: "Freeze authority must be None" },
  { code: 6016, name: "InvalidName", msg: "Token name is empty" },
  { code: 6017, name: "InvalidSymbol", msg: "Token symbol is empty" },
  { code: 6018, name: "InvalidDecimals", msg: "Decimals must be 1-9" },
  { code: 6019, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6020, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6021, name: "AuthorityTransferToSelf", msg: "Cannot transfer authority to yourself" },
  { code: 6022, name: "FeeDestinationCollision", msg: "Destination address cannot be the fee destination" },
  { code: 6023, name: "ZeroDestinationAddress", msg: "Destination address cannot be zero" },
  { code: 6024, name: "ActiveBpsSumMismatch", msg: "Active destinations BPS sum must be 10,000" },
  { code: 6025, name: "GovernanceInactive", msg: "Governance is inactive" },
  { code: 6026, name: "InvalidTokenAccountOwner", msg: "Token account not owned by SPL Token Program" },
  { code: 6027, name: "TokenMintMismatch", msg: "Token account mint mismatch" },
  { code: 6028, name: "InvalidFeeAccount", msg: "Areal fee account does not match revenue config" },
  { code: 6029, name: "InvalidInitialAuthority", msg: "Initial authority cannot be zero address" },
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
