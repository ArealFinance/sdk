// Unified event-decoder dispatcher across the 5 Areal programs.
//
// Two entry points:
//   - `decodeEvent(programId, base64)` — single `Program data:` line.
//   - `decodeTransactionEvents(logs, programIds)` — full transaction logs;
//     tracks the active `invoke`/`success` stack so events are attributed to
//     the right program even when CPIs are nested.

import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

// Cluster-aware registry: the lookup tables below are built by walking ALL
// clusters in `PROGRAM_IDS_BY_CLUSTER` so a devnet log decodes against the
// devnet program-ID just as readily as a mainnet log decodes against the
// mainnet one. Each program's discriminator table (`*_EVENTS`) is shared
// across clusters because the wire format is identical — only the program-ID
// changes per-cluster.
import { PROGRAM_IDS_BY_CLUSTER } from '../network/program-ids.js';
import type { ClusterName } from '../network/clusters.js';
import { YIELD_DISTRIBUTION_EVENTS } from './yield-distribution.js';
import { NATIVE_DEX_EVENTS } from './native-dex.js';
import { OWNERSHIP_TOKEN_EVENTS } from './ownership-token.js';
import { RWT_ENGINE_EVENTS } from './rwt-engine.js';
import { FUTARCHY_EVENTS } from './futarchy.js';
import type { DecodedEvent, ProgramEventRegistry, ProgramLabel } from './types.js';

/**
 * base58(programId) → registry lookup. Built once at module load by iterating
 * over every cluster in `PROGRAM_IDS_BY_CLUSTER` so mainnet AND devnet (and
 * localnet) program IDs all resolve to the same per-program event registry.
 * Adding a new program means a new entry inside the loop AND a new
 * per-program module.
 */
const PROGRAM_REGISTRIES: Readonly<Record<string, ProgramEventRegistry>> = (() => {
  const acc: Record<string, ProgramEventRegistry> = {};
  for (const cluster of Object.keys(PROGRAM_IDS_BY_CLUSTER) as ClusterName[]) {
    const ids = PROGRAM_IDS_BY_CLUSTER[cluster];
    acc[ids.yieldDistribution.toBase58()] = YIELD_DISTRIBUTION_EVENTS;
    acc[ids.nativeDex.toBase58()] = NATIVE_DEX_EVENTS;
    acc[ids.ownershipToken.toBase58()] = OWNERSHIP_TOKEN_EVENTS;
    acc[ids.rwtEngine.toBase58()] = RWT_ENGINE_EVENTS;
    acc[ids.futarchy.toBase58()] = FUTARCHY_EVENTS;
  }
  return acc;
})();

const PROGRAM_NAME_BY_ID: Readonly<Record<string, ProgramLabel>> = (() => {
  const acc: Record<string, ProgramLabel> = {};
  for (const cluster of Object.keys(PROGRAM_IDS_BY_CLUSTER) as ClusterName[]) {
    const ids = PROGRAM_IDS_BY_CLUSTER[cluster];
    acc[ids.yieldDistribution.toBase58()] = 'yield-distribution';
    acc[ids.nativeDex.toBase58()] = 'native-dex';
    acc[ids.ownershipToken.toBase58()] = 'ownership-token';
    acc[ids.rwtEngine.toBase58()] = 'rwt-engine';
    acc[ids.futarchy.toBase58()] = 'futarchy';
  }
  return acc;
})();

/**
 * Union of every known Areal program-ID across all clusters, used as the
 * default filter for `decodeTransactionEvents` when the caller doesn't pass
 * an explicit `programIds` list. Computed once at module load.
 */
const ALL_KNOWN_PROGRAM_IDS: readonly PublicKey[] = (() => {
  const seen = new Set<string>();
  const out: PublicKey[] = [];
  for (const cluster of Object.keys(PROGRAM_IDS_BY_CLUSTER) as ClusterName[]) {
    const ids = PROGRAM_IDS_BY_CLUSTER[cluster];
    for (const pid of [
      ids.yieldDistribution,
      ids.nativeDex,
      ids.ownershipToken,
      ids.rwtEngine,
      ids.futarchy,
    ]) {
      const key = pid.toBase58();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(pid);
      }
    }
  }
  return out;
})();

/**
 * Decode a single base64-encoded event payload.
 *
 * Solana `emit!` macro lines have the shape `Program data: <base64>`. The
 * caller is responsible for stripping the `Program data: ` prefix; this fn
 * receives only the base64 body.
 *
 * Returns `null` when:
 *   - `programId` is not one of the 5 Areal programs,
 *   - the payload is shorter than 8 bytes (no discriminator),
 *   - the discriminator does not match any event in the program registry,
 *   - the borsh deserializer throws (truncated/corrupt payload).
 *
 * Never throws — designed for log-stream consumption where partial/foreign
 * events are common and must be silently skipped.
 */
/**
 * Decode a `Program data:` payload, accepting both wire formats Solana
 * programs use to pass `emit!` events through transaction logs:
 *
 *   1. Anchor / single-chunk: `Program data: <disc+payload base64>`
 *      The discriminator and the borsh-serialized payload share one base64
 *      string. `Buffer.from(s, 'base64')` decodes the whole thing.
 *
 *   2. Arlex / two-chunk:    `Program data: <disc base64> <payload base64>`
 *      The Arlex framework's `emit!` macro emits the 8-byte discriminator
 *      and the payload as TWO separate base64 strings, space-joined.
 *      Node's `Buffer.from(s, 'base64')` stops at the `=` padding of the
 *      first chunk — so the naive single-decode path lands an 8-byte buffer
 *      with the discriminator only and an empty payload, which then trips
 *      the borsh deserializer (truncated buffer → throw → return null).
 *
 * Detect (2) by splitting on whitespace and decoding each chunk independently
 * before concatenating. Falls back to (1) for any single-chunk input.
 */
