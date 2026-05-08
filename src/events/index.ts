// Public surface of the `@areal/sdk/events` subpath.
//
// Re-exports:
//   - Decoder dispatchers (`decodeEvent`, `decodeTransactionEvents`).
//   - Per-program registries (`*_EVENTS`) for direct discriminator lookup.
//   - Typed wrapper interfaces for the top-N events used by indexers + UI.
//   - Public types (`DecodedEvent`, `EventDecoder`, `ProgramEventRegistry`,
//     `ProgramLabel`).

export type {
  DecodedEvent,
  EventDecoder,
  ProgramEventRegistry,
  ProgramLabel,
} from './types.js';

export {
  decodeEvent,
  decodeTransactionEvents,
  getAllRegistries,
} from './decoder.js';

// Per-program registries
export { YIELD_DISTRIBUTION_EVENTS } from './yield-distribution.js';
export { NATIVE_DEX_EVENTS } from './native-dex.js';
export { OWNERSHIP_TOKEN_EVENTS } from './ownership-token.js';
export { RWT_ENGINE_EVENTS } from './rwt-engine.js';
export { FUTARCHY_EVENTS } from './futarchy.js';

// Typed wrappers (top-N events)
export type {
  RewardsClaimed,
  RootPublished,
  DistributorFunded,
  StreamConverted,
} from './yield-distribution.js';
export type {
  SwapExecuted,
  LiquidityAdded,
  LiquidityRemoved,
  ZapLiquidityExecuted,
} from './native-dex.js';
export type { OtMinted, RevenueDistributed } from './ownership-token.js';
export type { RwtMinted } from './rwt-engine.js';
