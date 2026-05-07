// Re-exports from generated codegen output.
// Files are produced by `npm run codegen` (scripts/codegen.mjs).
export * from './accounts.generated.js';
export * from './instructions.generated.js';
export * from './defined-types.generated.js';
export * from './errors.generated.js';

// Hand-written quote helper (mirrors on-chain amm.rs + swap.rs::swap_internal).
export {
  quoteSwap,
  applySlippage,
  applySlippageU128,
  type QuoteResult,
  type QuoteOutcome,
  type QuoteError,
  type QuoteFees,
  type QuoteSwapArgs,
} from './quote.js';
