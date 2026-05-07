// AUTO-GENERATED — DO NOT EDIT
// IDL: futarchy v0.1.0
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
  /** Governance is not active */
  GovernancePaused = 6001,
  /** Proposal status is not Active */
  ProposalNotActive = 6002,
  /** Proposal status is not Approved */
  ProposalNotApproved = 6003,
  /** Proposal has already been executed */
  AlreadyExecuted = 6004,
  /** Unknown proposal type */
  InvalidProposalType = 6005,
  /** Arithmetic overflow */
  MathOverflow = 6006,
  /** Cannot transfer authority to yourself */
  SelfTransfer = 6007,
  /** No pending authority transfer */
  NoPendingAuthority = 6008,
  /** Signer is not the pending authority */
  InvalidPendingAuthority = 6009,
  /** Amount must be > 0 */
  ZeroAmount = 6010,
  /** Destination cannot be zero address */
  ZeroDestination = 6011,
  /** Params hash cannot be all zeros */
  EmptyParamsHash = 6012,
  /** Hash of provided destinations does not match proposal params_hash */
  ParamsHashMismatch = 6013,
  /** Executor account does not match proposal destination */
  DestinationMismatch = 6014,
  /** Token mint does not match proposal token_mint */
  TokenMintMismatch = 6015,
  /** OT governance pending_authority does not match this Futarchy config */
  GovernanceClaimMismatch = 6016,
  /** OT program account does not match OT_PROGRAM_ID */
  InvalidOtProgram = 6017,
  /** OT governance PDA derivation mismatch */
  InvalidOtGovernance = 6018,
  /** Proposal does not belong to this Futarchy config */
  ProposalConfigMismatch = 6019,
  /** OT mint account does not match config ot_mint */
  OtMintMismatch = 6020,
  /** Futarchy config PDA seeds do not match */
  InvalidFutarchyConfig = 6021,
  /** Proposal PDA seeds do not match */
  InvalidProposal = 6022,
  /** New authority cannot be zero address */
  ZeroAuthority = 6023,
}

/** Full IDL error list — code, name, message. */
export const ProgramErrors: IdlError[] = [
  { code: 6000, name: "Unauthorized", msg: "Signer is not the authority" },
  { code: 6001, name: "GovernancePaused", msg: "Governance is not active" },
  { code: 6002, name: "ProposalNotActive", msg: "Proposal status is not Active" },
  { code: 6003, name: "ProposalNotApproved", msg: "Proposal status is not Approved" },
  { code: 6004, name: "AlreadyExecuted", msg: "Proposal has already been executed" },
  { code: 6005, name: "InvalidProposalType", msg: "Unknown proposal type" },
  { code: 6006, name: "MathOverflow", msg: "Arithmetic overflow" },
  { code: 6007, name: "SelfTransfer", msg: "Cannot transfer authority to yourself" },
  { code: 6008, name: "NoPendingAuthority", msg: "No pending authority transfer" },
  { code: 6009, name: "InvalidPendingAuthority", msg: "Signer is not the pending authority" },
  { code: 6010, name: "ZeroAmount", msg: "Amount must be > 0" },
  { code: 6011, name: "ZeroDestination", msg: "Destination cannot be zero address" },
  { code: 6012, name: "EmptyParamsHash", msg: "Params hash cannot be all zeros" },
  { code: 6013, name: "ParamsHashMismatch", msg: "Hash of provided destinations does not match proposal params_hash" },
  { code: 6014, name: "DestinationMismatch", msg: "Executor account does not match proposal destination" },
  { code: 6015, name: "TokenMintMismatch", msg: "Token mint does not match proposal token_mint" },
  { code: 6016, name: "GovernanceClaimMismatch", msg: "OT governance pending_authority does not match this Futarchy config" },
  { code: 6017, name: "InvalidOtProgram", msg: "OT program account does not match OT_PROGRAM_ID" },
  { code: 6018, name: "InvalidOtGovernance", msg: "OT governance PDA derivation mismatch" },
  { code: 6019, name: "ProposalConfigMismatch", msg: "Proposal does not belong to this Futarchy config" },
  { code: 6020, name: "OtMintMismatch", msg: "OT mint account does not match config ot_mint" },
  { code: 6021, name: "InvalidFutarchyConfig", msg: "Futarchy config PDA seeds do not match" },
  { code: 6022, name: "InvalidProposal", msg: "Proposal PDA seeds do not match" },
  { code: 6023, name: "ZeroAuthority", msg: "New authority cannot be zero address" },
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
