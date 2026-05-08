// Typed clients for the Phase 12.3.1 markets backend (`api.areal.finance`).
//
// Three endpoints:
//   GET /markets/pools/:pool/snapshots   — time-window paginated snapshots
//   GET /markets/pools/:pool/aggregate   — daily aggregate window (last N days)
//   GET /markets/summary                 — protocol singleton
//
// Each function:
//   1. Validates inputs synchronously and throws `TypeError` BEFORE any
//      network call. Bad pool / bad limit / bad days / from > to / missing
//      baseUrl is a caller bug — early throw shortens the failure path and
//      keeps the network audit log clean.
//   2. Resolves `baseUrl` from explicit option, then per-cluster constant.
//      `HISTORY_API_BASE_URLS` is reused — same backend deployment serves
//      both `/transactions/*` and `/markets/*`. (Phase 12.3.3 follow-up:
//      consider renaming this constant to `BACKEND_API_BASE_URLS`.)
//   3. Builds a query string with single `encodeURIComponent`.
//   4. Wraps the underlying fetch so every non-2xx and every transport
//      failure surfaces as `MarketsFetchError` with `(status, url)`. The
//      response body is NOT included in `e.message` to avoid leaking nest
//      stack traces from a misconfigured backend.
//   5. Maps the wire payload to camelCase rows. The backend already emits
//      camelCase, so the mappers only validate types and normalise
//      `undefined` holes to `null` for nullable fields.

import { HISTORY_API_BASE_URLS } from '../network/constants.js';
import { MarketsFetchError } from './errors.js';
import type {
  DailyAggregateRow,
  MarketsClientOptions,
  ProtocolSummary,
  SnapshotRow,
} from './types.js';

/**
 * Solana base58 pubkey regex. Same shape used by the backend
 * `MarketsController.requirePubkey` guard.
 */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const MIN_SNAPSHOT_LIMIT = 1;
const MAX_SNAPSHOT_LIMIT = 200;
const DEFAULT_SNAPSHOT_LIMIT = 100;

const MIN_AGGREGATE_DAYS = 1;
const MAX_AGGREGATE_DAYS = 90;
const DEFAULT_AGGREGATE_DAYS = 7;

// ─────────────────────────── helpers ───────────────────────────

function assertBase58(label: string, value: string): void {
  if (typeof value !== 'string' || !BASE58_RE.test(value)) {
    throw new TypeError(`markets client: invalid ${label} (not a base58 address)`);
  }
}

function assertNonNegativeInt(label: string, value: number): void {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new TypeError(`markets client: ${label} must be a non-negative integer`);
  }
}

function assertSnapshotLimit(limit: number): void {
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < MIN_SNAPSHOT_LIMIT ||
    limit > MAX_SNAPSHOT_LIMIT
  ) {
    throw new TypeError(
      `markets client: limit must be an integer in [${MIN_SNAPSHOT_LIMIT}, ${MAX_SNAPSHOT_LIMIT}]`,
    );
  }
}

function assertAggregateDays(days: number): void {
  if (
    typeof days !== 'number' ||
    !Number.isInteger(days) ||
    days < MIN_AGGREGATE_DAYS ||
    days > MAX_AGGREGATE_DAYS
  ) {
    throw new TypeError(
      `markets client: days must be an integer in [${MIN_AGGREGATE_DAYS}, ${MAX_AGGREGATE_DAYS}]`,
    );
  }
}

function resolveBaseUrl(opts: MarketsClientOptions): string {
  if (opts.baseUrl !== undefined) {
    if (typeof opts.baseUrl !== 'string' || opts.baseUrl.length === 0) {
      throw new TypeError('markets client: baseUrl must be a non-empty string');
    }
    return opts.baseUrl.replace(/\/$/, '');
  }
  if (opts.cluster !== undefined) {
    const url = HISTORY_API_BASE_URLS[opts.cluster];
    if (!url) {
      throw new TypeError(`markets client: unknown cluster "${opts.cluster}"`);
    }
    return url.replace(/\/$/, '');
  }
  throw new TypeError('markets client: baseUrl or cluster required');
}

/** Append `key=value` (URL-encoded once) to a query parts array. */
function appendQuery(parts: string[], key: string, value: string): void {
  parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
}

/**
 * Shared GET helper. Issues a single request, surfaces transport and HTTP
 * errors as `MarketsFetchError`, and returns the parsed body for the
 * caller to map.
 */
async function requestJson<T>(url: string, opts: MarketsClientOptions): Promise<T> {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('markets client: no fetch implementation available');
  }

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new MarketsFetchError(`network error: ${msg}`, null, url);
  }

  if (!res.ok) {
    // Don't include response body in the message — a 500 from Nest may
    // include a stack trace. Status + URL are sufficient for callers.
    throw new MarketsFetchError(
      `markets backend returned ${res.status}`,
      res.status,
      url,
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new MarketsFetchError(`malformed JSON: ${msg}`, res.status, url);
  }

  if (!body || typeof body !== 'object') {
    throw new MarketsFetchError('malformed body: not an object', res.status, url);
  }
  return body as T;
}

// ─────────────────────────── row mappers ───────────────────────────

/** Pull a non-empty string field, default `''` when absent. */
function strField(r: Record<string, unknown>, key: string): string {
  return typeof r[key] === 'string' ? (r[key] as string) : '';
}

