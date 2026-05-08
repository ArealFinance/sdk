// Public type surface for `@areal/sdk/markets-rest`.
//
// Phase 12.3.2 — typed clients for the Phase 12.3.1 backend REST endpoints
// under `/markets/*`. Backend already emits camelCase (the DTOs are
// TS-shaped), so the SDK mappers preserve field names verbatim and only
// guard types / coerce nullable holes (`undefined` → `null`).
//
// PAGINATION — `/markets/pools/:pool/snapshots` is **time-window paginated**
// (NOT cursor-paginated like `/transactions`). Callers pass `from`/`to`/`limit`
// against `block_time` (unix seconds); the response is a single ordered page.
//
// The wire shapes mirror the backend DTOs verbatim:
//   - SnapshotRowDto         (backend/src/modules/markets/dto/snapshot-row.dto.ts)
//   - DailyAggregateDto      (backend/src/modules/markets/dto/daily-aggregate.dto.ts)
//   - ProtocolSummaryDto     (backend/src/modules/markets/dto/protocol-summary.dto.ts)

import type { ClusterName } from '../network/clusters.js';

/**
 * A single row from `GET /markets/pools/:pool/snapshots`.
 *
 * - Decimal-string fields (`tvlA`, `tvlB`, `reserveA`, `reserveB`,
 *   `feeGrowthA`, `feeGrowthB`, `lpSupply`) are `numeric(40,0)` on the DB
 *   side and emitted as strings so JS callers past 2^53 stay precision-safe.
 * - `tvlUsd` is a JS `number | null` — USD-denominated TVL, `null` when
 *   neither side is priceable.
 * - `blockTime` is unix SECONDS (chain block_time semantics).
 *
 * Note: the backend entity also persists `priceAUsdc`, `priceBUsdc`,
 * `decimalsA`, `decimalsB` (migration 0006), but those columns are NOT
 * exposed by the `/markets/pools/:pool/snapshots` REST mapper — the SDK
 * type intentionally matches the wire shape, not the DB shape.
 */
export interface SnapshotRow {
  /** Pool PDA (base58). */
  pool: string;
  /** Unix seconds at snapshot time. */
  blockTime: number;
  /** Decimal string — per-side TVL in token base units (mirrors `reserveA`). */
  tvlA: string;
  /** Decimal string — per-side TVL in token base units (mirrors `reserveB`). */
  tvlB: string;
  /** USDC-denominated TVL. `null` when neither side is priceable. */
  tvlUsd: number | null;
  /** Decimal string — on-chain reserve A at snapshot time. */
  reserveA: string;
  /** Decimal string — on-chain reserve B at snapshot time. */
  reserveB: string;
  /** Decimal string — `cumulativeFeesPerShareA` (q64.64 stringified). */
  feeGrowthA: string;
  /** Decimal string — `cumulativeFeesPerShareB` (q64.64 stringified). */
  feeGrowthB: string;
  /** Decimal string — `totalLpShares`. */
  lpSupply: string;
}

/**
 * A single row from `GET /markets/pools/:pool/aggregate`.
 *
 * `day` is an ISO 8601 calendar date (`YYYY-MM-DD`, UTC bucket) — kept as a
 * `string`, NOT parsed into `Date`, so it stays a stable axis key for chart
 * libraries. Volumes/fees are decimal strings; counts and APY are JS numbers.
 *
 * `apy24h` is a USD-derived ratio (1.0 = 100%) computed by the 5min rollup
 * from the latest snapshot's captured prices/decimals. `null` when prices
 * are unresolvable OR when `tvl_usd` is `null`/non-positive.
 */
export interface DailyAggregateRow {
  /** Pool PDA (base58). */
  pool: string;
  /** UTC day bucket (`YYYY-MM-DD`). */
  day: string;
  /** Decimal string — 24h volume of side A in base units. */
  volumeA24h: string;
  /** Decimal string — 24h volume of side B in base units. */
  volumeB24h: string;
  /** Decimal string — 24h fees on side A in base units. */
  feesA24h: string;
  /** Decimal string — 24h fees on side B in base units. */
  feesB24h: string;
  /** Distinct tx count over the 24h window. */
  txCount24h: number;
  /** Distinct wallet count over the 24h window. */
  uniqueWallets24h: number;
  /** USD-derived APY ratio (1.0 = 100%). `null` when unresolvable. */
  apy24h: number | null;
  /** ISO 8601 timestamp at last refresh. */
  updatedAt: string;
}

/**
 * Response shape of `GET /markets/summary`.
 *
 * Singleton — there is exactly one `protocol_summary` row in the backend
 * and the endpoint surfaces it directly. `404` from this endpoint surfaces
 * as `MarketsFetchError(status=404)` because the migration seeds the row,
 * so a missing row indicates ops drift.
 */
export interface ProtocolSummary {
  /** Protocol-wide TVL in USD. */
  totalTvlUsd: number;
  /** Protocol-wide 24h volume in USD. */
  volume24hUsd: number;
  /** Distinct tx count across all pools over the 24h window. */
  txCount24h: number;
  /** Distinct wallets active across the protocol over the 24h window. */
  activeWallets24h: number;
  /** Number of pools indexed. */
  poolCount: number;
  /**
   * Distinct primary_actor over the full event history of `RevenueDistributed`
   * — cumulative-since-deploy, not current-state.
   */
  cumulativeDistributorCount: number;
  /** Unix seconds at last refresh. */
  blockTime: number;
  /** ISO 8601 timestamp at last refresh. */
  updatedAt: string;
}

/**
 * Common options threaded through every markets-rest call.
 *
 * Either `baseUrl` or `cluster` must resolve to a non-empty URL, otherwise
 * the call throws `TypeError` before doing any work. `fetch` is exposed so
 * unit tests can inject a mock; in production the global `fetch` is used.
 *
 * Same shape as `HistoryClientOptions` so consumers can reuse the same
 * config across both subpaths.
 */
export interface MarketsClientOptions {
  /** Explicit backend URL — wins over `cluster`. */
  baseUrl?: string;
  /** Falls back to `BACKEND_API_BASE_URLS[cluster]` (same backend deployment). */
  cluster?: ClusterName;
  /** Injected fetch for tests. Defaults to global `fetch`. */
  fetch?: typeof fetch;
  /** Forwarded to the underlying fetch — caller-controlled cancellation. */
  signal?: AbortSignal;
}
