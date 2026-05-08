// Single error class thrown by `@areal/sdk/markets-rest` for every non-success
// network outcome. Validation errors (bad pool, bad limit/days/from/to,
// missing baseUrl) deliberately throw plain `TypeError` instead — they are
// caller bugs, not runtime conditions.
//
// Mirrors `HistoryFetchError` exactly, kept as its own class so consumers
// can branch on `instanceof MarketsFetchError` without importing both
// modules.

/**
 * Thrown when a markets endpoint returns a non-2xx status, when the body
 * cannot be parsed, or when the underlying fetch rejects (network down,
 * CORS, etc.). `status` is `null` for transport-level failures because
 * there is no HTTP response to inspect.
 *
 * `404` from `/markets/summary` is a valid runtime condition (singleton
 * missing pre-migration) and surfaces here — NOT as a `TypeError`.
 *
 * @example
 * ```ts
 * try {
 *   const summary = await getProtocolSummary({ cluster: 'mainnet' });
 * } catch (e) {
 *   if (e instanceof MarketsFetchError) {
 *     // Backend reachable: e.status (e.g. 404, 500), e.url
 *     // Network failure:   e.status === null, e.url is the attempted URL
 *   } else if (e instanceof TypeError) {
 *     // Caller bug: invalid pool, limit/days/from/to, or missing baseUrl/cluster
 *   }
 * }
 * ```
 */
export class MarketsFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'MarketsFetchError';
  }
}
