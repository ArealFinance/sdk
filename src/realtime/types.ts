// Public type surface for `@areal/sdk/realtime`.
//
// Phase 12.3.2 — Socket.IO wrapper over the backend `/realtime` namespace
// (Phase 12.3.1, REALTIME-PROTOCOL.md FROZEN 2026-05-08).
//
// Wire shapes mirror the backend emit contract verbatim. The wrapper adds
// two synthetic events on top:
//   - `stale` — emitted per-room when no payload arrives within
//     `staleAfterMs` of the last event (or of subscribe-ack-ok).
//   - `live`  — emitted per-room when a payload arrives after the room
//     was previously marked stale.
// Plus a passthrough `connect_error` channel so consumers can show a
// reconnect banner without diving into the raw socket.io API.

import type { ClusterName } from '../network/clusters.js';

// ─────────────────────────── room shapes ───────────────────────────

/**
 * Room name accepted by the server's `subscribe` validator. Mirrors the
 * frozen contract in `backend/src/modules/realtime/rooms.ts`.
 *
 *   - `'protocol'`        — public, anonymous OK
 *   - `'pool:<base58>'`   — public, anonymous OK
 *   - `'wallet:<base58>'` — JWT required AND `jwt.sub === <base58>`
 */
export type Room = 'protocol' | `pool:${string}` | `wallet:${string}`;

/**
 * Builders for room names. Cheaper than literal string concat in callers
 * because they centralise the prefix and keep the literal-template type
 * narrow.
 */
export const Rooms = {
  /** Singleton protocol-wide room. */
  protocol: 'protocol' as const,
  /** Per-pool room. `pool` MUST be a base58 pubkey — caller's responsibility. */
  pool: (pool: string): `pool:${string}` => `pool:${pool}`,
  /** Per-wallet room. JWT `sub` MUST match `wallet`. */
  wallet: (wallet: string): `wallet:${string}` => `wallet:${wallet}`,
};

// ─────────────────────────── transaction kinds ───────────────────────────

/**
 * Set of transaction kinds emitted by `transaction_indexed`. Mirrors the
 * backend `kind` discriminator.
 *
 * `RevenueDistributed` is wallet-less and does NOT emit
 * `transaction_indexed` — per-wallet visibility surfaces via the
 * corresponding `RewardsClaimed` events on subsequent claims.
 */
export type TransactionKind =
  | 'claim'
  | 'swap'
  | 'add_lp'
  | 'remove_lp'
  | 'zap_lp'
  | 'mint_rwt';

// ─────────────────────────── event payloads ───────────────────────────

/**
 * Emitted by the server to `pool:<base58>` rooms after the
 * `MarketsAggregatorService.snapshotPools60s` cron commits a row (~60s
 * cadence). u64 fields are decimal **strings** (lossless past 2^53);
 * `tvlUsd` is a JS `number | null`.
 */
export interface PoolSnapshotEvent {
  /** Pool PDA (base58). */
  pool: string;
  /** Unix seconds at snapshot time (cron wall-clock, not Solana slot). */
  blockTime: number;
  /** Decimal string — same as `reserveA` for now. */
  tvlA: string;
  /** Decimal string — same as `reserveB` for now. */
  tvlB: string;
  /** USDC-denominated TVL. `null` when neither side priceable. */
  tvlUsd: number | null;
  /** Decimal string — on-chain reserveA at snapshot time. */
  reserveA: string;
  /** Decimal string — on-chain reserveB at snapshot time. */
  reserveB: string;
  /** Decimal string — q64.64 fee-per-share accumulator A. */
  feeGrowthA: string;
  /** Decimal string — q64.64 fee-per-share accumulator B. */
  feeGrowthB: string;
  /** Decimal string — totalLpShares. */
  lpSupply: string;
}

/**
 * Emitted by the server to the `protocol` room after the
 * `MarketsAggregatorService.writeProtocolSummary30s` cron commits the
 * singleton UPDATE (~30s cadence).
 */
