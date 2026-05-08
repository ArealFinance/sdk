// Unit tests for `sdk/src/realtime/`.
//
// All tests use a hand-rolled `FakeSocket` injected via the `ioFactory`
// option — no `socket.io-client` is loaded. The helper lets each test
// drive arbitrary lifecycle events ('connect', 'disconnect',
// 'connect_error', 'pool_snapshot', etc.) and inspect the emit log.
//
// Invariants exercised (Phase 12.3.2 architect's enumeration):
//
//   1.  connect throws TypeError on missing baseUrl/cluster
//   2.  connect throws TypeError on unknown cluster
//   3.  connect resolves cluster via REALTIME_WS_URLS
//   4.  connect passes auth.token + extraHeaders.Authorization when token set
//   5.  connect passes no auth when token absent (anonymous)
//   6.  subscribe('protocol') ack ok → SubscribeResult.ok=true
//   7.  subscribe('pool:<bad>') → TypeError (bad room shape)
//   8.  subscribe('wallet:<X>') with JWT for Y (mismatched sub) → TypeError
//   9.  subscribe('wallet:<X>') with JWT for X (matched sub) → emit goes through
//   10. subscribe ack 'auth_required' → SubscribeResult.ok=false, error='auth_required'
//   11. subscribe ack 'auth_mismatch' → SubscribeResult.ok=false, error='auth_mismatch'
//   12. subscribe ack 'unknown_room' → SubscribeResult.ok=false, error='unknown_room'
//   13. subscribe never acks → rejects with Error('subscribe ack timeout')
//   14. subscribe ack-fail does NOT close socket
//   15. unsubscribe clears local state (subscriptions, timer)
//   16. on/off — listener registered, fired, removed
//   17. reconnect replay: re-emits subscribe in insertion order on each 'connect'
//   18. stale: timer fires after staleAfterMs of inactivity → 'stale' event
//   19. stale → live transition: payload after stale → 'live' event
//   20. disconnect: clears subscriptions + timers, emits synthetic 'stale' per room
//   21. connect_error: redacts token from message
//   22. pool_snapshot routes to correct pool: room (resets that room's stale)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { connect } from '../../src/realtime/client.js';
import type {
  IoFactory,
  PoolSnapshotEvent,
  ProtocolSummaryTickEvent,
  Room,
  TransactionIndexedEvent,
} from '../../src/realtime/types.js';
import { REALTIME_WS_URLS } from '../../src/network/constants.js';

const VALID_WALLET = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const OTHER_WALLET = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const VALID_POOL = '6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4';

/** Build a fake JWT with the given `sub` claim. Header/sig are placeholder. */
function fakeJwt(sub: string): string {
  const header = btoa('{"alg":"HS256","typ":"JWT"}').replace(/=/g, '');
  const payload = btoa(JSON.stringify({ sub })).replace(/=/g, '');
  return `${header}.${payload}.fake-sig`;
}

/**
 * Hand-rolled fake of the subset of `socket.io-client.Socket` our client
 * uses. Tests drive lifecycle events via `.fire()`.
 */
class FakeSocket {
  connected = false;
  // channel → handlers
  private handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  // log of emit calls
  emitLog: Array<{ channel: string; payload: unknown; ack?: (a: unknown) => void }> = [];
  disconnected = false;
  url = '';
  ioOptions: Record<string, unknown> = {};

  on(channel: string, listener: (...args: unknown[]) => void): unknown {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
    }
    set.add(listener);
    return this;
  }

  off(channel: string, listener?: (...args: unknown[]) => void): unknown {
    const set = this.handlers.get(channel);
    if (!set) return this;
    if (listener) set.delete(listener);
    else set.clear();
    return this;
  }

  emit(channel: string, ...args: unknown[]): unknown {
    // Acks are conventionally the last arg if it's a function.
    const last = args[args.length - 1];
    if (typeof last === 'function') {
      const payload = args.length > 1 ? args[0] : undefined;
      this.emitLog.push({
        channel,
        payload,
        ack: last as (a: unknown) => void,
      });
    } else {
      this.emitLog.push({ channel, payload: args[0] });
    }
    return this;
  }

  disconnect(): unknown {
    this.disconnected = true;
    this.connected = false;
    this.fire('disconnect');
    return this;
  }

  /** Test helper: fire a server-side lifecycle/event channel. */
  fire(channel: string, ...args: unknown[]): void {
    const set = this.handlers.get(channel);
    if (!set) return;
    for (const fn of Array.from(set)) {
      fn(...args);
    }
  }

  /**
   * Test helper: find the most recent `subscribe` emit and invoke its ack
   * with the supplied result.
   */
  ackLastSubscribe(result: unknown): void {
    for (let i = this.emitLog.length - 1; i >= 0; i--) {
      const e = this.emitLog[i]!;
      if (e.channel === 'subscribe' && e.ack) {
        e.ack(result);
        return;
      }
    }
    throw new Error('no subscribe emit to ack');
  }

  /** Number of `subscribe` emits in the log. */
  subscribeEmits(): Array<{ payload: unknown; ack?: (a: unknown) => void }> {
    return this.emitLog.filter((e) => e.channel === 'subscribe');
  }
}

