// Public types for the `@areal/sdk/events` subpath.
//
// Hand-written, runtime-driven event decoder layer. Codegen does not emit
// event bindings today (see scripts/codegen.mjs); this module fills the gap by
// reading event field layouts straight from the per-program IDL JSON shipped
// alongside the SDK and exposing a uniform decoder surface.

import type { PublicKey } from '@solana/web3.js';

/** Stable program-name labels used across the events subpath. */
export type ProgramLabel =
  | 'yield-distribution'
  | 'native-dex'
  | 'ownership-token'
  | 'rwt-engine'
  | 'futarchy';

/**
 * Result of decoding a single `Program data:` log line.
 *
 * The `data` payload defaults to `Record<string, unknown>` because most events
 * are decoded dynamically (no hand-typed interface). The top-N most-consumed
 * events expose a typed wrapper (see per-program modules) and consumers can
 * narrow via `eventName` discriminant before reading fields.
 */
export interface DecodedEvent<T = Record<string, unknown>> {
  /** Program ID that emitted the event. */
  programId: PublicKey;
  /** Stable program label (matches `ProgramLabel`). */
  programName: ProgramLabel;
  /** Event name as declared in the IDL (PascalCase, e.g. `RewardsClaimed`). */
  eventName: string;
  /** Decoded payload — camelCase keys, `[u8;32]` fields wrapped as `PublicKey`. */
  data: T;
}

/**
 * Per-event decoder entry built at module load from the IDL.
 *
 * `discriminator` is the 8-byte sha256 prefix of `event:<Name>` (Anchor
 * convention, computed by `@arlex/client`'s `eventDiscriminator`).
 *
 * `decode` receives the FULL payload buffer including the 8-byte
 * discriminator prefix — the underlying borsh deserializer is hard-coded to
 * skip the first 8 bytes (matching the Anchor account-data convention).
 * Callers should not strip the prefix themselves.
 */
export interface EventDecoder {
  /** PascalCase event name from the IDL. */
  name: string;
  /** 8-byte Anchor event discriminator. */
  discriminator: Uint8Array;
  /** Borsh-deserialize the full payload (including 8-byte prefix). */
  decode: (fullData: Buffer) => Record<string, unknown>;
}

/**
 * Per-program registry. Keyed by event name (PascalCase) for O(1) lookup by
 * name, plus the `byDiscriminator` map for O(1) lookup during log dispatch.
 */
export interface ProgramEventRegistry {
  programLabel: ProgramLabel;
  /** Event name → decoder. */
  byName: Record<string, EventDecoder>;
  /** Hex-encoded 8-byte discriminator → decoder. */
  byDiscriminator: Map<string, EventDecoder>;
}
