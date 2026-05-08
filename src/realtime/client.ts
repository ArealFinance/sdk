// Socket.IO wrapper for the backend `/realtime` namespace.
//
// REALTIME-PROTOCOL.md (Phase 12.3.1, FROZEN 2026-05-08) is the source of
// truth for wire shapes. This client adds three things on top of raw
// socket.io-client:
//
//   1. **Subscribe ack handling** — server returns
//      `{ ok: true } | { ok: false, error }`. We surface that as a
//      discriminated `SubscribeResult` so callers can pattern-match
//      without a try/catch.
//
//   2. **Reconnect replay** — Socket.IO does NOT persist room membership
//      across the underlying connection. We track subscriptions in
//      insertion order (`Set<Room>`) and re-emit `subscribe` for each on
//      every `connect` lifecycle event (covers initial connect AND every
//      reconnect — socket.io-client fires `connect` for both).
//
//   3. **Per-room stale detection** — the server does NOT send keepalives.
//      The client schedules a per-room timer that fires `staleAfterMs`
//      after the last observed event (or after subscribe-ack-ok). When
//      a payload arrives on a stale room, we emit `live` and reset the
//      timer. On `disconnect`, every subscribed room is definitionally
//      stale — we emit a synthetic `stale` per room.
//
// Security: the JWT is plumbed through socket.io-client's `auth.token`
// AND `extraHeaders.Authorization`. We never log it, never put it in
// `Error.message`, never include it in any synthetic event payload.
// `connect_error` messages are scrubbed before re-emission as a defence
// against future socket.io-client versions that might leak it.

import { REALTIME_WS_URLS } from '../network/constants.js';
import type {
  ConnectOptions,
  ConnectErrorEvent,
  IoFactory,
  PoolSnapshotEvent,
  ProtocolSummaryTickEvent,
  RealtimeClient,
  RealtimeEventMap,
  Room,
  SubscribeResult,
  TransactionIndexedEvent,
} from './types.js';
// Static ESM import for the real socket.io-client factory.
//
// Earlier this was a `require('socket.io-client')` inside a lazy factory to
// "save bundle size for tests that pass `ioFactory`". That was a footgun —
// tsup transpiled it to a `__require()` shim that throws "Dynamic require
// of … is not supported" in pure-ESM consumers (SvelteKit prod / Vite SSR /
// Cloudflare Workers / modern Node ESM). Anyone importing
// `@areal/sdk/realtime` will call `connect()` and pay the dep cost anyway,
// so a real ESM import is the right shape. Tests that inject `ioFactory`
// still bypass this entirely.
import { io as defaultIo } from 'socket.io-client';

const SUBSCRIBE_ACK_TIMEOUT_MS = 5_000;
const DEFAULT_STALE_AFTER_MS = 30_000;
const DEFAULT_RECONNECTION_DELAY_MS = 1_000;
const DEFAULT_RECONNECTION_DELAY_MAX_MS = 5_000;

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Minimal subset of socket.io-client's `Socket` we depend on. Kept as a
 * structural type so:
 *   - `socket.io-client` is loaded lazily (real `io` import only happens
 *     when the test does NOT pass `ioFactory`).
 *   - Tests can pass a hand-rolled fake without depending on the real
 *     library's full surface.
 */
interface MinimalSocket {
  connected: boolean;
  on(channel: string, listener: (...args: unknown[]) => void): unknown;
  off?(channel: string, listener?: (...args: unknown[]) => void): unknown;
  emit(channel: string, ...args: unknown[]): unknown;
  disconnect(): unknown;
}

/**
 * Decode a JWT's `sub` claim using base64url. NEVER throws — on any
 * parse error returns `null` so the caller falls through to "no sub"
 * (i.e. lets the server return `auth_required`).
 *
 * We deliberately do NOT verify the signature. This is a DX-only check
 * to fail fast on `subscribe('wallet:X')` when the JWT is for a
 * different wallet — the server is still the source of truth and will
 * return `auth_mismatch` if we somehow get past this guard.
 */
