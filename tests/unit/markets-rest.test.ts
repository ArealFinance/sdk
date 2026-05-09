// Unit tests for `sdk/src/markets-rest/`.
//
// All tests use a `vi.fn()` mock injected through `MarketsClientOptions.fetch`
// so no test ever touches a real network. The cases mirror the architect's
// enumeration (Phase 12.3.2 Refactoring Scope §markets-rest tests):
//
//   1.  getPoolSnapshots happy path — 2 rows, time-window
//   2.  getPoolSnapshots empty page
//   3.  getPoolSnapshots default limit=100 in URL
//   4.  getPoolSnapshots from + to + limit in URL (single-encoded)
//   5.  getPoolSnapshots invalid pool → TypeError
//   6.  getPoolSnapshots invalid limit (0, 201, 1.5) → TypeError
//   7.  getPoolSnapshots invalid from (-1, 1.5) → TypeError
//   8.  getPoolSnapshots from > to → TypeError
//   9.  getPoolSnapshots tvlUsd: null preserved (not coerced to 0)
//   10. getPoolSnapshots wire-shape mismatch (tvla typo) → field becomes ''
//   11. getPoolSnapshots no baseUrl + no cluster → TypeError
//   12. getPoolSnapshots cluster resolution → BACKEND_API_BASE_URLS lookup
//   13. getPoolSnapshots 5xx → MarketsFetchError(status=500)
//   14. getPoolSnapshots 404 → MarketsFetchError(status=404)
//   15. getPoolSnapshots network error → MarketsFetchError(status=null)
//   16. getPoolSnapshots AbortSignal forwarded to fetch
//   17. getPoolAggregate happy path — 3 rows, sane field mapping
//   18. getPoolAggregate default days=7 in URL
//   19. getPoolAggregate days=90 (max) in URL
//   20. getPoolAggregate days=0 → TypeError
//   21. getPoolAggregate days=91 → TypeError
//   22. getPoolAggregate days=1.5 → TypeError
//   23. getPoolAggregate apy24h: null preserved (unresolvable APY)
//   24. getPoolAggregate invalid pool → TypeError
//   25. getProtocolSummary happy path
//   26. getProtocolSummary 404 (singleton missing) → MarketsFetchError(status=404)
//   27. getProtocolSummary network error → MarketsFetchError(status=null)
//   28. getProtocolSummary cluster resolution
//   29. malformed JSON body → MarketsFetchError(status=200)
//   30. malformed body (not an object) → MarketsFetchError

import { describe, expect, it, vi } from 'vitest';

import {
  getPoolAggregate,
  getPoolSnapshots,
  getProtocolSummary,
} from '../../src/markets-rest/client.js';
import { MarketsFetchError } from '../../src/markets-rest/errors.js';
import { BACKEND_API_BASE_URLS } from '../../src/network/constants.js';

const VALID_POOL = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const BASE_URL = 'https://api.test.example';

/** Fake Response wrapper with the subset of the surface our client uses. */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

/** Fake Response with body that throws on `json()`. */
function malformedJsonResponse(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token in JSON');
    },
  } as Response;
}

/** Fake Response whose body is a non-object (string, number). */
function nonObjectResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

// ─────────────────── getPoolSnapshots ───────────────────