function makeFactory(): { factory: IoFactory; sockets: FakeSocket[] } {
  const sockets: FakeSocket[] = [];
  const factory: IoFactory = (url, opts) => {
    const s = new FakeSocket();
    s.url = url;
    s.ioOptions = opts;
    sockets.push(s);
    return s as unknown as ReturnType<IoFactory>;
  };
  return { factory, sockets };
}

describe('connect — URL resolution', () => {
  // Case 1
  it('throws TypeError when neither baseUrl nor cluster is provided', () => {
    const { factory } = makeFactory();
    expect(() => connect({ ioFactory: factory })).toThrow(TypeError);
  });

  // Case 2
  it('throws TypeError on unknown cluster', () => {
    const { factory } = makeFactory();
    expect(() =>
      connect({
        // @ts-expect-error — testing runtime behaviour
        cluster: 'testnet',
        ioFactory: factory,
      }),
    ).toThrow(TypeError);
  });

  // Case 3
  it('resolves cluster via REALTIME_WS_URLS', () => {
    const { factory, sockets } = makeFactory();
    connect({ cluster: 'devnet', ioFactory: factory });
    expect(sockets[0]!.url).toBe(REALTIME_WS_URLS.devnet);
  });

  it('uses explicit baseUrl when provided (wins over cluster)', () => {
    const { factory, sockets } = makeFactory();
    connect({
      baseUrl: 'wss://custom.example/realtime',
      cluster: 'devnet',
      ioFactory: factory,
    });
    expect(sockets[0]!.url).toBe('wss://custom.example/realtime');
  });
});

describe('connect — auth plumbing', () => {
  // Case 4
  it('passes auth.token + extraHeaders.Authorization when token set', () => {
    const { factory, sockets } = makeFactory();
    const token = fakeJwt(VALID_WALLET);
    connect({
      baseUrl: 'wss://x/realtime',
      token,
      ioFactory: factory,
    });
    const opts = sockets[0]!.ioOptions;
    expect((opts.auth as { token: string }).token).toBe(token);
    expect((opts.extraHeaders as { Authorization: string }).Authorization).toBe(
      `Bearer ${token}`,
    );
  });

  // Case 5
  it('passes no auth when token absent (anonymous)', () => {
    const { factory, sockets } = makeFactory();
    connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const opts = sockets[0]!.ioOptions;
    expect(opts.auth).toBeUndefined();
    expect(opts.extraHeaders).toBeUndefined();
  });

  it('forwards reconnection settings to socket.io-client', () => {
    const { factory, sockets } = makeFactory();
    connect({
      baseUrl: 'wss://x/realtime',
      reconnectionDelay: 200,
      reconnectionDelayMax: 4000,
      reconnectionAttempts: 7,
      ioFactory: factory,
    });
    const opts = sockets[0]!.ioOptions;
    expect(opts.reconnectionDelay).toBe(200);
    expect(opts.reconnectionDelayMax).toBe(4000);
    expect(opts.reconnectionAttempts).toBe(7);
    expect((opts.transports as string[]).includes('websocket')).toBe(true);
  });
});