export interface ProtocolSummaryTickEvent {
  /** Protocol-wide TVL in USD. */
  totalTvlUsd: number;
  /** Protocol-wide 24h volume in USD. */
  volume24hUsd: number;
  /** Distinct tx count over the 24h window. */
  txCount24h: number;
  /** Distinct wallets active over the 24h window. */
  activeWallets24h: number;
  /** Number of pools indexed. */
  poolCount: number;
  /**
   * Distinct primary_actor over the full event history of
   * `RevenueDistributed` — cumulative-since-deploy, not current-state.
   */
  cumulativeDistributorCount: number;
  /** Unix seconds at last refresh. */
  blockTime: number;
}

/**
 * Emitted by the server to `wallet:<base58>` rooms after `IndexerConsumer`
 * commits the wrapping persist+project transaction. Never emitted inside
 * the transaction so a rollback can't leak a transient notification.
 */
export interface TransactionIndexedEvent {
  /** Wallet (base58) — same as the room's `<base58>` suffix. */
  wallet: string;
  /** Discriminator — see `TransactionKind`. */
  kind: TransactionKind;
  /** Solana tx signature (base58). */
  signature: string;
  /** Unix seconds at chain block_time. */
  blockTime: number;
}

// ─────────────────── synthetic event payloads ───────────────────

/**
 * Synthetic — emitted by the SDK (NOT the server) when a subscribed room
 * has not received an event within `staleAfterMs`. Also emitted on
 * `disconnect` for every room currently in the subscriptions set.
 */
export interface StaleEvent {
  /** The room that has gone stale. */
  room: Room;
  /** Unix milliseconds — last time we observed an event on this room. */
  lastEventAt: number;
}

/**
 * Synthetic — emitted by the SDK when a previously-stale room receives an
 * event again (i.e. the stream caught up).
 */
export interface LiveEvent {
  /** The room that just transitioned stale → live. */
  room: Room;
}

/**
 * Synthetic — emitted by the SDK on socket.io's `connect_error` lifecycle
 * event with the token redacted. Consumers can render a reconnect banner
 * without depending on the raw socket.
 */
export interface ConnectErrorEvent {
  /** Redacted error message. */
  message: string;
}

// ─────────────────────────── event map ───────────────────────────

/**
 * Maps event channel name → payload. Used by `RealtimeClient.on` /
 * `.off` for typed listeners.
 */
export interface RealtimeEventMap {
  /** Per-pool snapshot tick. */
  pool_snapshot: PoolSnapshotEvent;
  /** Protocol-wide summary tick. */
  protocol_summary_tick: ProtocolSummaryTickEvent;
  /** Per-wallet transaction notification. */
  transaction_indexed: TransactionIndexedEvent;
  /** Synthetic — see `StaleEvent`. */
  stale: StaleEvent;
  /** Synthetic — see `LiveEvent`. */
  live: LiveEvent;
  /** Synthetic — see `ConnectErrorEvent`. */
  connect_error: ConnectErrorEvent;
}

// ─────────────────────────── ack shapes ───────────────────────────

/** Server ack on success. */
export interface SubscribeAck {
  ok: true;
}

/** Server ack on failure. */
export interface SubscribeFailureAck {
  ok: false;
  /**
   * - `'auth_required'` — anonymous socket subscribed to a private room.
   * - `'auth_mismatch'` — JWT.sub does not match the room's pubkey.
   * - `'unknown_room'`  — malformed / unrecognised shape.
   */
  error: 'auth_required' | 'auth_mismatch' | 'unknown_room';
}

/**
 * Discriminated union returned by `RealtimeClient.subscribe`. Failures do
 * NOT throw — callers branch on `ok`. Throws (synchronously) only for
 * caller bugs (bad room shape, mismatched JWT) and (asynchronously) on
 * 5s ack timeout.
 */
export type SubscribeResult = SubscribeAck | SubscribeFailureAck;

// ─────────────────────────── connect options ───────────────────────────

/**
 * Type for the test-only injected socket.io factory. Kept loosely typed —
 * a precise type would couple this module to socket.io-client's full
 * surface, which we explicitly want to avoid (`socket.io-client` is a
 * runtime dep, NOT in `external`). The shape it must return is duck-typed
 * against `MinimalSocket` in `client.ts`.
 *
 * **For testing only.** Production callers must not pass this.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IoFactory = (url: string, opts: any) => any;

/**
 * Options passed to `connect()`. Either `baseUrl` or `cluster` must
 * resolve to a non-empty WS URL — otherwise `connect()` throws
 * `TypeError` synchronously.
 */
