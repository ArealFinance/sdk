// Public surface for `@areal/sdk/markets`.
//
// Subpath-only export — NOT re-exported from the flat root aggregator
// (consumers opt in via `import { ... } from '@areal/sdk/markets'`).

export * from './types.js';
export {
  enumeratePools,
  POOL_STATE_SIZE,
} from './enumerate-pools.js';
export {
  spotPriceA,
  chainPriceToUsdc,
  poolTvlUsdc,
} from './pricing.js';
export { computeDepth, type ComputeDepthArgs } from './depth.js';
export {
  getMarketsSnapshot,
  type GetMarketsSnapshotOptions,
} from './snapshot.js';
