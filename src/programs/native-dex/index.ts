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
  type QuoteRoute,
  type QuoteSwapArgs,
  type MasterPoolQuoteContext,
} from './quote.js';

// Ergonomic wrapper that fetches + parses PoolState/DexConfig and delegates
// to quoteSwap. Useful when the caller has just a pool address.
export {
  simulateSwap,
  type SwapSide,
  type SimulateSwapOptions,
} from './simulate.js';

// Pure off-chain LP math helpers (mirrors amm.rs::calculate_lp_shares +
// calculate_remove_amounts). Phase 11 SDK F-LP-1.
export {
  quoteLpShares,
  quoteLpRemove,
  bigintIsqrt,
  LP_MIN_LIQUIDITY,
  type LpAddInputs,
  type LpAddQuote,
  type LpRemoveInputs,
  type LpRemoveQuote,
} from './lp-quote.js';

// CP-12.5: typed kill-switch sentinels (mirrors contracts/native-dex/src/constants.rs).
export {
  REBALANCER_KILL_SWITCH,
  NEXUS_MANAGER_KILL_SWITCH,
} from './constants.js';