describe('subscribe — happy path + ack failures', () => {
  // Case 6
  it('returns ok:true when server acks ok', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const promise = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: true });
    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(client.subscriptions.has('protocol')).toBe(true);
  });

  // Case 10
  it('returns ok:false, error:auth_required on private+anonymous', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const promise = client.subscribe(`wallet:${VALID_WALLET}` as Room);
    sockets[0]!.ackLastSubscribe({ ok: false, error: 'auth_required' });
    const result = await promise;
    expect(result).toEqual({ ok: false, error: 'auth_required' });
    // Failure must NOT add the room to local subscriptions.
    expect(client.subscriptions.has(`wallet:${VALID_WALLET}` as Room)).toBe(false);
  });

  // Case 11
  it('returns ok:false, error:auth_mismatch when JWT.sub != room pubkey', async () => {
    // We can only get this from the SERVER (sync TypeError prevents the
    // emit when token decodes cleanly). Simulate by passing a token whose
    // `sub` is unparseable so the SDK falls through to the server.
    const { factory, sockets } = makeFactory();
    const client = connect({
      baseUrl: 'wss://x/realtime',
      token: 'malformed.token',
      ioFactory: factory,
    });
    const promise = client.subscribe(`wallet:${OTHER_WALLET}` as Room);
    sockets[0]!.ackLastSubscribe({ ok: false, error: 'auth_mismatch' });
    const result = await promise;
    expect(result).toEqual({ ok: false, error: 'auth_mismatch' });
  });

  // Case 12
  it('returns ok:false, error:unknown_room when server rejects shape', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const promise = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: false, error: 'unknown_room' });
    const result = await promise;
    expect(result).toEqual({ ok: false, error: 'unknown_room' });
  });

  // Case 13
  it('rejects with "subscribe ack timeout" when server never acks', async () => {
    vi.useFakeTimers();
    try {
      const { factory } = makeFactory();
      const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
      const promise = client.subscribe('protocol');
      // Race the timeout — advance fake time by 5_000ms.
      vi.advanceTimersByTime(5_000);
      await expect(promise).rejects.toThrow('subscribe ack timeout');
    } finally {
      vi.useRealTimers();
    }
  });

  // Case 14
  it('ack-fail does NOT close the socket', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const promise = client.subscribe(`wallet:${VALID_WALLET}` as Room);
    sockets[0]!.ackLastSubscribe({ ok: false, error: 'auth_required' });
    await promise;
    expect(sockets[0]!.disconnected).toBe(false);
    // Subsequent subscribe is still emit-able.
    const promise2 = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: true });
    await expect(promise2).resolves.toEqual({ ok: true });
  });
});

