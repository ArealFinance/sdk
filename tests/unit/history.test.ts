// Unit tests for `sdk/src/history/`.
//
// All tests use a `vi.fn()` mock injected through `HistoryClientOptions.fetch`
// so no test ever touches a real network. We keep the mocks minimal — each
// case asserts either the URL the client built (validation tests) or the
// shape of the parsed page (mapping tests).
//
// 21 cases (in PM brief order):
//   1.  getTransactions happy path — 3 rows + nextCursor
//   2.  getTransactions empty page
//   3.  getTransactions kind filter — URL has kind=claim
//   4.  getTransactions before cursor — URL has before=<cursor> (single-encoded)
//   5.  getTransactions limit=50 — URL has limit=50
//   6.  getTransactions invalid wallet → TypeError, no fetch call
//   7.  getTransactions invalid limit (0, 51, 1.5) → TypeError, no fetch
//   8.  getTransactions no baseUrl + no cluster → TypeError
//   20. before cursor longer than 256 chars → TypeError, no fetch
//   21. empty before cursor → TypeError, no fetch
//   9.  getTransactions 5xx → HistoryFetchError(status=500)
//   10. getTransactions 404 → HistoryFetchError(status=404)
//   11. getTransactions network error (fetch rejects) → HistoryFetchError(status=null)
//   12. getTransactions snake→camel mapping — `otMint` not `ot_mint`
//   13. getClaimHistory happy path
//   14. getClaimHistory invalid otMint filter → TypeError
//   15. getLpPositionHistory happy path
//   16. getLpPositionHistory invalid pool filter → TypeError
//   17. AbortSignal forwarded to fetch
//   18. baseUrl resolution: cluster → HISTORY_API_BASE_URLS lookup
//   19. Cursor opacity: round-trip server cursor — single encode

import { describe, expect, it, vi } from 'vitest';

import {
  getClaimHistory,
  getLpPositionHistory,
  getTransactions,
} from '../../src/history/client.js';
import { HistoryFetchError } from '../../src/history/errors.js';
import type { Cursor } from '../../src/history/types.js';
import { HISTORY_API_BASE_URLS } from '../../src/network/constants.js';

const VALID_WALLET = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const VALID_OT_MINT = 'So11111111111111111111111111111111111111112';
const VALID_POOL = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const BASE_URL = 'https://api.test.example';

/** Build a fake Response wrapper that satisfies the subset of the Response
 * surface our client uses (ok, status, json). */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

// ─────────────────── getTransactions ───────────────────

