// Single error class thrown by `@areal/sdk/history` for every non-success
// network outcome. Validation errors (bad wallet, bad limit, missing
// baseUrl) deliberately throw plain `TypeError` instead — they are caller
// bugs, not runtime conditions.

/**
 * Thrown when a history endpoint returns a non-2xx status, when the body
 * cannot be parsed, or when the underlying fetch rejects (network down,
 * CORS, etc.). `status` is `null` for transport-level failures because
 * there is no HTTP response to inspect.
 */
export class HistoryFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'HistoryFetchError';
  }
}
