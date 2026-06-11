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
  EarnErrorCode,
  EarnErrors,
  FutarchyErrorCode,
  FutarchyErrors,
  NativeDexErrors,
  OwnershipTokenErrorCode,
  OwnershipTokenErrors,
  RwtEngineErrorCode,
  RwtEngineErrors,
  StakingErrorCode,
  StakingErrors,
  YieldDistributionErrorCode,
  YieldDistributionErrors,
} from '../../src/errors/error-codes.js';
import {
  FUTARCHY_PROGRAM_ID,
  NATIVE_DEX_PROGRAM_ID,
  OWNERSHIP_TOKEN_PROGRAM_ID,
  PROGRAM_IDS_BY_CLUSTER,
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
    { name: 'earn', programId: PROGRAM_IDS_BY_CLUSTER.devnet.earn, errors: EarnErrors },
    { name: 'staking', programId: PROGRAM_IDS_BY_CLUSTER.devnet.staking, errors: StakingErrors },
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

  it('Earn: UnauthorizedBootstrap (6002)', () => {
    const result = mapAnchorError(EarnErrorCode.UnauthorizedBootstrap, PROGRAM_IDS_BY_CLUSTER.devnet.earn);
    expect(result?.program).toBe('earn');
    expect(result?.code).toBe(6002);
    expect(result?.name).toBe('UnauthorizedBootstrap');
    expect(result?.message).toBe('Signer is not the bootstrap authority');
  });

  it('Staking: UnauthorizedBootstrap (6017)', () => {
    const result = mapAnchorError(StakingErrorCode.UnauthorizedBootstrap, PROGRAM_IDS_BY_CLUSTER.devnet.staking);
    expect(result?.program).toBe('staking');
    expect(result?.code).toBe(6017);
    expect(result?.name).toBe('UnauthorizedBootstrap');
    expect(result?.message).toBe('Signer is not the bootstrap authority');
  });

  it('Staking: InvalidRwtMint (6010)', () => {
    const result = mapAnchorError(StakingErrorCode.InvalidRwtMint, PROGRAM_IDS_BY_CLUSTER.devnet.staking);
    expect(result?.program).toBe('staking');
    expect(result?.code).toBe(6010);
    expect(result?.name).toBe('InvalidRwtMint');
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

describe('mapAnchorError — cluster-aware (M4 fix)', () => {
  // Pre-fix the error registry was keyed solely by mainnet pubkeys (via the
  // PROGRAM_IDS shim), so devnet program-IDs in incoming errors didn't
  // resolve. Post-fix the registry covers every cluster in
  // PROGRAM_IDS_BY_CLUSTER — devnet errors map the same as mainnet.
  it('resolves errors emitted by devnet yield-distribution program ID', () => {
    const devnetYd = PROGRAM_IDS_BY_CLUSTER.devnet.yieldDistribution;
    expect(devnetYd.equals(PROGRAM_IDS_BY_CLUSTER.mainnet.yieldDistribution)).toBe(false);

    const result = mapAnchorError(YieldDistributionErrorCode.Unauthorized, devnetYd);
    expect(result).not.toBeNull();
    expect(result?.program).toBe('yieldDistribution');
    expect(result?.code).toBe(6000);
    expect(result?.name).toBe('Unauthorized');
  });

  it('resolves errors emitted by every devnet program ID', () => {
    const devnet = PROGRAM_IDS_BY_CLUSTER.devnet;
    const probes: Array<{ pid: typeof devnet.nativeDex; expected: string; codes: number[] }> = [
      { pid: devnet.nativeDex, expected: 'nativeDex', codes: NativeDexErrors.map(e => e.code) },
      {
        pid: devnet.ownershipToken,
        expected: 'ownershipToken',
        codes: OwnershipTokenErrors.map(e => e.code),
      },
      { pid: devnet.rwtEngine, expected: 'rwtEngine', codes: RwtEngineErrors.map(e => e.code) },
      { pid: devnet.earn, expected: 'earn', codes: EarnErrors.map(e => e.code) },
      { pid: devnet.staking, expected: 'staking', codes: StakingErrors.map(e => e.code) },
      {
        pid: devnet.yieldDistribution,
        expected: 'yieldDistribution',
        codes: YieldDistributionErrors.map(e => e.code),
      },
      { pid: devnet.futarchy, expected: 'futarchy', codes: FutarchyErrors.map(e => e.code) },
    ];
    for (const { pid, expected, codes } of probes) {
      if (codes.length === 0) continue; // program with empty IDL errors
      const result = mapAnchorError(codes[0]!, pid);
      expect(result).not.toBeNull();
      expect(result?.program).toBe(expected);
    }
  });
});