describe('subscribe — sync TypeErrors', () => {
  // Case 7
  it('throws TypeError for malformed room shape', () => {
    const { factory } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    expect(() => client.subscribe('pool:not-a-pubkey' as Room)).toThrow(TypeError);
    expect(() => client.subscribe('garbage' as Room)).toThrow(TypeError);
  });

  // Case 8
  it('throws TypeError when wallet:<X> != jwt.sub', () => {
    const { factory } = makeFactory();
    const client = connect({
      baseUrl: 'wss://x/realtime',
      token: fakeJwt(VALID_WALLET),
      ioFactory: factory,
    });
    expect(() =>
      client.subscribe(`wallet:${OTHER_WALLET}` as Room),
    ).toThrow(/jwt\.sub/);
  });

  // Case 9
  it('allows wallet:<X> when jwt.sub == X', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({
      baseUrl: 'wss://x/realtime',
      token: fakeJwt(VALID_WALLET),
      ioFactory: factory,
    });
    const promise = client.subscribe(`wallet:${VALID_WALLET}` as Room);
    sockets[0]!.ackLastSubscribe({ ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('skips wallet/sub check when no token is configured', async () => {
    // Anonymous + wallet:<X> emits to server, server returns auth_required.
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const promise = client.subscribe(`wallet:${VALID_WALLET}` as Room);
    expect(sockets[0]!.subscribeEmits()).toHaveLength(1);
    sockets[0]!.ackLastSubscribe({ ok: false, error: 'auth_required' });
    await expect(promise).resolves.toEqual({
      ok: false,
      error: 'auth_required',
    });
  });
});

describe('unsubscribe', () => {
  // Case 15
  it('clears local state (subscriptions + timers + lastEventAt)', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const subPromise = client.subscribe(`pool:${VALID_POOL}` as Room);
    sockets[0]!.ackLastSubscribe({ ok: true });
    await subPromise;
    expect(client.subscriptions.has(`pool:${VALID_POOL}` as Room)).toBe(true);

    const unsubPromise = client.unsubscribe(`pool:${VALID_POOL}` as Room);
    // Find the unsubscribe emit and ack it.
    const unsubEmit = sockets[0]!.emitLog.find((e) => e.channel === 'unsubscribe');
    expect(unsubEmit).toBeDefined();
    unsubEmit!.ack!({ ok: true });
    await unsubPromise;

    expect(client.subscriptions.has(`pool:${VALID_POOL}` as Room)).toBe(false);
  });
});

describe('on/off — listener registration', () => {
  // Case 16
  it('registers, fires, and removes listener', () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });

    const heard: PoolSnapshotEvent[] = [];
    const off = client.on('pool_snapshot', (p) => heard.push(p));

    const payload: PoolSnapshotEvent = {
      pool: VALID_POOL,
      blockTime: 1000,
      tvlA: '1', tvlB: '2', tvlUsd: 3,
      reserveA: '1', reserveB: '2',
      feeGrowthA: '0', feeGrowthB: '0',
      lpSupply: '0',
    };
    sockets[0]!.fire('pool_snapshot', payload);
    expect(heard).toHaveLength(1);
    expect(heard[0]!.pool).toBe(VALID_POOL);

    off();
    sockets[0]!.fire('pool_snapshot', payload);
    expect(heard).toHaveLength(1); // still 1
  });

  it('off(channel, listener) variant works equivalently', () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const fn = vi.fn();
    client.on('protocol_summary_tick', fn);
    const payload: ProtocolSummaryTickEvent = {
      totalTvlUsd: 1, volume24hUsd: 2, txCount24h: 3, activeWallets24h: 4,
      poolCount: 5, cumulativeDistributorCount: 6, blockTime: 7,
    };
    sockets[0]!.fire('protocol_summary_tick', payload);
    client.off('protocol_summary_tick', fn);
    sockets[0]!.fire('protocol_summary_tick', payload);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('reconnect replay', () => {
  // Case 17
  it('re-emits subscribe in insertion order on every "connect"', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });

    // Subscribe to two rooms. Order: protocol, then pool:<X>.
    const p1 = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: true });
    await p1;
    const p2 = client.subscribe(`pool:${VALID_POOL}` as Room);
    sockets[0]!.ackLastSubscribe({ ok: true });
    await p2;

    // Initial subscribe count: 2
    expect(sockets[0]!.subscribeEmits()).toHaveLength(2);

    // Simulate a reconnect — fire 'connect' again.
    sockets[0]!.fire('connect');

    // Replay: 2 more emits (total 4) with the same rooms in order.
    const emits = sockets[0]!.subscribeEmits();
    expect(emits).toHaveLength(4);
    expect((emits[2]!.payload as { room: string }).room).toBe('protocol');
    expect((emits[3]!.payload as { room: string }).room).toBe(
      `pool:${VALID_POOL}`,
    );
  });
});

describe('stale detection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Case 18
  it('emits "stale" after staleAfterMs of inactivity', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({
      baseUrl: 'wss://x/realtime',
      staleAfterMs: 1_000,
      ioFactory: factory,
    });
    const stales: Array<{ room: Room; lastEventAt: number }> = [];
    client.on('stale', (e) => stales.push(e));

    const p = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: true });
    await p;

    expect(stales).toHaveLength(0);
    vi.advanceTimersByTime(1_001);
    expect(stales).toHaveLength(1);
    expect(stales[0]!.room).toBe('protocol');
  });

  // Case 19
  it('emits "live" when a payload arrives after stale', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({
      baseUrl: 'wss://x/realtime',
      staleAfterMs: 1_000,
      ioFactory: factory,
    });
    const lives: Array<{ room: Room }> = [];
    client.on('live', (e) => lives.push(e));

    const p = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: true });
    await p;

    // Cross the threshold first.
    vi.advanceTimersByTime(1_500);

    // Now a payload arrives.
    const payload: ProtocolSummaryTickEvent = {
      totalTvlUsd: 1, volume24hUsd: 2, txCount24h: 3, activeWallets24h: 4,
      poolCount: 5, cumulativeDistributorCount: 6, blockTime: 7,
    };
    sockets[0]!.fire('protocol_summary_tick', payload);
    expect(lives).toHaveLength(1);
    expect(lives[0]!.room).toBe('protocol');
  });

  // Case 22
  it('pool_snapshot resets stale timer for that specific pool room only', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({
      baseUrl: 'wss://x/realtime',
      staleAfterMs: 1_000,
      ioFactory: factory,
    });
    const stales: Room[] = [];
    client.on('stale', (e) => stales.push(e.room));

    const p1 = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: true });
    await p1;
    const p2 = client.subscribe(`pool:${VALID_POOL}` as Room);
    sockets[0]!.ackLastSubscribe({ ok: true });
    await p2;

    // Half the threshold — neither room is stale yet.
    vi.advanceTimersByTime(500);

    // pool_snapshot for VALID_POOL — resets ONLY pool:<VALID_POOL>'s timer.
    sockets[0]!.fire('pool_snapshot', {
      pool: VALID_POOL,
      blockTime: 1, tvlA: '0', tvlB: '0', tvlUsd: null,
      reserveA: '0', reserveB: '0',
      feeGrowthA: '0', feeGrowthB: '0',
      lpSupply: '0',
    } satisfies PoolSnapshotEvent);

    // Advance past 'protocol' threshold but not past pool's reset threshold.
    vi.advanceTimersByTime(600);
    // 'protocol' should be stale (1_100ms total elapsed); pool:<VALID_POOL>
    // should NOT (only 600ms since reset).
    expect(stales).toContain('protocol');
    expect(stales).not.toContain(`pool:${VALID_POOL}`);
  });
});

