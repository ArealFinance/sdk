// Unit tests for `@areal/sdk/events`.
//
// Coverage targets:
//   1. Each program registry exposes the expected event count + names.
//   2. Event discriminators round-trip with `@arlex/client` `eventDiscriminator`.
//   3. Decoding a synthesised payload returns the expected camelCase shape
//      with `[u8;32]` fields wrapped as `PublicKey`.
//   4. Unknown discriminator and malformed input → `null` (never throws).
//   5. `decodeTransactionEvents` correctly tracks `invoke`/`success` stack
//      across nested CPIs.
//   6. Multi-program filter — only listed programs decode.

import { describe, it, expect } from 'vitest';
import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { eventDiscriminator } from '@arlex/client';

import {
  YIELD_DISTRIBUTION_EVENTS,
  NATIVE_DEX_EVENTS,
  OWNERSHIP_TOKEN_EVENTS,
  RWT_ENGINE_EVENTS,
  FUTARCHY_EVENTS,
  decodeEvent,
  decodeTransactionEvents,
  getAllRegistries,
} from '../../src/events/index.js';
import { PROGRAM_IDS } from '../../src/network/program-ids.js';

// Random non-Areal program — used to assert events emitted by foreign
// programs are silently skipped.
const FOREIGN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Build a 32-byte buffer filled with `byte` so a decoded `PublicKey` is
 * trivially comparable against `new PublicKey(Buffer.alloc(32, byte))`.
 */
function pubkeyBytes(byte: number): Buffer {
  return Buffer.alloc(32, byte);
}

// ----------------------------------------------------------------------------
// Registry coverage
// ----------------------------------------------------------------------------

describe('event registries', () => {
  it('yield-distribution exposes all 13 events', () => {
    expect(Object.keys(YIELD_DISTRIBUTION_EVENTS.byName)).toHaveLength(13);
    expect(YIELD_DISTRIBUTION_EVENTS.programLabel).toBe('yield-distribution');
  });

  it('native-dex exposes all 22 events', () => {
    // 20 pre-CP-8 - 1 (LiquidityShifted removed) + 3 (SwapRoutedToMint,
    // LiquidityGrew, LiquidityCompressed) = 22.
    expect(Object.keys(NATIVE_DEX_EVENTS.byName)).toHaveLength(22);
    expect(NATIVE_DEX_EVENTS.programLabel).toBe('native-dex');
  });

  it('ownership-token exposes all 8 events', () => {
    expect(Object.keys(OWNERSHIP_TOKEN_EVENTS.byName)).toHaveLength(8);
    expect(OWNERSHIP_TOKEN_EVENTS.programLabel).toBe('ownership-token');
  });

  it('rwt-engine exposes all 11 events', () => {
    expect(Object.keys(RWT_ENGINE_EVENTS.byName)).toHaveLength(11);
    expect(RWT_ENGINE_EVENTS.programLabel).toBe('rwt-engine');
  });

  it('futarchy exposes all 8 events', () => {
    expect(Object.keys(FUTARCHY_EVENTS.byName)).toHaveLength(8);
    expect(FUTARCHY_EVENTS.programLabel).toBe('futarchy');
  });

  it('total event count across all programs is 62', () => {
    // Pre-CP-8 baseline 60 + native-dex net +2 = 62 (see native-dex
    // describe above for breakdown).
    const total = getAllRegistries().reduce(
      (sum, r) => sum + Object.keys(r.byName).length,
      0,
    );
    expect(total).toBe(62);
  });

  it('every event name uniquely maps to its discriminator', () => {
    for (const reg of getAllRegistries()) {
      const namesViaDisc = new Set<string>();
      for (const decoder of reg.byDiscriminator.values()) {
        namesViaDisc.add(decoder.name);
      }
      expect(namesViaDisc.size).toBe(Object.keys(reg.byName).length);
    }
  });

  it('byName and byDiscriminator point at the same decoder objects', () => {
    for (const reg of getAllRegistries()) {
      for (const [name, decoder] of Object.entries(reg.byName)) {
        const discKey = Buffer.from(decoder.discriminator).toString('hex');
        expect(reg.byDiscriminator.get(discKey)).toBe(decoder);
        expect(decoder.name).toBe(name);
      }
    }
  });
});

// ----------------------------------------------------------------------------
// Discriminator agreement with @arlex/client
// ----------------------------------------------------------------------------

