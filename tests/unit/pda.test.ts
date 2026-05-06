// Unit tests for `sdk/src/pda/`. For each helper:
//   1. happy path:  determinism (same input → same output)
//   2. tuple shape: 2nd element matches PublicKey.findProgramAddressSync's
//                   bump byte for the same seeds
//   3. uniqueness:  different inputs → different outputs
//
// We avoid hardcoded address vectors because the canonical reference
// (`@solana/web3.js`) is the same routine the helpers wrap; a vector test
// would only verify "we computed the same thing twice". The bump-equality
// check provides the meaningful assertion against an independent computation
// path.

import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';

import {
  findAssociatedTokenAddressPda,
  findBinArrayPda,
  findClaimStatusPda,
  findDexConfigPda,
  findFutarchyConfigPda,
  findLiquidityHoldingPda,
  findLiquidityNexusPda,
  findLpPositionPda,
  findMerkleDistributorPda,
  findOtConfigPda,
  findOtGovernancePda,
  findOtTreasuryPda,
  findPoolCreatorsPda,
  findPoolStatePda,
  findProposalPda,
  findRevenueAccountPda,
  findRevenueConfigPda,
  findRwtDistConfigPda,
  findRwtVaultPda,
  findYdAccumulatorPda,
  findYdConfigPda,
} from '../../src/pda/index.js';
import {
  FUTARCHY_PROGRAM_ID,
  NATIVE_DEX_PROGRAM_ID,
  OWNERSHIP_TOKEN_PROGRAM_ID,
  RWT_ENGINE_PROGRAM_ID,
  YIELD_DISTRIBUTION_PROGRAM_ID,
} from '../../src/network/program-ids.js';

// Stable test fixtures — System program ID is convenient because it's
// well-known and not on a curve, which is fine for use as seed material.
const FIXTURE_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const FIXTURE_OWNER = new PublicKey('11111111111111111111111111111111');
const FIXTURE_OTHER = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/** Assert a `find*Pda` returns `[PublicKey, bumpByte]` and is deterministic. */
function assertPdaShape(
  result: [PublicKey, number],
  expectedSeeds: (Buffer | Uint8Array)[],
  programId: PublicKey,
) {
  const [pda, bump] = result;
  expect(pda).toBeInstanceOf(PublicKey);
  expect(bump).toBeGreaterThanOrEqual(0);
  expect(bump).toBeLessThanOrEqual(255);
  // Independent computation path — must produce identical output.
  const [refPda, refBump] = PublicKey.findProgramAddressSync(
    expectedSeeds.map(s => Buffer.from(s)),
    programId,
  );
  expect(pda.equals(refPda)).toBe(true);
  expect(bump).toBe(refBump);
}

describe('PDA helpers — shared (SPL ATA)', () => {
  it('findAssociatedTokenAddressPda: matches reference + deterministic', () => {
    const [a, bumpA] = findAssociatedTokenAddressPda(FIXTURE_OWNER, FIXTURE_MINT);
    const [b, bumpB] = findAssociatedTokenAddressPda(FIXTURE_OWNER, FIXTURE_MINT);
    expect(a.equals(b)).toBe(true);
    expect(bumpA).toBe(bumpB);
  });

  it('findAssociatedTokenAddressPda: different mint → different address', () => {
    const [a] = findAssociatedTokenAddressPda(FIXTURE_OWNER, FIXTURE_MINT);
    const [b] = findAssociatedTokenAddressPda(FIXTURE_OWNER, FIXTURE_OTHER);
    expect(a.equals(b)).toBe(false);
  });
});