export interface ConnectOptions {
  /** Explicit WebSocket URL (e.g. `wss://api.areal.finance/realtime`). */
  baseUrl?: string;
  /** Falls back to `REALTIME_WS_URLS[cluster]`. */
  cluster?: ClusterName;
  /**
   * JWT. Sent as both `Authorization: Bearer <token>` (via
   * `extraHeaders`) AND `auth.token` — header takes precedence
   * server-side. Omit for anonymous read of public rooms.
   */
  token?: string;
  /**
   * Per-room stale threshold in milliseconds. Default 30_000.
   *
   * TODO(12.3.3): per-room override (e.g. `pool` rooms have a 60s cadence
   * so 90_000 is more appropriate; `protocol` is 30s so the default fits).
   */
  staleAfterMs?: number;
  /** Forwarded to socket.io-client. Default 1000ms. */
  reconnectionDelay?: number;
  /** Forwarded to socket.io-client. Default 5000ms. */
  reconnectionDelayMax?: number;
  /** Forwarded to socket.io-client. Default `Infinity`. */
  reconnectionAttempts?: number;
  /**
   * Test-only: inject a fake `io()` factory. Production callers must not
   * pass this — they will get the real `socket.io-client.io` import.
   */
  ioFactory?: IoFactory;
}

// ─────────────────────────── client interface ───────────────────────────

/**
 * The `RealtimeClient` returned by `connect()`.
 *
 * Lifecycle:
 *   1. `connect(opts)` returns a client immediately; the underlying
 *      socket connects in the background.
 *   2. Call `subscribe(room)` once the socket is established (it is safe
 *      to call before `connected` becomes `true` — socket.io-client
 *      buffers the emit until handshake completes).
 *   3. Register `on(channel, listener)` for events of interest. The
 *      returned function unsubscribes the listener for DX.
 *   4. Call `disconnect()` to tear down. Re-connecting after a `disconnect()`
 *      requires a new `connect()` call — clients are single-use.
 *
 * Token rotation: there is no `setToken()` API. To rotate, call
 * `disconnect()` and then `connect({ token: newToken })`. Re-subscribe to
 * any rooms you care about — subscriptions are NOT restored across
 * connect/disconnect boundaries.
 */
export interface RealtimeClient {
  /**
   * Subscribe to a room. Returns an ack envelope — failures do NOT throw.
   *
   * @throws TypeError synchronously on:
   *   - bad room shape (`unknown_room` would be caller bug, fail fast)
   *   - `wallet:<pk>` where `pk !== jwt.sub` (DX optimisation)
   * @throws Error('subscribe ack timeout') on 5s ack timeout
   */
  subscribe(room: Room): Promise<SubscribeResult>;

  /**
   * Unsubscribe from a room. Idempotent: leaving a room you're not in
   * is a no-op at the adapter level.
   */
  unsubscribe(room: Room): Promise<{ ok: boolean }>;

  /**
   * Register a listener for an event channel. Returns an unsubscribe
   * function (DX: `const off = client.on('pool_snapshot', ...); off();`).
   */
  on<K extends keyof RealtimeEventMap>(
    channel: K,
    listener: (payload: RealtimeEventMap[K]) => void,
  ): () => void;

  /** Remove a previously registered listener. */
  off<K extends keyof RealtimeEventMap>(
    channel: K,
    listener: (payload: RealtimeEventMap[K]) => void,
  ): void;

  /**
   * Tear down the underlying socket and clear all subscriptions, listeners,
   * stale timers, and last-event timestamps. Single-use — do NOT call
   * `subscribe`/`on` after this.
   */
  disconnect(): void;

  /** Whether the underlying socket is currently connected. */
  readonly connected: boolean;

  /**
   * Snapshot of currently-subscribed rooms. Insertion-ordered (matches
   * subscription order) so reconnect replay is deterministic.
   */
  readonly subscriptions: ReadonlySet<Room>;
}