describe('getPoolSnapshots', () => {
  // Case 1
  it('happy path — 2 rows from a time window', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            blockTime: 1714780800,
            tvlA: '1500000000000',
            tvlB: '2500000000000',
            tvlUsd: 4250.75,
            reserveA: '1500000000000',
            reserveB: '2500000000000',
            feeGrowthA: '987654321000000',
            feeGrowthB: '987654321000000',
            lpSupply: '1936491673000',
          },
          {
            pool: VALID_POOL,
            blockTime: 1714780740,
            tvlA: '1500000000000',
            tvlB: '2500000000000',
            tvlUsd: 4248.10,
            reserveA: '1500000000000',
            reserveB: '2500000000000',
            feeGrowthA: '987654321000000',
            feeGrowthB: '987654321000000',
            lpSupply: '1936491673000',
          },
        ],
      }),
    );
    const page = await getPoolSnapshots({
      pool: VALID_POOL,
      from: 1714780000,
      to: 1714780900,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]!.tvlUsd).toBe(4250.75);
    expect(page.items[0]!.tvlA).toBe('1500000000000');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Case 2
  it('empty page returns items: []', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    const page = await getPoolSnapshots({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items).toEqual([]);
  });

  // Case 3
  it('default limit=100 appears in URL', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    await getPoolSnapshots({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('limit=100');
  });

  // Case 4
  it('from + to + limit appear in URL (single-encoded)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    await getPoolSnapshots({
      pool: VALID_POOL,
      from: 1714780000,
      to: 1714790000,
      limit: 50,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('from=1714780000');
    expect(url).toContain('to=1714790000');
    expect(url).toContain('limit=50');
    expect(url).toContain(`/markets/pools/${VALID_POOL}/snapshots`);
    // No double-encoding of the path pubkey.
    expect(url).not.toContain('%25');
  });

  // Case 5
  it('invalid pool → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getPoolSnapshots({
        pool: 'not-a-pool',
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 6
  it('invalid limit (0, 201, 1.5) → TypeError, no fetch', async () => {
    const fetchMock = vi.fn();
    for (const bad of [0, 201, 1.5]) {
      await expect(
        getPoolSnapshots({
          pool: VALID_POOL,
          limit: bad,
          baseUrl: BASE_URL,
          fetch: fetchMock as unknown as typeof fetch,
        }),
      ).rejects.toBeInstanceOf(TypeError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 7
  it('invalid from (-1, 1.5) → TypeError, no fetch', async () => {
    const fetchMock = vi.fn();
    for (const bad of [-1, 1.5]) {
      await expect(
        getPoolSnapshots({
          pool: VALID_POOL,
          from: bad,
          baseUrl: BASE_URL,
          fetch: fetchMock as unknown as typeof fetch,
        }),
      ).rejects.toBeInstanceOf(TypeError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 8
  it('from > to → TypeError, no fetch', async () => {
    const fetchMock = vi.fn();
    await expect(
      getPoolSnapshots({
        pool: VALID_POOL,
        from: 2000,
        to: 1000,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 9
  it('tvlUsd: null is preserved (not coerced to 0)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            blockTime: 1714780800,
            tvlA: '0',
            tvlB: '0',
            tvlUsd: null,
            reserveA: '0',
            reserveB: '0',
            feeGrowthA: '0',
            feeGrowthB: '0',
            lpSupply: '0',
          },
        ],
      }),
    );
    const page = await getPoolSnapshots({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items[0]!.tvlUsd).toBeNull();
  });

  // Case 10
  it('wire-shape mismatch (tvla typo) → SDK field becomes ""', async () => {
    // Defensive: if backend regresses to snake_case, the SDK type-guard
    // returns '' for the missing camelCase fields rather than carrying the
    // typo through.
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            blockTime: 1714780800,
            tvla: '1500000000000', // typo: should be tvlA
            tvlb: '2500000000000', // typo: should be tvlB
            tvlUsd: 100,
            reserveA: '1500000000000',
            reserveB: '2500000000000',
            feeGrowthA: '0',
            feeGrowthB: '0',
            lpSupply: '0',
          },
        ],
      }),
    );
    const page = await getPoolSnapshots({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    // Strict shape: typo'd fields are dropped, defaults applied.
    expect(page.items[0]!.tvlA).toBe('');
    expect(page.items[0]!.tvlB).toBe('');
    // No leak of the wire typo through the SDK row.
    expect(
      (page.items[0] as unknown as Record<string, unknown>).tvla,
    ).toBeUndefined();
  });

  // Case 11
  it('no baseUrl + no cluster → TypeError', async () => {
    const fetchMock = vi.fn();
    await expect(
      getPoolSnapshots({
        pool: VALID_POOL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 12
  it('cluster resolves to BACKEND_API_BASE_URLS lookup', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    await getPoolSnapshots({
      pool: VALID_POOL,
      cluster: 'mainnet',
      fetch: fetchMock,
    });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url.startsWith(BACKEND_API_BASE_URLS.mainnet)).toBe(true);
  });

  // Case 13
  it('5xx → MarketsFetchError(status=500)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({}, { ok: false, status: 500 }),
    );
    try {
      await getPoolSnapshots({
        pool: VALID_POOL,
        baseUrl: BASE_URL,
        fetch: fetchMock,
      });
      expect.fail('expected MarketsFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketsFetchError);
      expect((e as MarketsFetchError).status).toBe(500);
    }
  });

  // Case 14
  it('404 → MarketsFetchError(status=404)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({}, { ok: false, status: 404 }),
    );
    try {
      await getPoolSnapshots({
        pool: VALID_POOL,
        baseUrl: BASE_URL,
        fetch: fetchMock,
      });
      expect.fail('expected MarketsFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketsFetchError);
      expect((e as MarketsFetchError).status).toBe(404);
    }
  });

  // Case 15
  it('network error → MarketsFetchError(status=null)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    try {
      await getPoolSnapshots({
        pool: VALID_POOL,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      });
      expect.fail('expected MarketsFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketsFetchError);
      expect((e as MarketsFetchError).status).toBeNull();
      expect((e as MarketsFetchError).message).toContain('network error');
    }
  });

  // Case 16
  it('AbortSignal is forwarded to fetch', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    const ctrl = new AbortController();
    await getPoolSnapshots({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
      signal: ctrl.signal,
    });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBe(ctrl.signal);
  });
});

// ─────────────────── getPoolAggregate ───────────────────

describe('getPoolAggregate', () => {
  // Case 17
  it('happy path — 3 daily rows mapped correctly', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            day: '2026-05-08',
            volumeA24h: '1000000000',
            volumeB24h: '950000000',
            feesA24h: '3000000',
            feesB24h: '2850000',
            txCount24h: 42,
            uniqueWallets24h: 17,
            apy24h: 0.085,
            updatedAt: '2026-05-08T12:00:00.000Z',
          },
          {
            pool: VALID_POOL,
            day: '2026-05-07',
            volumeA24h: '500000000',
            volumeB24h: '475000000',
            feesA24h: '1500000',
            feesB24h: '1425000',
            txCount24h: 21,
            uniqueWallets24h: 8,
            apy24h: 0.072,
            updatedAt: '2026-05-07T23:59:59.000Z',
          },
          {
            pool: VALID_POOL,
            day: '2026-05-06',
            volumeA24h: '0',
            volumeB24h: '0',
            feesA24h: '0',
            feesB24h: '0',
            txCount24h: 0,
            uniqueWallets24h: 0,
            apy24h: null,
            updatedAt: '2026-05-06T23:59:59.000Z',
          },
        ],
      }),
    );
    const page = await getPoolAggregate({
      pool: VALID_POOL,
      days: 3,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items).toHaveLength(3);
    expect(page.items[0]!.day).toBe('2026-05-08');
    expect(page.items[0]!.apy24h).toBe(0.085);
    expect(page.items[2]!.apy24h).toBeNull();
    expect(page.items[2]!.txCount24h).toBe(0);
  });

  // Case 18
  it('default days=7 appears in URL', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    await getPoolAggregate({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('days=7');
    expect(url).toContain(`/markets/pools/${VALID_POOL}/aggregate`);
  });

  // Case 19
  it('days=90 (max) is accepted', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    await getPoolAggregate({
      pool: VALID_POOL,
      days: 90,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('days=90');
  });

  // Case 20
  it('days=0 → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getPoolAggregate({
        pool: VALID_POOL,
        days: 0,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 21
  it('days=91 → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getPoolAggregate({
        pool: VALID_POOL,
        days: 91,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 22
  it('days=1.5 → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getPoolAggregate({
        pool: VALID_POOL,
        days: 1.5,
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Case 23
  it('apy24h: null is preserved (unresolvable APY)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            day: '2026-05-08',
            volumeA24h: '0',
            volumeB24h: '0',
            feesA24h: '0',
            feesB24h: '0',
            txCount24h: 0,
            uniqueWallets24h: 0,
            apy24h: null,
            updatedAt: '2026-05-08T00:00:00.000Z',
          },
        ],
      }),
    );
    const page = await getPoolAggregate({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items[0]!.apy24h).toBeNull();
  });

  // Case 24
  it('invalid pool → TypeError, no fetch call', async () => {
    const fetchMock = vi.fn();
    await expect(
      getPoolAggregate({
        pool: 'bad',
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Phase 12.3.3-I — latest-snapshot price/decimal enrichment.
  // Case 24a
  it('latest-snapshot prices + decimals are passed through', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            day: '2026-05-08',
            volumeA24h: '1000000000',
            volumeB24h: '950000000',
            feesA24h: '3000000',
            feesB24h: '2850000',
            txCount24h: 42,
            uniqueWallets24h: 17,
            apy24h: 0.085,
            priceAUsdc: 1.5,
            priceBUsdc: 2.25,
            decimalsA: 9,
            decimalsB: 6,
            updatedAt: '2026-05-08T12:00:00.000Z',
          },
        ],
      }),
    );
    const page = await getPoolAggregate({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items[0]!.priceAUsdc).toBe(1.5);
    expect(page.items[0]!.priceBUsdc).toBe(2.25);
    expect(page.items[0]!.decimalsA).toBe(9);
    expect(page.items[0]!.decimalsB).toBe(6);
  });

  // Case 24b
  it('older backend response (no price/decimal fields) → all four → null', async () => {
    // Backward-compat: a backend predating Phase 12.3.3-I omits the four
    // new keys entirely. The mapper must coerce undefined → null so app
    // code only ever has to branch on `=== null`.
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            day: '2026-05-08',
            volumeA24h: '1000000000',
            volumeB24h: '950000000',
            feesA24h: '3000000',
            feesB24h: '2850000',
            txCount24h: 42,
            uniqueWallets24h: 17,
            apy24h: 0.085,
            updatedAt: '2026-05-08T12:00:00.000Z',
            // priceAUsdc / priceBUsdc / decimalsA / decimalsB intentionally absent
          },
        ],
      }),
    );
    const page = await getPoolAggregate({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items[0]!.priceAUsdc).toBeNull();
    expect(page.items[0]!.priceBUsdc).toBeNull();
    expect(page.items[0]!.decimalsA).toBeNull();
    expect(page.items[0]!.decimalsB).toBeNull();
  });

  // Case 24c
  it('newer backend with explicit null prices/decimals → preserved as null', async () => {
    // Happy path for the no-snapshot case: backend returns the keys with
    // `null` values when no `pool_snapshots` row exists before the day
    // boundary. Mapper must NOT coerce null → 0.
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            pool: VALID_POOL,
            day: '2026-05-08',
            volumeA24h: '0',
            volumeB24h: '0',
            feesA24h: '0',
            feesB24h: '0',
            txCount24h: 0,
            uniqueWallets24h: 0,
            apy24h: null,
            priceAUsdc: null,
            priceBUsdc: null,
            decimalsA: null,
            decimalsB: null,
            updatedAt: '2026-05-08T00:00:00.000Z',
          },
        ],
      }),
    );
    const page = await getPoolAggregate({
      pool: VALID_POOL,
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(page.items[0]!.priceAUsdc).toBeNull();
    expect(page.items[0]!.priceBUsdc).toBeNull();
    expect(page.items[0]!.decimalsA).toBeNull();
    expect(page.items[0]!.decimalsB).toBeNull();
  });
});