describe('getTransactions', () => {
  // Case 1
  it('happy path — 3 rows + nextCursor', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            id: 'a', kind: 'claim', wallet: VALID_WALLET,
            ot_mint: VALID_OT_MINT, pool: null,
            amount_a: '100', amount_b: null, shares_delta: null,
            signature: 'sig1', log_index: 0, block_time: 1714780800000,
          },
          {
            id: 'b', kind: 'swap', wallet: VALID_WALLET,
            ot_mint: null, pool: VALID_POOL,
            amount_a: '1000', amount_b: '950', shares_delta: null,
            signature: 'sig2', log_index: 1, block_time: 1714780801000,
          },
          {
            id: 'c', kind: 'add_lp', wallet: VALID_WALLET,
            ot_mint: null, pool: VALID_POOL,
            amount_a: '500', amount_b: '500', shares_delta: '1000',
            signature: 'sig3', log_index: 2, block_time: 1714780802000,
          },
        ],
        nextCursor: 'cursor-abc',
      }),
    );

    const page = await getTransactions({
      wallet: VALID_WALLET,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });

    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBe('cursor-abc');
    expect(page.items[0]!.kind).toBe('claim');
    expect(page.items[1]!.kind).toBe('swap');
    expect(page.items[2]!.kind).toBe('add_lp');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Case 2
  it('empty page returns items: [] and nextCursor: null', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    );
    const page = await getTransactions({
      wallet: VALID_WALLET,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  // Case 3
  it('kind filter appears in URL as kind=claim', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    );
    await getTransactions({
      wallet: VALID_WALLET,
      kind: 'claim',
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('kind=claim');
  });

  // Case 4
  it('before cursor is single-encoded in URL', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    );
    // Cursor with characters that DO require encoding so we can detect
    // double-encoding (`+` would become `%2B` once, `%252B` twice).
    const cursor = 'eyJ0aW1lIjoxfQ+abc/def=' as Cursor;
    await getTransactions({
      wallet: VALID_WALLET,
      before: cursor,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    // Single-encoded
    expect(calledUrl).toContain(`before=${encodeURIComponent(cursor)}`);
    // Definitely not double-encoded
    expect(calledUrl).not.toContain('%25');
  });

  // Case 5
  it('limit=50 is reflected in URL', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    );
    await getTransactions({
      wallet: VALID_WALLET,
      limit: 50,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('limit=50');
  });

  // Case 6
  it('invalid wallet → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getTransactions({
        wallet: 'not-a-wallet',
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 7
  it('invalid limit (0, 101, 1.5) → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    for (const bad of [0, 51, 1.5]) {
      await expect(
        getTransactions({
          wallet: VALID_WALLET,
          limit: bad,
          baseUrl: BASE_URL,
          fetch: fetchMock as unknown as typeof fetch,
        }),
      ).rejects.toBeInstanceOf(TypeError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 8
  it('no baseUrl + no cluster → TypeError', async () => {
    const fetchMock = vi.fn();
    await expect(
      getTransactions({
        wallet: VALID_WALLET,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 9
  it('5xx response → HistoryFetchError(status=500)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({}, { ok: false, status: 500 }),
    );
    try {
      await getTransactions({
        wallet: VALID_WALLET,
        baseUrl: BASE_URL,
        fetch: fetchMock,
      });
      expect.fail('expected HistoryFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(HistoryFetchError);
      expect((e as HistoryFetchError).status).toBe(500);
    }
  });

  // Case 10
  it('404 → HistoryFetchError(status=404)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({}, { ok: false, status: 404 }),
    );
    try {
      await getTransactions({
        wallet: VALID_WALLET,
        baseUrl: BASE_URL,
        fetch: fetchMock,
      });
      expect.fail('expected HistoryFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(HistoryFetchError);
      expect((e as HistoryFetchError).status).toBe(404);
    }
  });

  // Case 11
  it('network error (fetch rejects) → HistoryFetchError(status=null)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    try {
      await getTransactions({
        wallet: VALID_WALLET,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      });
      expect.fail('expected HistoryFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(HistoryFetchError);
      expect((e as HistoryFetchError).status).toBeNull();
      expect((e as HistoryFetchError).message).toContain('network error');
    }
  });

  // Case 12
  it('snake_case wire fields are mapped to camelCase row fields', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            id: 'x', kind: 'mint_rwt', wallet: VALID_WALLET,
            ot_mint: VALID_OT_MINT, pool: null,
            amount_a: '42', amount_b: null, shares_delta: null,
            signature: 'sigX', log_index: 7, block_time: 1714780800000,
          },
        ],
        nextCursor: null,
      }),
    );
    const page = await getTransactions({
      wallet: VALID_WALLET,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const row = page.items[0]!;
    expect(row.otMint).toBe(VALID_OT_MINT);
    expect(row.amountA).toBe('42');
    expect(row.logIndex).toBe(7);
    expect(row.blockTime).toBe(1714780800000);
    // Wire keys must NOT leak through
    expect((row as unknown as Record<string, unknown>).ot_mint).toBeUndefined();
    expect((row as unknown as Record<string, unknown>).log_index).toBeUndefined();
    expect((row as unknown as Record<string, unknown>).block_time).toBeUndefined();
  });
});

// ─────────────────── getClaimHistory ───────────────────

describe('getClaimHistory', () => {
  // Case 13
  it('happy path — maps cumulativeClaimed correctly', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            id: 'cl1', wallet: VALID_WALLET, ot_mint: VALID_OT_MINT,
            amount: '100', cumulative_claimed: '500',
            signature: 'sig1', log_index: 0, block_time: 1714780800000,
          },
        ],
        nextCursor: null,
      }),
    );
    const page = await getClaimHistory({
      wallet: VALID_WALLET,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.amount).toBe('100');
    expect(page.items[0]!.cumulativeClaimed).toBe('500');
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toContain(`/portfolio/${VALID_WALLET}/claims`);
  });

  // Case 14
  it('invalid otMint filter → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getClaimHistory({
        wallet: VALID_WALLET,
        otMint: 'bad-mint',
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─────────────────── getLpPositionHistory ───────────────────

describe('getLpPositionHistory', () => {
  // Case 15
  it('happy path — kind narrowed to LpHistoryKind', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            id: 'lp1', wallet: VALID_WALLET, pool: VALID_POOL, kind: 'add_lp',
            amount_a: '100', amount_b: '100', shares_delta: '200',
            signature: 'sig1', log_index: 0, block_time: 1714780800000,
          },
          {
            id: 'lp2', wallet: VALID_WALLET, pool: VALID_POOL, kind: 'remove_lp',
            amount_a: null, amount_b: null, shares_delta: '-100',
            signature: 'sig2', log_index: 1, block_time: 1714780801000,
          },
        ],
        nextCursor: null,
      }),
    );
    const page = await getLpPositionHistory({
      wallet: VALID_WALLET,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]!.kind).toBe('add_lp');
    expect(page.items[1]!.kind).toBe('remove_lp');
    expect(page.items[1]!.sharesDelta).toBe('-100');
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toContain(`/portfolio/${VALID_WALLET}/lp-positions`);
  });

  // Case 16
  it('invalid pool filter → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getLpPositionHistory({
        wallet: VALID_WALLET,
        pool: 'bad-pool',
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─────────────────── shared options ───────────────────

describe('history client — shared options', () => {
  // Case 17
  it('AbortSignal is forwarded to fetch', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    );
    const ctrl = new AbortController();
    await getTransactions({
      wallet: VALID_WALLET,
      baseUrl: BASE_URL,
      fetch: fetchMock,
      signal: ctrl.signal,
    });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBe(ctrl.signal);
  });

  // Case 18
  it('cluster resolves to HISTORY_API_BASE_URLS lookup', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    );
    await getTransactions({
      wallet: VALID_WALLET,
      cluster: 'devnet',
      fetch: fetchMock,
    });
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl.startsWith(HISTORY_API_BASE_URLS.devnet)).toBe(true);
  });

  // Case 19 (bonus)
  it('cursor opacity — exact server cursor round-trips with single encode', async () => {
    // First fetch returns a server cursor with characters that triple as
    // sentinels for double-encoding.
    const serverCursor = 'eyJibG9ja190aW1lIjoxLCJzaWciOiJhYmMrZGVmIn0=' as Cursor;

    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: serverCursor }),
    );
    const page1 = await getTransactions({
      wallet: VALID_WALLET,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page1.nextCursor).toBe(serverCursor);

    // Forward it back as `before`. URL must contain the SINGLE-encoded form.
    await getTransactions({
      wallet: VALID_WALLET,
      before: page1.nextCursor!,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const url2 = fetchMock.mock.calls[1]![0] as string;
    expect(url2).toContain(`before=${encodeURIComponent(serverCursor)}`);
    // Decoding once must yield exactly the server cursor (no double encoding).
    const beforeParam = new URL(url2).searchParams.get('before');
    expect(beforeParam).toBe(serverCursor);
  });

  // Case 20 — cursor cap: oversize cursor → TypeError, no fetch
  it('rejects before cursor longer than 256 chars without calling fetch', async () => {
    const fetchMock = vi.fn();
    const huge = ('x'.repeat(257)) as Cursor;
    await expect(
      getTransactions({
        wallet: VALID_WALLET,
        before: huge,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 21 — cursor cap: empty cursor string → TypeError
  it('rejects empty before cursor without calling fetch', async () => {
    const fetchMock = vi.fn();
    await expect(
      getTransactions({
        wallet: VALID_WALLET,
        before: '' as Cursor,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
