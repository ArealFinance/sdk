// Dynamic per-program event registry builder.
//
// Reads the events array from the IDL JSON and produces decoder entries
// without going through codegen. Each decoder:
//   1. Verifies/strips the 8-byte Anchor event discriminator.
//   2. Borsh-deserializes the payload via `@arlex/client` `deserializeAccount`
//      (events use the same wire layout as accounts post-discriminator).
//   3. Remaps snake_case IDL field names to camelCase TS keys and wraps any
//      `[u8;32]` field as a `PublicKey` (Anchor convention — events emit
//      pubkeys as raw byte arrays, never as the on-chain `Pubkey` newtype).
//
// Why dynamic instead of codegen: codegen does not emit event types today
// (verified in scripts/codegen.mjs as of Phase 12.1). Hand-typing 60 events
// would duplicate the IDL with no DX win for the long tail. Top-N events get
// typed wrappers in their per-program modules.

import { PublicKey } from '@solana/web3.js';
import {
  buildTypeRegistry,
  deserializeAccount,
  eventDiscriminator,
  type IdlEvent,
  type IdlField,
  type TypeRegistry,
} from '@arlex/client';

import type { EventDecoder, ProgramEventRegistry, ProgramLabel } from './types.js';

/**
 * snake_case → camelCase. Used to match the SDK's account-field convention.
 * Identity for already-camelCase keys.
 */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Returns true when the IDL field type is `[u8; 32]` — Anchor's wire shape for
 * a pubkey emitted by `emit!`. We unconditionally wrap these as `PublicKey`
 * because every 32-byte field across Areal's 60 events is a pubkey (verified
 * against `contracts/<program>/src/events.rs` for all 5 programs).
 */
function isU8Array32(type: unknown): boolean {
  if (!type || typeof type !== 'object') return false;
  const t = type as { array?: [unknown, unknown] };
  if (!Array.isArray(t.array) || t.array.length !== 2) return false;
  return t.array[0] === 'u8' && t.array[1] === 32;
}

/**
 * Walk the decoded snake_case object and:
 *   - rename keys to camelCase
 *   - wrap `[u8;32]` field values as `PublicKey`
 *
 * IDL events in Areal contain only flat scalars, fixed `[u8; 32]` arrays, and
 * primitive integers — no nested defined-type structs (verified by audit of
 * all 5 IDLs). Keep the remap shallow.
 */
function remapPayload(
  raw: Record<string, unknown>,
  fields: readonly IdlField[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const camelKey = snakeToCamel(f.name);
    const rawValue = raw[f.name];
    if (isU8Array32(f.type) && rawValue instanceof Uint8Array) {
      out[camelKey] = new PublicKey(rawValue);
    } else {
      out[camelKey] = rawValue;
    }
  }
  return out;
}

// Empty type registry — events do not reference defined types in any of the
// 5 Areal IDLs. Reused across all programs.
const EMPTY_REGISTRY: TypeRegistry = buildTypeRegistry([], []);

/**
 * Build a per-program registry from the IDL's `events` array.
 *
 * Throws synchronously at module load if the IDL is malformed or contains
 * duplicate event names — both are codegen-time bugs that should never reach
 * runtime, so a hard fail is preferable to silent decode failures later.
 */
export function buildProgramEventRegistry(
  programLabel: ProgramLabel,
  events: readonly IdlEvent[] | undefined,
): ProgramEventRegistry {
  const byName: Record<string, EventDecoder> = {};
  const byDiscriminator = new Map<string, EventDecoder>();

  for (const event of events ?? []) {
    if (byName[event.name]) {
      throw new Error(
        `[areal/sdk/events] duplicate event name '${event.name}' in '${programLabel}' IDL`,
      );
    }

    const fields = event.fields ?? [];
    const disc = new Uint8Array(eventDiscriminator(event.name));
    const discKey = Buffer.from(disc).toString('hex');

    const decoder: EventDecoder = {
      name: event.name,
      discriminator: disc,
      decode(fullDataWithDiscriminator: Buffer): Record<string, unknown> {
        // `@arlex/client` `deserializeAccount` is hard-coded to skip the first
        // 8 bytes (account discriminator). Events use the same wire layout, so
        // we pass the full buffer including the 8-byte event discriminator
        // prefix and let the helper skip it.
        const raw = deserializeAccount(
          fields as IdlField[],
          fullDataWithDiscriminator,
          EMPTY_REGISTRY,
        );
        return remapPayload(raw, fields as IdlField[]);
      },
    };

    if (byDiscriminator.has(discKey)) {
      throw new Error(
        `[areal/sdk/events] duplicate discriminator for '${programLabel}.${event.name}'`,
      );
    }

    byName[event.name] = decoder;
    byDiscriminator.set(discKey, decoder);
  }

  return { programLabel, byName, byDiscriminator };
}
