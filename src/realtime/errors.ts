// Error classes for `@areal/sdk/realtime`.
//
// Note: `subscribe()` does NOT throw `SubscribeError` — it returns a
// discriminated `SubscribeResult` so callers can pattern-match without a
// try/catch. `SubscribeError` is exported anyway because Phase 12.3.3
// will introduce a `subscribeOrThrow` convenience that uses it; we want
// the type already in the public surface so consumers can write narrowing
// guards today and the helper can land additively.
//
// Caller bugs throw plain `TypeError` (bad room shape, JWT/wallet
// mismatch). 5s ack timeouts throw a plain `Error` — distinct from
// `SubscribeError` because they're transport-level, not auth-level.

/**
 * Thrown when the underlying socket connection fails outright (DNS, CORS,
 * handshake refused). Currently emitted only via the synthetic
 * `connect_error` event channel — kept here as a dedicated class so a
 * future opt-in `connectOrThrow` helper can use it.
 */
export class RealtimeConnectError extends Error {
  constructor(
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'RealtimeConnectError';
  }
}

/**
 * Reserved for the Phase 12.3.3 `subscribeOrThrow` convenience. Mirrors
 * the shape of a `SubscribeFailureAck` so the helper can do
 * `throw new SubscribeError(ack.error, room)`.
 *
 * NOT thrown by the current `subscribe()` API — that one returns the
 * discriminated `SubscribeResult` instead.
 */
export class SubscribeError extends Error {
  constructor(
    public readonly kind: 'auth_required' | 'auth_mismatch' | 'unknown_room',
    public readonly room: string,
  ) {
    super(`subscribe failed: ${kind} (room=${room})`);
    this.name = 'SubscribeError';
  }
}
