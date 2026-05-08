// Typed clients for the Phase 12.2.1 history backend (`api.areal.finance`).
//
// Each function:
//   1. Validates inputs synchronously and throws `TypeError` BEFORE any
//      network call. Bad wallet / bad limit / missing baseUrl is treated
//      as a caller bug — early throw shortens the failure path and keeps
//      the network audit log clean.
//   2. Resolves `baseUrl` from explicit option, then per-cluster constant.
//   3. Builds a query string with single `encodeURIComponent` — never
//      double-encodes the opaque cursor.
//   4. Wraps the underlying fetch so every non-2xx and every transport
//      failure surfaces as `HistoryFetchError` with `(status, url)`.
//   5. Maps the snake_case wire payload to camelCase rows. Decimal-string
//      fields stay strings — the SDK does NOT coerce them to bigint or
//      number because callers downstream may need exact display fidelity.

import { HISTORY_API_BASE_URLS } from '../network/constants.js';
import { HistoryFetchError } from './errors.js';
import type {
  ClaimHistoryRow,
  Cursor,
  HistoryClientOptions,
  HistoryKind,
  HistoryPage,
  LpHistoryKind,
  LpPositionHistoryRow,
  TransactionRow,
} from './types.js';

/**
 * Solana base58 address regex. Same shape used by the auth DTOs and the
 * portfolio reader — kept inline here so the history module has no
 * dependency on the rest of the SDK's validation surface.
 */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const HISTORY_KINDS: ReadonlySet<HistoryKind> = new Set([
  'claim',
  'swap',
  'add_lp',
  'remove_lp',
  'zap_lp',
  'mint_rwt',
]);

// ─────────────────────────── helpers ───────────────────────────

function assertBase58(label: string, value: string): void {
  if (typeof value !== 'string' || !BASE58_RE.test(value)) {
    throw new TypeError(`history client: invalid ${label} (not a base58 address)`);
  }
}

function assertLimit(limit: number): void {
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < MIN_LIMIT ||
    limit > MAX_LIMIT
  ) {
    throw new TypeError(
      `history client: limit must be an integer in [${MIN_LIMIT}, ${MAX_LIMIT}]`,
    );
  }
}

function assertHistoryKind(kind: string): void {
  if (!HISTORY_KINDS.has(kind as HistoryKind)) {
    throw new TypeError(`history client: invalid kind "${kind}"`);
  }
}

function resolveBaseUrl(opts: HistoryClientOptions): string {
  if (opts.baseUrl !== undefined) {
    if (typeof opts.baseUrl !== 'string' || opts.baseUrl.length === 0) {
      throw new TypeError('history client: baseUrl must be a non-empty string');
    }
    return opts.baseUrl.replace(/\/$/, '');
  }
  if (opts.cluster !== undefined) {
    const url = HISTORY_API_BASE_URLS[opts.cluster];
    if (!url) {
      throw new TypeError(`history client: unknown cluster "${opts.cluster}"`);
    }
    return url.replace(/\/$/, '');
  }
  throw new TypeError('history client: baseUrl or cluster required');
}

/** Append `key=value` (URL-encoded once) to a query parts array. */
function appendQuery(parts: string[], key: string, value: string): void {
  parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
}

/**
 * Shared GET helper. Issues a single request, surfaces transport and HTTP
 * errors as `HistoryFetchError`, and runs the supplied row mapper to map
 * the snake_case `items[]` to typed camelCase rows.
 */
async function requestPage<TRow>(
  url: string,
  opts: HistoryClientOptions,
  mapRow: (raw: unknown) => TRow,
): Promise<HistoryPage<TRow>> {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('history client: no fetch implementation available');
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
    throw new HistoryFetchError(`network error: ${msg}`, null, url);
  }

  if (!res.ok) {
    throw new HistoryFetchError(
      `history backend returned ${res.status}`,
      res.status,
      url,
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new HistoryFetchError(`malformed JSON: ${msg}`, res.status, url);
  }

  if (!body || typeof body !== 'object') {
    throw new HistoryFetchError('malformed body: not an object', res.status, url);
  }
  const env = body as { items?: unknown; nextCursor?: unknown };
  const rawItems = Array.isArray(env.items) ? env.items : [];
  const items = rawItems.map(mapRow);

  let nextCursor: Cursor | null = null;
  if (typeof env.nextCursor === 'string' && env.nextCursor.length > 0) {
    nextCursor = env.nextCursor as Cursor;
  }

  return { items, nextCursor };
}

// ─────────────────────────── row mappers ───────────────────────────

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function numOrZero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function mapTransactionRow(raw: unknown): TransactionRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : '',
    kind: r.kind as HistoryKind,
    wallet: typeof r.wallet === 'string' ? r.wallet : '',
    otMint: strOrNull(r.ot_mint),
    pool: strOrNull(r.pool),
    amountA: strOrNull(r.amount_a),
    amountB: strOrNull(r.amount_b),
    sharesDelta: strOrNull(r.shares_delta),
    signature: typeof r.signature === 'string' ? r.signature : '',
    logIndex: numOrZero(r.log_index),
    blockTime: numOrZero(r.block_time),
  };
}