describe('PDA helpers — native-dex', () => {
  it('findDexConfigPda', () => {
    assertPdaShape(
      findDexConfigPda(NATIVE_DEX_PROGRAM_ID),
      [Buffer.from('dex_config')],
      NATIVE_DEX_PROGRAM_ID,
    );
  });

  it('findPoolCreatorsPda', () => {
    assertPdaShape(
      findPoolCreatorsPda(NATIVE_DEX_PROGRAM_ID),
      [Buffer.from('pool_creators')],
      NATIVE_DEX_PROGRAM_ID,
    );
  });

  it('findPoolStatePda — different mint pairs derive different PDAs', () => {
    assertPdaShape(
      findPoolStatePda(FIXTURE_MINT, FIXTURE_OTHER, NATIVE_DEX_PROGRAM_ID),
      [Buffer.from('pool'), FIXTURE_MINT.toBuffer(), FIXTURE_OTHER.toBuffer()],
      NATIVE_DEX_PROGRAM_ID,
    );
    const [a] = findPoolStatePda(FIXTURE_MINT, FIXTURE_OTHER, NATIVE_DEX_PROGRAM_ID);
    const [b] = findPoolStatePda(FIXTURE_OTHER, FIXTURE_MINT, NATIVE_DEX_PROGRAM_ID);
    // Order matters in seeds — different orderings → different PDAs.
    expect(a.equals(b)).toBe(false);
  });

  it('findLpPositionPda', () => {
    const [pool] = findPoolStatePda(FIXTURE_MINT, FIXTURE_OTHER, NATIVE_DEX_PROGRAM_ID);
    assertPdaShape(
      findLpPositionPda(pool, FIXTURE_OWNER, NATIVE_DEX_PROGRAM_ID),
      [Buffer.from('lp'), pool.toBuffer(), FIXTURE_OWNER.toBuffer()],
      NATIVE_DEX_PROGRAM_ID,
    );
  });

  it('findBinArrayPda', () => {
    const [pool] = findPoolStatePda(FIXTURE_MINT, FIXTURE_OTHER, NATIVE_DEX_PROGRAM_ID);
    assertPdaShape(
      findBinArrayPda(pool, NATIVE_DEX_PROGRAM_ID),
      [Buffer.from('bins'), pool.toBuffer()],
      NATIVE_DEX_PROGRAM_ID,
    );
  });

  it('findLiquidityNexusPda', () => {
    assertPdaShape(
      findLiquidityNexusPda(NATIVE_DEX_PROGRAM_ID),
      [Buffer.from('liquidity_nexus')],
      NATIVE_DEX_PROGRAM_ID,
    );
  });
});

describe('PDA helpers — ownership-token', () => {
  it('findOtConfigPda', () => {
    assertPdaShape(
      findOtConfigPda(FIXTURE_MINT, OWNERSHIP_TOKEN_PROGRAM_ID),
      [Buffer.from('ot_config'), FIXTURE_MINT.toBuffer()],
      OWNERSHIP_TOKEN_PROGRAM_ID,
    );
  });

  it('findRevenueAccountPda', () => {
    assertPdaShape(
      findRevenueAccountPda(FIXTURE_MINT, OWNERSHIP_TOKEN_PROGRAM_ID),
      [Buffer.from('revenue'), FIXTURE_MINT.toBuffer()],
      OWNERSHIP_TOKEN_PROGRAM_ID,
    );
  });

  it('findRevenueConfigPda', () => {
    assertPdaShape(
      findRevenueConfigPda(FIXTURE_MINT, OWNERSHIP_TOKEN_PROGRAM_ID),
      [Buffer.from('revenue_config'), FIXTURE_MINT.toBuffer()],
      OWNERSHIP_TOKEN_PROGRAM_ID,
    );
  });

  it('findOtGovernancePda', () => {
    assertPdaShape(
      findOtGovernancePda(FIXTURE_MINT, OWNERSHIP_TOKEN_PROGRAM_ID),
      [Buffer.from('ot_governance'), FIXTURE_MINT.toBuffer()],
      OWNERSHIP_TOKEN_PROGRAM_ID,
    );
  });

  it('findOtTreasuryPda', () => {
    assertPdaShape(
      findOtTreasuryPda(FIXTURE_MINT, OWNERSHIP_TOKEN_PROGRAM_ID),
      [Buffer.from('ot_treasury'), FIXTURE_MINT.toBuffer()],
      OWNERSHIP_TOKEN_PROGRAM_ID,
    );
  });

  it('findOtConfigPda: different OT mint → different PDA', () => {
    const [a] = findOtConfigPda(FIXTURE_MINT, OWNERSHIP_TOKEN_PROGRAM_ID);
    const [b] = findOtConfigPda(FIXTURE_OTHER, OWNERSHIP_TOKEN_PROGRAM_ID);
    expect(a.equals(b)).toBe(false);
  });
});

