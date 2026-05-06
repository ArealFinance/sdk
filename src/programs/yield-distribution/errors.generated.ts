// AUTO-GENERATED — DO NOT EDIT
// IDL: yield_distribution v0.1.0
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
  /** Signer is not the publish authority */
  UnauthorizedPublisher = 6001,
  /** YD system is paused */
  SystemPaused = 6002,
  /** Distributor is not active */
  DistributorNotActive = 6003,
  /** Root not yet published (epoch == 0) */
  RootNotPublished = 6004,
  /** Merkle proof too long (max 20) */
  ProofTooLong = 6005,
  /** Merkle proof verification failed */
  InvalidProof = 6006,
  /** max_total_claim must equal total_funded */
  InvalidMaxClaim = 6007,
  /** max_total_claim must be > 0 */
  ZeroMaxClaim = 6008,
  /** max_total_claim below total_claimed */
  MaxClaimBelowClaimed = 6009,
  /** Total claimed would exceed max_total_claim */
  ExceedsMaxClaim = 6010,
  /** Amount must be > 0 */
  ZeroAmount = 6011,
  /** Amount below minimum distribution */
  BelowMinDistribution = 6012,
  /** Vesting period must be > 0 */
  InvalidVestingPeriod = 6013,
  /** Invalid token account or mint mismatch */
  InvalidTokenAccount = 6014,
  /** protocol_fee_bps must be <= 10_000 */
  InvalidFeeBps = 6015,
  /** ot_mint does not match distributor's expected ot_mint */
  InvalidOtMint = 6016,
  /** reward_vault does not match distributor.reward_vault */
  InvalidRewardVault = 6017,
  /** fee_account does not match config.areal_fee_destination */
  InvalidFeeAccount = 6018,
  /** ClaimStatus claimant/distributor mismatch (replay guard) */
  InvalidClaimStatus = 6019,
  /** claimant_token owner does not match claimant signer */
  InvalidClaimantTokenOwner = 6020,
  /** Arithmetic overflow */
  MathOverflow = 6021,
  /** Cannot transfer authority to yourself */
  SelfTransfer = 6022,
  /** No pending authority transfer */
  NoPendingAuthority = 6023,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6024,
  /** Destination address cannot be zero */
  ZeroDestination = 6025,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "UnauthorizedPublisher", msg: "Signer is not the publish authority" },
  { code: 6002, name: "SystemPaused", msg: "YD system is paused" },
  { code: 6003, name: "DistributorNotActive", msg: "Distributor is not active" },
  { code: 6004, name: "RootNotPublished", msg: "Root not yet published (epoch == 0)" },
  { code: 6005, name: "ProofTooLong", msg: "Merkle proof too long (max 20)" },
  { code: 6006, name: "InvalidProof", msg: "Merkle proof verification failed" },
  { code: 6007, name: "InvalidMaxClaim", msg: "max_total_claim must equal total_funded" },
  { code: 6008, name: "ZeroMaxClaim", msg: "max_total_claim must be > 0" },
  { code: 6009, name: "MaxClaimBelowClaimed", msg: "max_total_claim below total_claimed" },
  { code: 6010, name: "ExceedsMaxClaim", msg: "Total claimed would exceed max_total_claim" },
  { code: 6011, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6012, name: "BelowMinDistribution", msg: "Amount below minimum distribution" },
  { code: 6013, name: "InvalidVestingPeriod", msg: "Vesting period must be > 0" },
  { code: 6014, name: "InvalidTokenAccount", msg: "Invalid token account or mint mismatch" },
  { code: 6015, name: "InvalidFeeBps", msg: "protocol_fee_bps must be <= 10_000" },
  { code: 6016, name: "InvalidOtMint", msg: "ot_mint does not match distributor's expected ot_mint" },
  { code: 6017, name: "InvalidRewardVault", msg: "reward_vault does not match distributor.reward_vault" },
  { code: 6018, name: "InvalidFeeAccount", msg: "fee_account does not match config.areal_fee_destination" },
  { code: 6019, name: "InvalidClaimStatus", msg: "ClaimStatus claimant/distributor mismatch (replay guard)" },
  { code: 6020, name: "InvalidClaimantTokenOwner", msg: "claimant_token owner does not match claimant signer" },
  { code: 6021, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6022, name: "SelfTransfer", msg: "Cannot transfer authority to yourself" },
  { code: 6023, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6024, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6025, name: "ZeroDestination", msg: "Destination address cannot be zero" },
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