describe('disconnect', () => {
  // Case 20
  it('clears subscriptions + timers and emits synthetic stale per room', async () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });

    const p = client.subscribe('protocol');
    sockets[0]!.ackLastSubscribe({ ok: true });
    await p;

    const stales: Room[] = [];
    client.on('stale', (e) => stales.push(e.room));

    client.disconnect();
    expect(sockets[0]!.disconnected).toBe(true);
    expect(stales).toContain('protocol');
    expect(client.subscriptions.size).toBe(0);
  });
});

describe('connect_error redaction', () => {
  // Case 21
  it('redacts the JWT token from the synthetic connect_error message', () => {
    const { factory, sockets } = makeFactory();
    const token = fakeJwt(VALID_WALLET);
    const client = connect({
      baseUrl: 'wss://x/realtime',
      token,
      ioFactory: factory,
    });
    const heard: string[] = [];
    client.on('connect_error', (e) => heard.push(e.message));

    sockets[0]!.fire('connect_error', {
      message: `auth failed for token ${token}`,
    });
    expect(heard).toHaveLength(1);
    expect(heard[0]).not.toContain(token);
    expect(heard[0]).toContain('[REDACTED]');
  });

  it('passes connect_error through verbatim when no token is configured', () => {
    const { factory, sockets } = makeFactory();
    const client = connect({ baseUrl: 'wss://x/realtime', ioFactory: factory });
    const heard: string[] = [];
    client.on('connect_error', (e) => heard.push(e.message));
    sockets[0]!.fire('connect_error', { message: 'transport error' });
    expect(heard[0]).toBe('transport error');
  });
});

describe('transaction_indexed routing', () => {
  it('routes transaction_indexed to wallet:<wallet> room and resets its timer', async () => {
    vi.useFakeTimers();
    try {
      const { factory, sockets } = makeFactory();
      const client = connect({
        baseUrl: 'wss://x/realtime',
        token: fakeJwt(VALID_WALLET),
        staleAfterMs: 1_000,
        ioFactory: factory,
      });
      const heard: TransactionIndexedEvent[] = [];
      client.on('transaction_indexed', (e) => heard.push(e));

      const p = client.subscribe(`wallet:${VALID_WALLET}` as Room);
      sockets[0]!.ackLastSubscribe({ ok: true });
      await p;

      // Advance just under the stale threshold.
      vi.advanceTimersByTime(900);

      sockets[0]!.fire('transaction_indexed', {
        wallet: VALID_WALLET,
        kind: 'swap',
        signature: 'sig1',
        blockTime: 1234,
      } satisfies TransactionIndexedEvent);

      expect(heard).toHaveLength(1);
      expect(heard[0]!.kind).toBe('swap');

      // The timer was reset — advance another 900ms (total 1800ms, so > 1000
      // since subscribe but < 1000 since the event), no stale yet.
      const stales: Room[] = [];
      client.on('stale', (e) => stales.push(e.room));
      vi.advanceTimersByTime(900);
      expect(stales).not.toContain(`wallet:${VALID_WALLET}`);

      // Now cross the threshold.
      vi.advanceTimersByTime(200);
      expect(stales).toContain(`wallet:${VALID_WALLET}`);
    } finally {
      vi.useRealTimers();
    }
  });
});
