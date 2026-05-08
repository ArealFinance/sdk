// Public type surface for `@areal/sdk/history`.
//
// Phase 12.2.2 — typed clients for the Phase 12.2.1 backend REST endpoints
// (`/transactions`, `/portfolio/:wallet/claims`, `/portfolio/:wallet/lp-positions`).
// Rows are returned in camelCase — the wire format from the backend is
// snake_case and the client maps at the boundary so consumers never see a
// mixed-case object.
//
// CURSOR FORMAT IS OPAQUE. The backend currently encodes
// `(block_time, signature, log_index)` into a base64url string but reserves
// the right to swap that encoding (compress, sign, etc.) without an SDK
// major bump. Treat `Cursor` purely as an identifier you forward back to
// `before=`. Do not parse it, decode it, or rely on its length.

import type { ClusterName } from '../network/clusters.js';

/**
 * All transaction kinds emitted by the backend `/transactions` endpoint.
 *
 * Mirrors the `kind` discriminator on `TransactionRow` and the same set
 * accepted by the `?kind=` filter query. Kept as a literal union so the
 * compiler can narrow on `row.kind` without a runtime guard.
 */
export type HistoryKind =
  | 'claim'
  | 'swap'
  | 'add_lp'
  | 'remove_lp'
  | 'zap_lp'
  | 'mint_rwt';

/**
 * Subset of `HistoryKind` returned by `/portfolio/:wallet/lp-positions`.
 * Useful when the consumer wants compile-time narrowing on LP-only flows.
 */
export type LpHistoryKind = 'add_lp' | 'remove_lp' | 'zap_lp';

/**
 * Branded opaque cursor. Constructed by the client from the server's
 * `nextCursor` string and forwarded as-is to the next `before=` query —
 * SDK consumers should never build one by hand.
 */
export type Cursor = string & { readonly __brand: 'HistoryCursor' };

/** A single row from `GET /transactions`. */
export interface TransactionRow {
  id: string;
  kind: HistoryKind;
  wallet: string;
  /** Present for OT-scoped events (claim, mint_rwt). null otherwise. */
  otMint: string | null;
  /** Present for pool-scoped events (swap, *_lp). null otherwise. */
  pool: string | null;
  /** Decimal string. null when the event has no `amount_a` semantic. */
  amountA: string | null;
  /** Decimal string. null when the event has no `amount_b` semantic. */
  amountB: string | null;
  /** Decimal string. null for non-LP events. */
  sharesDelta: string | null;
  signature: string;
  logIndex: number;
  /** Unix epoch milliseconds. */
  blockTime: number;
}

/** A single row from `GET /portfolio/:wallet/claims`. */
export interface ClaimHistoryRow {
  id: string;
  wallet: string;
  otMint: string;
  /** Decimal string — amount claimed in this event. */
  amount: string;
  /** Decimal string — running total claimed by this wallet for this OT. */
  cumulativeClaimed: string;
  signature: string;
  logIndex: number;
  /** Unix epoch milliseconds. */
  blockTime: number;
}

/** A single row from `GET /portfolio/:wallet/lp-positions`. */
export interface LpPositionHistoryRow {
  id: string;
  wallet: string;
  pool: string;
  kind: LpHistoryKind;
  /** Decimal string. null when the event variant has no `amount_a`. */
  amountA: string | null;
  /** Decimal string. null when the event variant has no `amount_b`. */
  amountB: string | null;
  /** Decimal string — signed share delta (negative for remove_lp). */
  sharesDelta: string;
  signature: string;
  logIndex: number;
  /** Unix epoch milliseconds. */
  blockTime: number;
}

/** Generic page envelope for all three history endpoints. */
export interface HistoryPage<T> {
  items: T[];
  /** Forward to the next `before=` to paginate. null = no more pages. */
  nextCursor: Cursor | null;
}

/**
 * Common options threaded through every history client call.
 *
 * Either `baseUrl` or `cluster` must resolve to a non-empty URL, otherwise
 * the call throws `TypeError` before doing any work. `fetch` is exposed so
 * unit tests can inject a mock; in production the global `fetch` is used.
 */
export interface HistoryClientOptions {
  /** Explicit backend URL — wins over `cluster`. */
  baseUrl?: string;
  /** Falls back to `HISTORY_API_BASE_URLS[cluster]`. */
  cluster?: ClusterName;
  /** Injected fetch for tests. Defaults to global `fetch`. */
  fetch?: typeof fetch;
  /** Forwarded to the underlying fetch — caller-controlled cancellation. */
  signal?: AbortSignal;
}