describe('event discriminators', () => {
  it('match @arlex/client `eventDiscriminator(name)` for every event', () => {
    for (const reg of getAllRegistries()) {
      for (const [name, decoder] of Object.entries(reg.byName)) {
        const expected = new Uint8Array(eventDiscriminator(name));
        expect(decoder.discriminator).toEqual(expected);
        expect(decoder.discriminator).toHaveLength(8);
      }
    }
  });
});

// ----------------------------------------------------------------------------
// Single-event decode
// ----------------------------------------------------------------------------

describe('decodeEvent', () => {
  // Build a synthetic RewardsClaimed payload:
  //   claimant: [u8;32]    | 0xAA * 32
  //   ot_mint:  [u8;32]    | 0xBB * 32
  //   amount:   u64        | 1_000_000_000
  //   cumulative_claimed: u64 | 2_500_000_000
  //   timestamp: i64       | 1_700_000_000
  function buildRewardsClaimedPayload(): Buffer {
    const buf = Buffer.alloc(32 + 32 + 8 + 8 + 8);
    pubkeyBytes(0xaa).copy(buf, 0);
    pubkeyBytes(0xbb).copy(buf, 32);
    buf.writeBigUInt64LE(1_000_000_000n, 64);
    buf.writeBigUInt64LE(2_500_000_000n, 72);
    buf.writeBigInt64LE(1_700_000_000n, 80);
    return buf;
  }

  function buildRewardsClaimedLog(): string {
    const decoder =
      YIELD_DISTRIBUTION_EVENTS.byName['RewardsClaimed']!;
    const full = Buffer.concat([
      Buffer.from(decoder.discriminator),
      buildRewardsClaimedPayload(),
    ]);
    return full.toString('base64');
  }

  it('decodes a known RewardsClaimed event with camelCase + PublicKey wrapping', () => {
    const decoded = decodeEvent(
      PROGRAM_IDS.yieldDistribution,
      buildRewardsClaimedLog(),
    );
    expect(decoded).not.toBeNull();
    expect(decoded!.eventName).toBe('RewardsClaimed');
    expect(decoded!.programName).toBe('yield-distribution');
    expect(decoded!.programId.equals(PROGRAM_IDS.yieldDistribution)).toBe(true);

    const data = decoded!.data as Record<string, unknown>;
    expect(data['claimant']).toBeInstanceOf(PublicKey);
    expect((data['claimant'] as PublicKey).toBytes()).toEqual(
      Uint8Array.from(pubkeyBytes(0xaa)),
    );
    expect(data['otMint']).toBeInstanceOf(PublicKey);
    expect(data['amount']).toBe(1_000_000_000n);
    expect(data['cumulativeClaimed']).toBe(2_500_000_000n);
    expect(data['timestamp']).toBe(1_700_000_000n);
  });

  it('returns null for an unknown program id', () => {
    expect(decodeEvent(FOREIGN_PROGRAM_ID, buildRewardsClaimedLog())).toBeNull();
  });

  it('returns null when payload is shorter than 8 bytes', () => {
    const shortB64 = Buffer.alloc(4).toString('base64');
    expect(decodeEvent(PROGRAM_IDS.yieldDistribution, shortB64)).toBeNull();
  });

  it('returns null when discriminator does not match any known event', () => {
    const bogus = Buffer.alloc(40); // 8 zero discriminator + 32 zero payload
    const decoded = decodeEvent(
      PROGRAM_IDS.yieldDistribution,
      bogus.toString('base64'),
    );
    expect(decoded).toBeNull();
  });

  it('returns null when payload is truncated (borsh deserializer throws)', () => {
    const decoder =
      YIELD_DISTRIBUTION_EVENTS.byName['RewardsClaimed']!;
    // discriminator + only first 32 bytes of payload (claimant) = 40 bytes
    // far short of 32+32+8+8+8 = 88
    const truncated = Buffer.concat([
      Buffer.from(decoder.discriminator),
      pubkeyBytes(0xaa),
    ]);
    expect(
      decodeEvent(PROGRAM_IDS.yieldDistribution, truncated.toString('base64')),
    ).toBeNull();
  });

  it('decodes Arlex two-chunk emit format (disc + payload space-separated)', () => {
    // Arlex's `emit!` macro writes the 8-byte discriminator and the borsh
    // payload as TWO independent base64 strings, joined by a space:
    //
    //   Program data: <disc_b64>= <payload_b64>
    //
    // Anchor uses a single combined base64. The decoder must accept both —
    // see `decodeProgramDataPayload` in src/events/decoder.ts.
    const decoder =
      YIELD_DISTRIBUTION_EVENTS.byName['RewardsClaimed']!;
    const discB64 = Buffer.from(decoder.discriminator).toString('base64');
    const payloadB64 = buildRewardsClaimedPayload().toString('base64');

    const twoChunk = `${discB64} ${payloadB64}`;
    const decoded = decodeEvent(PROGRAM_IDS.yieldDistribution, twoChunk);
    expect(decoded).not.toBeNull();
    expect(decoded!.eventName).toBe('RewardsClaimed');
    expect((decoded!.data as Record<string, unknown>)['amount']).toBe(
      1_000_000_000n,
    );

    // Sanity: the same payload concatenated as a single base64 string must
    // still decode (Anchor-style, regression guard).
    const singleChunk = Buffer.concat([
      Buffer.from(decoder.discriminator),
      buildRewardsClaimedPayload(),
    ]).toString('base64');
    const single = decodeEvent(PROGRAM_IDS.yieldDistribution, singleChunk);
    expect(single).not.toBeNull();
    expect(single!.eventName).toBe('RewardsClaimed');
  });
});