function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]!;
    // base64url → base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Pad to multiple of 4
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const obj = JSON.parse(json) as { sub?: unknown };
    return typeof obj.sub === 'string' ? obj.sub : null;
  } catch {
    return null;
  }
}

/** Validate a room shape against the same regex the backend uses. */
function isValidRoom(room: string): room is Room {
  if (room === 'protocol') return true;
  if (room.startsWith('pool:')) return BASE58_RE.test(room.slice(5));
  if (room.startsWith('wallet:')) return BASE58_RE.test(room.slice(7));
  return false;
}

function defaultIoFactory(): IoFactory {
  return defaultIo as unknown as IoFactory;
}

// Match a full JWT-shaped substring: 3 base64url segments separated by dots,
// with the leading segment starting with `eyJ` (base64url of `{"`). The
// length floors are loose lower bounds — real JWTs are much longer, but we
// don't want to miss a defensively-minted short token.
const JWT_SHAPE_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
// Catches truncated JWT prefixes (e.g. socket.io-client log slicing the
// first ~30 chars of `auth.token`). Run AFTER the full-shape pass so we
// don't double-redact already-replaced segments.
const JWT_PREFIX_RE = /eyJ[A-Za-z0-9_-]{20,}/g;

/**
 * Strip the configured token from a free-form error message and, as a
 * second line of defence, any JWT-shaped substring that might have leaked.
 *
 * Pass order matters:
 *   1. Full-string `token` replace (fastest, exact match — covers the
 *      common case where socket.io-client logs the verbatim auth value).
 *   2. JWT-shape regex (3 dot-separated base64url segments) — catches
 *      future versions that might log a foreign token.
 *   3. JWT-prefix regex — catches truncated token prefixes
 *      (e.g. `eyJhbGciOi…` slices).
 *
 * The regex passes are deliberately broad: if a non-JWT happens to match,
 * redacting it is preferable to leaking a real token.
 */
function redactToken(message: string, token: string | undefined): string {
  let out = message;
  if (token) {
    out = out.split(token).join('[REDACTED]');
  }
  out = out.replace(JWT_SHAPE_RE, '[REDACTED]');
  out = out.replace(JWT_PREFIX_RE, '[REDACTED]');
  return out;
}

/**
 * Connect to the `/realtime` namespace. Returns a client immediately; the
 * underlying socket establishes in the background. Call `subscribe(room)`
 * once you have a room of interest — it's safe to call before
 * `client.connected` becomes `true` (socket.io-client buffers).
 *
 * @throws TypeError if neither `baseUrl` nor `cluster` resolves.
 */
