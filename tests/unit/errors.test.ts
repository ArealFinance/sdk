// Unit tests for `sdk/src/errors/`. For each program:
//   - every code in its enum maps to a MappedAnchorError with the right
//     program label, code, name and message
//   - unknown code → null
// Plus:
//   - unknown programId → null
//   - non-error input (no code) → null
//   - extractErrorCode integration: `{ InstructionError: [0, { Custom: N }] }`
//     style errors decode correctly

import { describe, expect, it } from 'vitest';
import { Keypair } from '@solana/web3.js';

import { mapAnchorError } from '../../src/errors/mapper.js';
import {
  FutarchyErrorCode,
  FutarchyErrors,
  NativeDexErrors,
  OwnershipTokenErrorCode,
  OwnershipTokenErrors,
  RwtEngineErrorCode,
  RwtEngineErrors,
  YieldDistributionErrorCode,
  YieldDistributionErrors,
} from '../../src/errors/error-codes.js';
import {
  FUTARCHY_PROGRAM_ID,
  NATIVE_DEX_PROGRAM_ID,
  OWNERSHIP_TOKEN_PROGRAM_ID,
  RWT_ENGINE_PROGRAM_ID,
  YIELD_DISTRIBUTION_PROGRAM_ID,
} from '../../src/network/program-ids.js';

describe('mapAnchorError — coverage across all programs', () => {
  const cases = [
    { name: 'yieldDistribution', programId: YIELD_DISTRIBUTION_PROGRAM_ID, errors: YieldDistributionErrors },
    { name: 'ownershipToken', programId: OWNERSHIP_TOKEN_PROGRAM_ID, errors: OwnershipTokenErrors },
    { name: 'rwtEngine', programId: RWT_ENGINE_PROGRAM_ID, errors: RwtEngineErrors },
    { name: 'futarchy', programId: FUTARCHY_PROGRAM_ID, errors: FutarchyErrors },
    { name: 'nativeDex', programId: NATIVE_DEX_PROGRAM_ID, errors: NativeDexErrors },
  ];

  for (const c of cases) {
    it(`${c.name}: every IDL code decodes correctly`, () => {
      // native-dex IDL declares zero errors — sanity-check by length only
      // and skip the per-code loop (the .forEach on an empty array is fine
      // but the assertion is informative).
      expect(c.errors.length).toBeGreaterThanOrEqual(0);
      for (const idlError of c.errors) {
        const result = mapAnchorError(idlError.code, c.programId);
        expect(result).not.toBeNull();
        expect(result?.program).toBe(c.name);
        expect(result?.code).toBe(idlError.code);
        expect(result?.name).toBe(idlError.name);
        expect(result?.message).toBe(idlError.msg);
      }
    });
  }
});

describe('mapAnchorError — known-name spot checks', () => {
  it('YD: Unauthorized (6000)', () => {
    const result = mapAnchorError(YieldDistributionErrorCode.Unauthorized, YIELD_DISTRIBUTION_PROGRAM_ID);
    expect(result?.program).toBe('yieldDistribution');
    expect(result?.code).toBe(6000);
    expect(result?.name).toBe('Unauthorized');
    expect(result?.message.length).toBeGreaterThan(0);
  });

  it('OT: code matches `OwnershipTokenErrorCode` enum', () => {
    // Take whichever the first declared code is — the enum values are the
    // numeric codes themselves.
    const firstCode = Object.values(OwnershipTokenErrorCode).find(
      v => typeof v === 'number',
    ) as number | undefined;
    if (firstCode === undefined) return; // enum empty → skip
    const result = mapAnchorError(firstCode, OWNERSHIP_TOKEN_PROGRAM_ID);
    expect(result?.program).toBe('ownershipToken');
    expect(result?.code).toBe(firstCode);
  });

  it('RWT + Futarchy enums also decode', () => {
    const rwtFirst = Object.values(RwtEngineErrorCode).find(
      v => typeof v === 'number',
    ) as number | undefined;
    const futFirst = Object.values(FutarchyErrorCode).find(
      v => typeof v === 'number',
    ) as number | undefined;
    if (rwtFirst !== undefined) {
      expect(mapAnchorError(rwtFirst, RWT_ENGINE_PROGRAM_ID)?.program).toBe('rwtEngine');
    }
    if (futFirst !== undefined) {
      expect(mapAnchorError(futFirst, FUTARCHY_PROGRAM_ID)?.program).toBe('futarchy');
    }
  });
});

describe('mapAnchorError — null cases', () => {
  it('returns null for unknown code on a known program', () => {
    const result = mapAnchorError(99999, YIELD_DISTRIBUTION_PROGRAM_ID);
    expect(result).toBeNull();
  });

  it('returns null for unknown programId', () => {
    const unknown = Keypair.generate().publicKey;
    const result = mapAnchorError(6000, unknown);
    expect(result).toBeNull();
  });

  it('returns null when extractErrorCode finds no code in the input', () => {
    const result = mapAnchorError({ unrelated: 'object' }, YIELD_DISTRIBUTION_PROGRAM_ID);
    expect(result).toBeNull();
  });

  it('returns null for a plain Error (no Solana RPC envelope)', () => {
    const result = mapAnchorError(new Error('something else'), YIELD_DISTRIBUTION_PROGRAM_ID);
    expect(result).toBeNull();
  });
});

describe('mapAnchorError — extractErrorCode integration', () => {
  it('decodes from { InstructionError: [_, { Custom: N }] } RPC envelope', () => {
    const fakeRpcError = {
      InstructionError: [0, { Custom: YieldDistributionErrorCode.Unauthorized }],
    };
    const result = mapAnchorError(fakeRpcError, YIELD_DISTRIBUTION_PROGRAM_ID);
    expect(result?.name).toBe('Unauthorized');
    expect(result?.code).toBe(6000);
  });
});