// ─────────────────── getProtocolSummary ───────────────────

describe('getProtocolSummary', () => {
  // Case 25
  it('happy path — singleton mapped correctly', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        totalTvlUsd: 12345678.42,
        volume24hUsd: 9876543.21,
        txCount24h: 1532,
        activeWallets24h: 287,
        poolCount: 12,
        cumulativeDistributorCount: 8,
        blockTime: 1714780800,
        updatedAt: '2026-05-08T12:00:00.000Z',
      }),
    );
    const summary = await getProtocolSummary({
      baseUrl: BASE_URL,
      fetch: fetchMock,
    });
    expect(summary.totalTvlUsd).toBe(12345678.42);
    expect(summary.poolCount).toBe(12);
    expect(summary.cumulativeDistributorCount).toBe(8);
    expect(summary.updatedAt).toBe('2026-05-08T12:00:00.000Z');
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toBe(`${BASE_URL}/markets/summary`);
  });

  // Case 26
  it('404 (singleton missing) → MarketsFetchError(status=404)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({}, { ok: false, status: 404 }),
    );
    try {
      await getProtocolSummary({ baseUrl: BASE_URL, fetch: fetchMock });
      expect.fail('expected MarketsFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketsFetchError);
      expect((e as MarketsFetchError).status).toBe(404);
    }
  });

  // Case 27
  it('network error → MarketsFetchError(status=null)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    try {
      await getProtocolSummary({
        baseUrl: BASE_URL,
        fetch: fetchMock as unknown as typeof fetch,
      });
      expect.fail('expected MarketsFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketsFetchError);
      expect((e as MarketsFetchError).status).toBeNull();
    }
  });

  // Case 28
  it('cluster resolution: localnet → http://localhost:3010', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        totalTvlUsd: 0,
        volume24hUsd: 0,
        txCount24h: 0,
        activeWallets24h: 0,
        poolCount: 0,
        cumulativeDistributorCount: 0,
        blockTime: 0,
        updatedAt: '1970-01-01T00:00:00.000Z',
      }),
    );
    await getProtocolSummary({ cluster: 'localnet', fetch: fetchMock });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toBe(`${BACKEND_API_BASE_URLS.localnet}/markets/summary`);
  });
});

// ─────────────────── shared error paths ───────────────────

describe('markets client — shared error paths', () => {
  // Case 29
  it('malformed JSON body → MarketsFetchError(status=200)', async () => {
    const fetchMock = vi.fn(async () => malformedJsonResponse(200));
    try {
      await getProtocolSummary({ baseUrl: BASE_URL, fetch: fetchMock });
      expect.fail('expected MarketsFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketsFetchError);
      expect((e as MarketsFetchError).status).toBe(200);
      expect((e as MarketsFetchError).message).toContain('malformed JSON');
    }
  });

  // Case 30
  it('non-object body → MarketsFetchError', async () => {
    const fetchMock = vi.fn(async () => nonObjectResponse('"not an object"'));
    try {
      await getProtocolSummary({ baseUrl: BASE_URL, fetch: fetchMock });
      expect.fail('expected MarketsFetchError');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketsFetchError);
      expect((e as MarketsFetchError).message).toContain('malformed body');
    }
  });
});
