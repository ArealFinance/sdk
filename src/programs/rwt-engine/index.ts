// Re-exports from generated codegen output.
// Files are produced by `npm run codegen` (scripts/codegen.mjs).
export * from './accounts.generated.js';
export * from './instructions.generated.js';
export * from './defined-types.generated.js';
export * from './errors.generated.js';

// Hand-written quote helper (mirrors on-chain mint_rwt.rs + nav.rs).
export {
  quoteMintRwt,
  applyMintSlippage,
  // Public NAV constants — mirror `contracts/rwt-engine/src/constants.rs`.
  // INITIAL_NAV is the bootstrap NAV used when the vault has zero supply;
  // NAV_SCALE is the 6-decimal fixed-point scale that matches RWT decimals.
  INITIAL_NAV,
  NAV_SCALE,
  type MintQuoteResult,
  type MintQuoteOutcome,
  type MintQuoteError,
  type MintQuoteFees,
  type QuoteMintRwtArgs,
} from './quote.js';