/** Pull a finite-number field, default `0` when absent. */
function numField(r: Record<string, unknown>, key: string): number {
  const v = r[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Pull a `number | null` field. Treats `undefined` as `null`. */
function numOrNullField(r: Record<string, unknown>, key: string): number | null {
  const v = r[key];
  if (v === null || v === undefined) return null;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function mapSnapshotRow(raw: unknown): SnapshotRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    pool: strField(r, 'pool'),
    blockTime: numField(r, 'blockTime'),
    tvlA: strField(r, 'tvlA'),
    tvlB: strField(r, 'tvlB'),
    tvlUsd: numOrNullField(r, 'tvlUsd'),
    reserveA: strField(r, 'reserveA'),
    reserveB: strField(r, 'reserveB'),
    feeGrowthA: strField(r, 'feeGrowthA'),
    feeGrowthB: strField(r, 'feeGrowthB'),
    lpSupply: strField(r, 'lpSupply'),
  };
}

function mapDailyAggregateRow(raw: unknown): DailyAggregateRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    pool: strField(r, 'pool'),
    day: strField(r, 'day'),
    volumeA24h: strField(r, 'volumeA24h'),
    volumeB24h: strField(r, 'volumeB24h'),
    feesA24h: strField(r, 'feesA24h'),
    feesB24h: strField(r, 'feesB24h'),
    txCount24h: numField(r, 'txCount24h'),
    uniqueWallets24h: numField(r, 'uniqueWallets24h'),
    apy24h: numOrNullField(r, 'apy24h'),
    updatedAt: strField(r, 'updatedAt'),
  };
}

function mapProtocolSummary(raw: unknown): ProtocolSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    totalTvlUsd: numField(r, 'totalTvlUsd'),
    volume24hUsd: numField(r, 'volume24hUsd'),
    txCount24h: numField(r, 'txCount24h'),
    activeWallets24h: numField(r, 'activeWallets24h'),
    poolCount: numField(r, 'poolCount'),
    cumulativeDistributorCount: numField(r, 'cumulativeDistributorCount'),
    blockTime: numField(r, 'blockTime'),
    updatedAt: strField(r, 'updatedAt'),
  };
}

// ─────────────────────────── public API ───────────────────────────

/**
 * Fetch a time-window page of pool snapshots, latest-first.
 *
 * Pagination is **time-window**, not cursor-based. Pass `from`/`to` (unix
 * seconds, inclusive) to bound the window, and `limit` to cap the row
 * count. Default `limit` is 100, capped at 200; charts that need wider
 * history should call `getPoolAggregate` instead.
 *
 * @throws TypeError on validation failure (bad pool, bad from/to/limit,
 *   from > to, or missing baseUrl/cluster).
 * @throws MarketsFetchError on HTTP non-2xx, transport error, or malformed body.
 */
export async function getPoolSnapshots(
  opts: {
    pool: string;
    from?: number;
    to?: number;
    limit?: number;
  } & MarketsClientOptions,
): Promise<{ items: SnapshotRow[] }> {
  assertBase58('pool', opts.pool);
  if (opts.from !== undefined) assertNonNegativeInt('from', opts.from);
  if (opts.to !== undefined) assertNonNegativeInt('to', opts.to);
  if (opts.from !== undefined && opts.to !== undefined && opts.from > opts.to) {
    throw new TypeError('markets client: from must be <= to');
  }
  const limit = opts.limit ?? DEFAULT_SNAPSHOT_LIMIT;
  assertSnapshotLimit(limit);

  const base = resolveBaseUrl(opts);
  const parts: string[] = [];
  if (opts.from !== undefined) appendQuery(parts, 'from', String(opts.from));
  if (opts.to !== undefined) appendQuery(parts, 'to', String(opts.to));
  appendQuery(parts, 'limit', String(limit));

  const url = `${base}/markets/pools/${encodeURIComponent(opts.pool)}/snapshots?${parts.join('&')}`;
  const body = await requestJson<{ items?: unknown }>(url, opts);

  const rawItems = Array.isArray(body.items) ? body.items : [];
  return { items: rawItems.map(mapSnapshotRow) };
}

/**
 * Fetch the most recent N daily aggregate rows for a pool, descending by
 * day at the wire level (the backend orders by `day DESC`).
 *
 * Default `days` is 7, capped at 90 — matches the typical "trailing 90d
 * APY" UI affordance.
 *
 * @throws TypeError on validation failure (bad pool, bad days, or missing
 *   baseUrl/cluster).
 * @throws MarketsFetchError on HTTP non-2xx, transport error, or malformed body.
 */
export async function getPoolAggregate(
  opts: {
    pool: string;
    days?: number;
  } & MarketsClientOptions,
): Promise<{ items: DailyAggregateRow[] }> {
  assertBase58('pool', opts.pool);
  const days = opts.days ?? DEFAULT_AGGREGATE_DAYS;
  assertAggregateDays(days);

  const base = resolveBaseUrl(opts);
  const parts: string[] = [];
  appendQuery(parts, 'days', String(days));

  const url = `${base}/markets/pools/${encodeURIComponent(opts.pool)}/aggregate?${parts.join('&')}`;
  const body = await requestJson<{ items?: unknown }>(url, opts);

  const rawItems = Array.isArray(body.items) ? body.items : [];
  return { items: rawItems.map(mapDailyAggregateRow) };
}

/**
 * Fetch the protocol-wide summary singleton.
 *
 * Returns `404` from the backend if the singleton row is missing
 * (should be impossible after migration `0005`); callers see a
 * `MarketsFetchError(status=404)` in that case.
 *
 * @throws TypeError on missing baseUrl/cluster.
 * @throws MarketsFetchError on HTTP non-2xx, transport error, or malformed body.
 */
export async function getProtocolSummary(
  opts: MarketsClientOptions,
): Promise<ProtocolSummary> {
  const base = resolveBaseUrl(opts);
  const url = `${base}/markets/summary`;
  const body = await requestJson<unknown>(url, opts);
  return mapProtocolSummary(body);
}