export function connect(opts: ConnectOptions): RealtimeClient {
  // ─── URL resolution ───
  let url: string;
  if (opts.baseUrl !== undefined) {
    if (typeof opts.baseUrl !== 'string' || opts.baseUrl.length === 0) {
      throw new TypeError('realtime: baseUrl must be a non-empty string');
    }
    url = opts.baseUrl;
  } else if (opts.cluster !== undefined) {
    const resolved = REALTIME_WS_URLS[opts.cluster];
    if (!resolved) {
      throw new TypeError(`realtime: unknown cluster "${opts.cluster}"`);
    }
    url = resolved;
  } else {
    throw new TypeError('realtime: baseUrl or cluster required');
  }

  const staleAfterMs = opts.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const token = opts.token;

  // ─── State ───
  // Insertion-ordered subscriptions so reconnect replay is deterministic.
  const subscriptions = new Set<Room>();
  // Per-room timers + their last-event timestamps.
  const staleTimers = new Map<Room, ReturnType<typeof setTimeout>>();
  const staleRooms = new Set<Room>();
  const lastEventAt = new Map<Room, number>();
  // Listeners keyed by channel.
  const listeners = new Map<
    keyof RealtimeEventMap,
    Set<(payload: unknown) => void>
  >();
  // In-flight ack-races for `subscribe()`/`unsubscribe()` — tracked so that
  // `disconnect()` can cancel them deterministically. Without this, the 5s
  // ack timers continue running and reject their Promises long after
  // listeners have been cleared, producing "subscribe ack timeout" /
  // "unsubscribe ack timeout" unhandled rejection warnings in Node consumers.
  type PendingAck = {
    timer: ReturnType<typeof setTimeout>;
    reject: (err: Error) => void;
  };
  const pendingAcks = new Set<PendingAck>();
  // In-flight subscribe()s, indexed by the entry that owns them. Each entry
  // carries a `voided` flag flipped to `true` by a subsequent unsubscribe()
  // for the same room. The subscribe-ack handler checks `voided` before
  // adding the room to local state, so a subscribe-then-unsubscribe race
  // (where the unsubscribe-ack arrives BEFORE the subscribe-ack) can't
  // resurrect a room the consumer has already asked to leave.
  type PendingSubscribe = { room: Room; voided: boolean };
  const pendingSubscribes = new Set<PendingSubscribe>();

  // ─── Helper: emit synthetic event to local listeners ───
  function emitLocal<K extends keyof RealtimeEventMap>(
    channel: K,
    payload: RealtimeEventMap[K],
  ): void {
    const set = listeners.get(channel);
    if (!set) return;
    // Snapshot so listeners that mutate during dispatch are safe.
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch {
        // Listener errors don't break the dispatch loop.
      }
    }
  }

  // ─── Helper: stale-timer lifecycle ───
  function scheduleStale(room: Room): void {
    clearStaleTimer(room);
    const t = setTimeout(() => {
      staleRooms.add(room);
      emitLocal('stale', { room, lastEventAt: lastEventAt.get(room) ?? Date.now() });
    }, staleAfterMs);
    staleTimers.set(room, t);
  }

  function clearStaleTimer(room: Room): void {
    const t = staleTimers.get(room);
    if (t !== undefined) {
      clearTimeout(t);
      staleTimers.delete(room);
    }
  }

  function noteEvent(room: Room): void {
    lastEventAt.set(room, Date.now());
    if (staleRooms.has(room)) {
      staleRooms.delete(room);
      emitLocal('live', { room });
    }
    if (subscriptions.has(room)) {
      scheduleStale(room);
    }
  }

  // ─── socket.io-client init ───
  const ioFactory = opts.ioFactory ?? defaultIoFactory();
  const ioOptions: Record<string, unknown> = {
    transports: ['websocket'],
    reconnectionAttempts: opts.reconnectionAttempts ?? Infinity,
    reconnectionDelay: opts.reconnectionDelay ?? DEFAULT_RECONNECTION_DELAY_MS,
    reconnectionDelayMax:
      opts.reconnectionDelayMax ?? DEFAULT_RECONNECTION_DELAY_MAX_MS,
  };
  if (token !== undefined) {
    ioOptions.auth = { token };
    ioOptions.extraHeaders = { Authorization: `Bearer ${token}` };
  }
  const socket = ioFactory(url, ioOptions) as MinimalSocket;

  // ─── server emits ───
  socket.on('pool_snapshot', (...args: unknown[]) => {
    const payload = args[0] as PoolSnapshotEvent;
    if (!payload || typeof payload !== 'object') return;
    const room = `pool:${payload.pool}` as Room;
    noteEvent(room);
    emitLocal('pool_snapshot', payload);
  });

  socket.on('protocol_summary_tick', (...args: unknown[]) => {
    const payload = args[0] as ProtocolSummaryTickEvent;
    if (!payload || typeof payload !== 'object') return;
    noteEvent('protocol');
    emitLocal('protocol_summary_tick', payload);
  });

  socket.on('transaction_indexed', (...args: unknown[]) => {
    const payload = args[0] as TransactionIndexedEvent;
    if (!payload || typeof payload !== 'object') return;
    const room = `wallet:${payload.wallet}` as Room;
    noteEvent(room);
    emitLocal('transaction_indexed', payload);
  });

  // ─── lifecycle ───
  socket.on('connect', () => {
    // Replay subscriptions in insertion order. Fire-and-forget — if a
    // subsequent reconnect cycle clears auth (e.g. token rotation), the
    // server returns `auth_required` and the room stays in our set but
    // produces no events. That's acceptable for transient auth issues;
    // consumers in production should `disconnect()` + `connect()` on
    // token rotation per the docs.
    for (const room of subscriptions) {
      try {
        socket.emit('subscribe', { room }, () => {
          // Ignore ack — we already accounted for this subscription.
          // If it fails, the server simply won't emit; no data corruption.
        });
      } catch {
        // Swallow — emit failures during reconnect are surfaced via the
        // socket's own 'connect_error' lifecycle event.
      }
      // Restart the stale timer; the room may have outlived its prior
      // schedule during the disconnect window.
      scheduleStale(room);
    }
  });

  socket.on('disconnect', () => {
    // Every subscribed room is definitionally stale post-disconnect:
    // their lastEventAt is frozen at the moment of disconnect.
    for (const room of subscriptions) {
      clearStaleTimer(room);
      staleRooms.add(room);
      emitLocal('stale', {
        room,
        lastEventAt: lastEventAt.get(room) ?? Date.now(),
      });
    }
  });

  socket.on('connect_error', (...args: unknown[]) => {
    const err = args[0] as { message?: unknown } | undefined;
    const raw = err && typeof err.message === 'string' ? err.message : 'connect_error';
    const safe = redactToken(raw, token);
    const event: ConnectErrorEvent = { message: safe };
    emitLocal('connect_error', event);
  });

  // ─── public methods ───
  // NOTE: `subscribe` is intentionally a regular (non-async) function so
  // validation `throw`s propagate synchronously to the caller. An `async`
  // function would wrap any sync throw in a rejected Promise, breaking
  // the DX contract that bad-room-shape / wallet-mismatch errors fail
  // fast at the call site.
  function subscribe(room: Room): Promise<SubscribeResult> {
    if (typeof room !== 'string' || !isValidRoom(room)) {
      throw new TypeError(`subscribe: invalid room shape "${String(room)}"`);
    }

    // DX guard: if subscribing to wallet:<pk> with a token, decode the
    // JWT's `sub` claim and reject mismatches synchronously. The server
    // would return `auth_mismatch` anyway — this just shortens the
    // failure path.
    if (room.startsWith('wallet:') && token !== undefined) {
      const sub = decodeJwtSub(token);
      const want = room.slice(7);
      // Only enforce when we successfully decoded a sub. If the decode
      // fails (malformed token), let the server have the final say.
      if (sub !== null && sub !== want) {
        throw new TypeError(
          'subscribe: wallet room pubkey must match jwt.sub',
        );
      }
    }

    return new Promise<SubscribeResult>((resolve, reject) => {
      let settled = false;
      let entry: PendingAck;
      const subEntry: PendingSubscribe = { room, voided: false };
      pendingSubscribes.add(subEntry);
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        pendingAcks.delete(entry);
        pendingSubscribes.delete(subEntry);
        reject(new Error('subscribe ack timeout'));
      }, SUBSCRIBE_ACK_TIMEOUT_MS);
      entry = { timer, reject };
      pendingAcks.add(entry);

      try {
        socket.emit('subscribe', { room }, (ack: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          pendingAcks.delete(entry);
          pendingSubscribes.delete(subEntry);

          // Defensive parse — server contract is `{ ok: true } |
          // { ok: false, error }` but we don't trust the wire blindly.
          if (
            ack &&
            typeof ack === 'object' &&
            (ack as { ok?: unknown }).ok === true
          ) {
            // Race guard: if a concurrent unsubscribe(room) voided this
            // subscribe before the ack arrived, do NOT add the room to
            // local state — otherwise we drift out of sync with the
            // consumer's intent. The promise still resolves ok:true (the
            // subscribe itself succeeded server-side; the consumer's
            // subsequent unsubscribe is responsible for cleaning up the
            // server-side membership).
            if (!subEntry.voided) {
              subscriptions.add(room);
              scheduleStale(room);
            }
            resolve({ ok: true });
            return;
          }

          const err = (ack as { error?: unknown } | null)?.error;
          if (
            err === 'auth_required' ||
            err === 'auth_mismatch' ||
            err === 'unknown_room'
          ) {
            resolve({ ok: false, error: err });
          } else {
            // Unknown error code — surface as `unknown_room` so the
            // caller still gets a typed result.
            resolve({ ok: false, error: 'unknown_room' });
          }
        });
      } catch (e) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        pendingAcks.delete(entry);
        pendingSubscribes.delete(subEntry);
        reject(e);
      }
    });
  }

  function unsubscribe(room: Room): Promise<{ ok: boolean }> {
    if (typeof room !== 'string' || !isValidRoom(room)) {
      throw new TypeError(`unsubscribe: invalid room shape "${String(room)}"`);
    }
    // Race guard: void any in-flight subscribe(room) so when its ack
    // eventually returns, the subscribe-ack handler skips adding the room
    // to local state. Without this, a late ok:true ack would re-add the
    // room AFTER the consumer asked to leave it.
    for (const sub of pendingSubscribes) {
      if (sub.room === room) sub.voided = true;
    }
    return new Promise<{ ok: boolean }>((resolve, reject) => {
      let settled = false;
      let entry: PendingAck;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        pendingAcks.delete(entry);
        reject(new Error('unsubscribe ack timeout'));
      }, SUBSCRIBE_ACK_TIMEOUT_MS);
      entry = { timer, reject };
      pendingAcks.add(entry);

      try {
        socket.emit('unsubscribe', { room }, (ack: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          pendingAcks.delete(entry);

          // Always tear down local state — even if the server replied
          // with a non-ok ack we want to stop receiving events for the
          // room locally.
          clearStaleTimer(room);
          subscriptions.delete(room);
          staleRooms.delete(room);
          lastEventAt.delete(room);

          const ok =
            ack &&
            typeof ack === 'object' &&
            (ack as { ok?: unknown }).ok === true;
          resolve({ ok: !!ok });
        });
      } catch (e) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        pendingAcks.delete(entry);
        reject(e);
      }
    });
  }

  function on<K extends keyof RealtimeEventMap>(
    channel: K,
    listener: (payload: RealtimeEventMap[K]) => void,
  ): () => void {
    let set = listeners.get(channel);
    if (!set) {
      set = new Set();
      listeners.set(channel, set);
    }
    // Cast away the per-channel narrowing for the storage Set; we keep
    // the types correct on the public surface.
    set.add(listener as (payload: unknown) => void);
    return () => off(channel, listener);
  }

  function off<K extends keyof RealtimeEventMap>(
    channel: K,
    listener: (payload: RealtimeEventMap[K]) => void,
  ): void {
    const set = listeners.get(channel);
    if (!set) return;
    set.delete(listener as (payload: unknown) => void);
  }

  function disconnect(): void {
    // Reject any in-flight subscribe()/unsubscribe() promises BEFORE we
    // tear down the socket — otherwise their 5s ack timers fire later
    // and reject to no listener (unhandled rejection warning in Node).
    for (const entry of pendingAcks) {
      clearTimeout(entry.timer);
      entry.reject(new Error('client disconnected'));
    }
    pendingAcks.clear();

    try {
      socket.disconnect();
    } catch {
      // Already disconnected — ignore.
    }
    // Clear all room-scoped state.
    for (const room of subscriptions) clearStaleTimer(room);
    subscriptions.clear();
    staleRooms.clear();
    lastEventAt.clear();
    pendingSubscribes.clear();
    // Drop listeners so leftover references can be GC'd.
    listeners.clear();
  }

  return {
    subscribe,
    unsubscribe,
    on,
    off,
    disconnect,
    get connected(): boolean {
      return socket.connected === true;
    },
    get subscriptions(): ReadonlySet<Room> {
      return subscriptions;
    },
  };
}