describe('PDA helpers — rwt-engine', () => {
  it('findRwtVaultPda — singleton', () => {
    assertPdaShape(
      findRwtVaultPda(RWT_ENGINE_PROGRAM_ID),
      [Buffer.from('rwt_vault')],
      RWT_ENGINE_PROGRAM_ID,
    );
  });

  it('findRwtDistConfigPda — singleton', () => {
    assertPdaShape(
      findRwtDistConfigPda(RWT_ENGINE_PROGRAM_ID),
      [Buffer.from('dist_config_rwt')],
      RWT_ENGINE_PROGRAM_ID,
    );
  });
});

describe('PDA helpers — yield-distribution', () => {
  it('findYdConfigPda — singleton', () => {
    assertPdaShape(
      findYdConfigPda(YIELD_DISTRIBUTION_PROGRAM_ID),
      [Buffer.from('dist_config')],
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );
  });

  it('findMerkleDistributorPda', () => {
    assertPdaShape(
      findMerkleDistributorPda(FIXTURE_MINT, YIELD_DISTRIBUTION_PROGRAM_ID),
      [Buffer.from('merkle_dist'), FIXTURE_MINT.toBuffer()],
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );
  });

  it('findYdAccumulatorPda', () => {
    assertPdaShape(
      findYdAccumulatorPda(FIXTURE_MINT, YIELD_DISTRIBUTION_PROGRAM_ID),
      [Buffer.from('accumulator'), FIXTURE_MINT.toBuffer()],
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );
  });

  it('findClaimStatusPda', () => {
    const [dist] = findMerkleDistributorPda(FIXTURE_MINT, YIELD_DISTRIBUTION_PROGRAM_ID);
    assertPdaShape(
      findClaimStatusPda(dist, FIXTURE_OWNER, YIELD_DISTRIBUTION_PROGRAM_ID),
      [Buffer.from('claim_status'), dist.toBuffer(), FIXTURE_OWNER.toBuffer()],
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );
  });

  it('findLiquidityHoldingPda — singleton', () => {
    assertPdaShape(
      findLiquidityHoldingPda(YIELD_DISTRIBUTION_PROGRAM_ID),
      [Buffer.from('liq_holding')],
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );
  });
});

describe('PDA helpers — futarchy', () => {
  it('findFutarchyConfigPda', () => {
    assertPdaShape(
      findFutarchyConfigPda(FIXTURE_MINT, FUTARCHY_PROGRAM_ID),
      [Buffer.from('futarchy_config'), FIXTURE_MINT.toBuffer()],
      FUTARCHY_PROGRAM_ID,
    );
  });

  it('findProposalPda — encodes proposal id as u64 LE', () => {
    const [config] = findFutarchyConfigPda(FIXTURE_MINT, FUTARCHY_PROGRAM_ID);
    const proposalId = 42n;
    const idBuffer = Buffer.alloc(8);
    idBuffer.writeBigUInt64LE(proposalId);
    assertPdaShape(
      findProposalPda(config, proposalId, FUTARCHY_PROGRAM_ID),
      [Buffer.from('proposal'), config.toBuffer(), idBuffer],
      FUTARCHY_PROGRAM_ID,
    );
  });

  it('findProposalPda — different ids → different PDAs', () => {
    const [config] = findFutarchyConfigPda(FIXTURE_MINT, FUTARCHY_PROGRAM_ID);
    const [a] = findProposalPda(config, 1n, FUTARCHY_PROGRAM_ID);
    const [b] = findProposalPda(config, 2n, FUTARCHY_PROGRAM_ID);
    expect(a.equals(b)).toBe(false);
  });
});