// ----------------------------------------------------------------------------
// Transaction-log dispatcher
// ----------------------------------------------------------------------------

describe('decodeTransactionEvents', () => {
  function buildSwapPayload(): Buffer {
    // SwapExecuted: pool[32] user[32] a_to_b(bool) amount_in(u64)
    //               amount_out(u64) fee_lp(u64) fee_protocol(u64)
    //               fee_ot_treasury(u64) timestamp(i64)
    const buf = Buffer.alloc(32 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8);
    pubkeyBytes(0x11).copy(buf, 0);
    pubkeyBytes(0x22).copy(buf, 32);
    buf.writeUInt8(1, 64); // a_to_b = true
    buf.writeBigUInt64LE(100n, 65);
    buf.writeBigUInt64LE(99n, 73);
    buf.writeBigUInt64LE(1n, 81);
    buf.writeBigUInt64LE(0n, 89);
    buf.writeBigUInt64LE(0n, 97);
    buf.writeBigInt64LE(1_700_000_001n, 105);
    return buf;
  }

  function logFor(programId: PublicKey, decoder: { discriminator: Uint8Array }, payload: Buffer): string {
    const full = Buffer.concat([Buffer.from(decoder.discriminator), payload]);
    return `Program data: ${full.toString('base64')}`;
  }

  it('attributes events to the correct program via invoke/success stack', () => {
    const dexId = PROGRAM_IDS.nativeDex.toBase58();
    const ydId = PROGRAM_IDS.yieldDistribution.toBase58();
    const swapDecoder = NATIVE_DEX_EVENTS.byName['SwapExecuted']!;

    const logs = [
      `Program ${dexId} invoke [1]`,
      'Program log: native_dex::swap',
      logFor(PROGRAM_IDS.nativeDex, swapDecoder, buildSwapPayload()),
      `Program ${ydId} invoke [2]`,
      // YD CPI runs but emits no event of its own here
      `Program ${ydId} success`,
      `Program ${dexId} success`,
    ];

    const events = decodeTransactionEvents(logs);
    expect(events).toHaveLength(1);
    expect(events[0]!.eventName).toBe('SwapExecuted');
    expect(events[0]!.programName).toBe('native-dex');
  });

  it('skips events from foreign programs (e.g. SPL Token CPIs)', () => {
    // A full transaction where the Token program is also invoked but emits
    // no Areal events; we should see zero decoded events.
    const tokenId = FOREIGN_PROGRAM_ID.toBase58();
    const logs = [
      `Program ${tokenId} invoke [1]`,
      'Program log: Instruction: Transfer',
      `Program ${tokenId} success`,
    ];
    expect(decodeTransactionEvents(logs)).toEqual([]);
  });

  it('honours the programIds filter — only listed programs decode', () => {
    const dexId = PROGRAM_IDS.nativeDex.toBase58();
    const swapDecoder = NATIVE_DEX_EVENTS.byName['SwapExecuted']!;
    const logs = [
      `Program ${dexId} invoke [1]`,
      logFor(PROGRAM_IDS.nativeDex, swapDecoder, buildSwapPayload()),
      `Program ${dexId} success`,
    ];

    // Filter set to a different Areal program — DEX events must be skipped.
    expect(
      decodeTransactionEvents(logs, [PROGRAM_IDS.yieldDistribution]),
    ).toEqual([]);

    // Filter set explicitly to native-dex — event decodes.
    const got = decodeTransactionEvents(logs, [PROGRAM_IDS.nativeDex]);
    expect(got).toHaveLength(1);
    expect(got[0]!.eventName).toBe('SwapExecuted');
  });

  it('handles `failed` exit lines the same as `success`', () => {
    const dexId = PROGRAM_IDS.nativeDex.toBase58();
    const ydId = PROGRAM_IDS.yieldDistribution.toBase58();
    const swapDecoder = NATIVE_DEX_EVENTS.byName['SwapExecuted']!;
    const logs = [
      `Program ${dexId} invoke [1]`,
      logFor(PROGRAM_IDS.nativeDex, swapDecoder, buildSwapPayload()),
      `Program ${dexId} failed: custom program error: 0x1`,
      `Program ${ydId} invoke [1]`,
      `Program ${ydId} success`,
    ];
    const events = decodeTransactionEvents(logs);
    // The DEX swap log was emitted before the failed exit; we still decode
    // it (Solana surfaces these even when the program ultimately fails).
    expect(events).toHaveLength(1);
    expect(events[0]!.programName).toBe('native-dex');
  });

  it('drops `Program data:` lines emitted outside any active program scope', () => {
    const swapDecoder = NATIVE_DEX_EVENTS.byName['SwapExecuted']!;
    // No `invoke` line first — stack is empty, line must be ignored.
    const logs = [logFor(PROGRAM_IDS.nativeDex, swapDecoder, buildSwapPayload())];
    expect(decodeTransactionEvents(logs)).toEqual([]);
  });

  it('does NOT pop the invoke stack on user-controlled `Program log: success`', () => {
    // Regression: previously EXIT_RE matched `\S+` (any non-whitespace) at the
    // program-id slot, so a malicious foreign program emitting
    // `msg!("success")` (which Solana surfaces as `Program log: success`)
    // could pop the legitimate program off our stack one level early and
    // misattribute subsequent events.
    const dexId = PROGRAM_IDS.nativeDex.toBase58();
    const swapDecoder = NATIVE_DEX_EVENTS.byName['SwapExecuted']!;

    const logs = [
      `Program ${dexId} invoke [1]`,
      // Adversarial line — must NOT be treated as an EXIT for the DEX program.
      'Program log: success',
      'Program log: failed: malicious',
      // The real event still comes from the DEX (stack top intact).
      logFor(PROGRAM_IDS.nativeDex, swapDecoder, buildSwapPayload()),
      `Program ${dexId} success`,
    ];

    const events = decodeTransactionEvents(logs);
    expect(events).toHaveLength(1);
    expect(events[0]!.programName).toBe('native-dex');
    expect(events[0]!.eventName).toBe('SwapExecuted');
  });

  it('does NOT mis-route `Program data: success` payloads as EXIT lines', () => {
    // A `Program data:` line whose base64 body literally spells `success`
    // (or any non-discriminator garbage) must reach the DATA_RE branch and
    // simply fail to decode — it must never be silently consumed by EXIT_RE.
    const dexId = PROGRAM_IDS.nativeDex.toBase58();
    const swapDecoder = NATIVE_DEX_EVENTS.byName['SwapExecuted']!;

    const logs = [
      `Program ${dexId} invoke [1]`,
      // `success` base64-decodes to ~5 bytes — well below the 8-byte
      // discriminator threshold, so decodeEvent returns null. The key
      // assertion is that the stack is NOT popped here.
      'Program data: success',
      logFor(PROGRAM_IDS.nativeDex, swapDecoder, buildSwapPayload()),
      `Program ${dexId} success`,
    ];

    const events = decodeTransactionEvents(logs);
    expect(events).toHaveLength(1);
    expect(events[0]!.programName).toBe('native-dex');
    expect(events[0]!.eventName).toBe('SwapExecuted');
  });
});