function mapClaimRow(raw: unknown): ClaimHistoryRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : '',
    wallet: typeof r.wallet === 'string' ? r.wallet : '',
    otMint: typeof r.ot_mint === 'string' ? r.ot_mint : '',
    amount: typeof r.amount === 'string' ? r.amount : '0',
    cumulativeClaimed:
      typeof r.cumulative_claimed === 'string' ? r.cumulative_claimed : '0',
    signature: typeof r.signature === 'string' ? r.signature : '',
    logIndex: numOrZero(r.log_index),
    blockTime: numOrZero(r.block_time),
  };
}

function mapLpRow(raw: unknown): LpPositionHistoryRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : '',
    wallet: typeof r.wallet === 'string' ? r.wallet : '',
    pool: typeof r.pool === 'string' ? r.pool : '',
    kind: r.kind as LpHistoryKind,
    amountA: strOrNull(r.amount_a),
    amountB: strOrNull(r.amount_b),
    sharesDelta:
      typeof r.shares_delta === 'string' ? r.shares_delta : '0',
    signature: typeof r.signature === 'string' ? r.signature : '',
    logIndex: numOrZero(r.log_index),
    blockTime: numOrZero(r.block_time),
  };
}

// ─────────────────────────── public API ───────────────────────────

/**
 * Fetch a page of unified transaction history for a wallet.
 *
 * @throws TypeError on validation failure (bad wallet/limit/missing baseUrl).
 * @throws HistoryFetchError on HTTP non-2xx, transport error, or malformed body.
 */
export async function getTransactions(
  opts: {
    wallet: string;
    kind?: HistoryKind;
    limit?: number;
    before?: Cursor;
  } & HistoryClientOptions,
): Promise<HistoryPage<TransactionRow>> {
  assertBase58('wallet', opts.wallet);
  if (opts.kind !== undefined) assertHistoryKind(opts.kind);
  const limit = opts.limit ?? DEFAULT_LIMIT;
  assertLimit(limit);
  const base = resolveBaseUrl(opts);

  const parts: string[] = [];
  appendQuery(parts, 'wallet', opts.wallet);
  if (opts.kind !== undefined) appendQuery(parts, 'kind', opts.kind);
  appendQuery(parts, 'limit', String(limit));
  if (opts.before !== undefined) appendQuery(parts, 'before', opts.before);

  const url = `${base}/transactions?${parts.join('&')}`;
  return requestPage(url, opts, mapTransactionRow);
}

/**
 * Fetch a page of claim history for a wallet, optionally filtered by OT
 * mint.
 *
 * @throws TypeError on validation failure.
 * @throws HistoryFetchError on transport / HTTP errors.
 */
export async function getClaimHistory(
  opts: {
    wallet: string;
    otMint?: string;
    limit?: number;
    before?: Cursor;
  } & HistoryClientOptions,
): Promise<HistoryPage<ClaimHistoryRow>> {
  assertBase58('wallet', opts.wallet);
  if (opts.otMint !== undefined) assertBase58('otMint', opts.otMint);
  const limit = opts.limit ?? DEFAULT_LIMIT;
  assertLimit(limit);
  const base = resolveBaseUrl(opts);

  const parts: string[] = [];
  if (opts.otMint !== undefined) appendQuery(parts, 'ot_mint', opts.otMint);
  appendQuery(parts, 'limit', String(limit));
  if (opts.before !== undefined) appendQuery(parts, 'before', opts.before);

  const url = `${base}/portfolio/${encodeURIComponent(opts.wallet)}/claims?${parts.join('&')}`;
  return requestPage(url, opts, mapClaimRow);
}

/**
 * Fetch a page of LP-position history (add/remove/zap_lp) for a wallet,
 * optionally filtered by pool.
 *
 * @throws TypeError on validation failure.
 * @throws HistoryFetchError on transport / HTTP errors.
 */
export async function getLpPositionHistory(
  opts: {
    wallet: string;
    pool?: string;
    limit?: number;
    before?: Cursor;
  } & HistoryClientOptions,
): Promise<HistoryPage<LpPositionHistoryRow>> {
  assertBase58('wallet', opts.wallet);
  if (opts.pool !== undefined) assertBase58('pool', opts.pool);
  const limit = opts.limit ?? DEFAULT_LIMIT;
  assertLimit(limit);
  const base = resolveBaseUrl(opts);

  const parts: string[] = [];
  if (opts.pool !== undefined) appendQuery(parts, 'pool', opts.pool);
  appendQuery(parts, 'limit', String(limit));
  if (opts.before !== undefined) appendQuery(parts, 'before', opts.before);

  const url = `${base}/portfolio/${encodeURIComponent(opts.wallet)}/lp-positions?${parts.join('&')}`;
  return requestPage(url, opts, mapLpRow);
}