function decodeProgramDataPayload(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const parts = trimmed.split(/\s+/);
  try {
    if (parts.length === 1) {
      return Buffer.from(parts[0]!, 'base64');
    }
    return Buffer.concat(parts.map((p) => Buffer.from(p, 'base64')));
  } catch {
    return null;
  }
}

export function decodeEvent(
  programId: PublicKey,
  base64: string,
): DecodedEvent | null {
  const idStr = programId.toBase58();
  const registry = PROGRAM_REGISTRIES[idStr];
  if (!registry) return null;

  const data = decodeProgramDataPayload(base64);
  if (!data || data.length < 8) return null;

  const disc = data.subarray(0, 8);
  const discKey = disc.toString('hex');
  const decoder = registry.byDiscriminator.get(discKey);
  if (!decoder) return null;

  try {
    // Decoder consumes the full buffer including the 8-byte discriminator
    // prefix; the underlying borsh helper skips it (Anchor account-data
    // convention reused for events).
    const payload = decoder.decode(data);
    return {
      programId,
      programName: PROGRAM_NAME_BY_ID[idStr]!,
      eventName: decoder.name,
      data: payload,
    };
  } catch {
    return null;
  }
}

/**
 * Match `Program <pubkey> invoke [<depth>]` (program enter).
 * Captures the program ID — depth is informational and not tracked separately
 * because Solana already pops via `success`/`failed` lines we treat below.
 *
 * Program ID is anchored to the base58 alphabet so user-controllable
 * `Program log: ...` / `Program data: ...` lines cannot match (`log:` and
 * `data:` contain `:` which is outside the base58 alphabet, and lone `log` /
 * `data` would still fail to match the trailing ` invoke [<n>]` literal).
 */
const INVOKE_RE = /^Program ([1-9A-HJ-NP-Za-km-z]+) invoke \[\d+\]$/;

/**
 * Match `Program data: <base64>` (event payload).
 */
const DATA_RE = /^Program data: (.+)$/;

/**
 * Match `Program <pubkey> success` or `... failed: ...` (program exit).
 * Either form pops the current program off our stack.
 *
 * Program ID is anchored to the base58 alphabet so a malicious program
 * emitting `msg!("success")` (which surfaces as `Program log: success`) or
 * `emit!` payloads decoding to literals like `Program data: success` cannot
 * be misclassified as an EXIT line and pop the invoke-stack one level early.
 */
const EXIT_RE = /^Program [1-9A-HJ-NP-Za-km-z]+ (?:success|failed:.*)$/;

/**
 * Decode all Areal events in a transaction's `logMessages` array.
 *
 * Walks the logs once, maintaining a stack of currently-invoked programs so
 * that nested CPIs attribute events to the right program. An event line is
 * decoded only when the program at the top of the stack is in `programIds`.
 *
 * `programIds` defaults to all 5 Areal programs. Pass a narrower list to
 * skip-decode foreign programs faster (useful when the same fn is called on
 * every confirmed tx in a high-volume indexer).
 */
export function decodeTransactionEvents(
  logs: readonly string[],
  programIds: readonly PublicKey[] = ALL_KNOWN_PROGRAM_IDS,
): DecodedEvent[] {
  const allowed = new Set(programIds.map((p) => p.toBase58()));
  const stack: PublicKey[] = [];
  const out: DecodedEvent[] = [];

  for (const log of logs) {
    const invokeMatch = log.match(INVOKE_RE);
    if (invokeMatch) {
      try {
        stack.push(new PublicKey(invokeMatch[1]!));
      } catch {
        // Push a sentinel so the matching success/failed pops cleanly even
        // when the pubkey parse fails (defensive — should never happen on
        // well-formed Solana logs). The first known program-ID we have is
        // fine as a sentinel — it's never read because the `allowed` set
        // discriminates legitimate events from this push.
        stack.push(ALL_KNOWN_PROGRAM_IDS[0]!);
      }
      continue;
    }

    if (EXIT_RE.test(log)) {
      stack.pop();
      continue;
    }

    const dataMatch = log.match(DATA_RE);
    if (!dataMatch) continue;

    const current = stack[stack.length - 1];
    if (!current) continue;
    if (!allowed.has(current.toBase58())) continue;

    const decoded = decodeEvent(current, dataMatch[1]!);
    if (decoded) out.push(decoded);
  }

  return out;
}

/**
 * The full set of program registries — exposed for callers (e.g. tests, dev
 * tools) that need to enumerate all known events without going through the
 * decoder API.
 */
export function getAllRegistries(): readonly ProgramEventRegistry[] {
  return [
    YIELD_DISTRIBUTION_EVENTS,
    NATIVE_DEX_EVENTS,
    OWNERSHIP_TOKEN_EVENTS,
    RWT_ENGINE_EVENTS,
    FUTARCHY_EVENTS,
  ];
}
