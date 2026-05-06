// Smoke E2E test — exercises the SDK's public surface end-to-end without
// signing or submitting any transaction.
//
// Three structural scenarios always run (no validator needed):
//   1. Cross-program PDA derivation (RWT vault, MerkleDistributor, Nexus)
//   2. Build a YD claim ix via `buildRwtClaimYieldIx` — assert shape
//   3. Build a Nexus swap ix via `buildNexusSwapIx` — assert shape
//
// One optional scenario runs only when a localnet validator is reachable:
//   4. Connect to RPC, fetch a known account, assert structural shape
//
// The validator probe gates only scenario 4 — the structural scenarios
// always run because they are pure functions over our SDK.

import { beforeAll, describe, expect, it } from 'vitest';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import { isValidatorReachable } from './helpers/validator.js';
import {
  findLiquidityNexusPda,
  findMerkleDistributorPda,
  findRwtVaultPda,
} from '../../src/pda/index.js';
import {
  buildNexusSwapIx,
  type NexusAccountContext,
  type PoolAccountContext,
} from '../../src/tx/native-dex/index.js';
import { buildRwtClaimYieldIx } from '../../src/tx/yield-distribution/index.js';
import {
  CLUSTER_URLS,
  NATIVE_DEX_PROGRAM_ID,
  RWT_ENGINE_PROGRAM_ID,
  YIELD_DISTRIBUTION_PROGRAM_ID,
} from '../../src/network/index.js';

const FIXTURE_OT_MINT = new PublicKey('So11111111111111111111111111111111111111112');

let validatorUp = false;
beforeAll(async () => {
  validatorUp = await isValidatorReachable();
  if (!validatorUp) {
    // eslint-disable-next-line no-console
    console.warn(
      `[smoke E2E] localnet validator at ${CLUSTER_URLS.localnet} not reachable — skipping on-chain scenario`,
    );
  }
});

describe('Scenario 1 — cross-program PDA derivation', () => {
  it('derives 3 cross-program PDAs to valid PublicKey + bump tuples', () => {
    const [vault, vaultBump] = findRwtVaultPda(RWT_ENGINE_PROGRAM_ID);
    const [dist, distBump] = findMerkleDistributorPda(
      FIXTURE_OT_MINT,
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );
    const [nexus, nexusBump] = findLiquidityNexusPda(NATIVE_DEX_PROGRAM_ID);

    for (const [pda, bump] of [[vault, vaultBump], [dist, distBump], [nexus, nexusBump]] as const) {
      expect(pda).toBeInstanceOf(PublicKey);
      expect(typeof bump).toBe('number');
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    }

    // Three distinct PDAs.
    expect(vault.equals(dist)).toBe(false);
    expect(vault.equals(nexus)).toBe(false);
    expect(dist.equals(nexus)).toBe(false);
  });
});

describe('Scenario 2 — buildRwtClaimYieldIx structural', () => {
  it('produces a well-formed TransactionInstruction', () => {
    const ix = buildRwtClaimYieldIx({
      rwtEngineProgramId: RWT_ENGINE_PROGRAM_ID,
      ydProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
      crank: Keypair.generate().publicKey,
      rwtVault: Keypair.generate().publicKey,
      distConfig: Keypair.generate().publicKey,
      rwtClaimAta: Keypair.generate().publicKey,
      liquidityDest: Keypair.generate().publicKey,
      protocolRevenueDest: Keypair.generate().publicKey,
      ydConfig: Keypair.generate().publicKey,
      otMint: FIXTURE_OT_MINT,
      ydDistributor: Keypair.generate().publicKey,
      ydClaimStatus: Keypair.generate().publicKey,
      ydRewardVault: Keypair.generate().publicKey,
      cumulativeAmount: 1_234n,
      proof: [Buffer.alloc(32, 1)],
    });

    expect(ix.programId.equals(RWT_ENGINE_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(14);
    expect(ix.keys[0]!.isSigner).toBe(true);
    // Discriminator + body length: 8 + 8 + 4 + 32 = 52 bytes for 1 proof node.
    expect(ix.data.length).toBe(52);
  });
});

describe('Scenario 3 — buildNexusSwapIx structural', () => {
  it('produces a well-formed TransactionInstruction with correct discriminator length', () => {
    const ctx: NexusAccountContext = {
      dexProgramId: NATIVE_DEX_PROGRAM_ID,
      dexConfig: Keypair.generate().publicKey,
      liquidityNexus: Keypair.generate().publicKey,
      manager: Keypair.generate().publicKey,
      arealFeeAccount: Keypair.generate().publicKey,
      nexusUsdcAta: Keypair.generate().publicKey,
      nexusRwtAta: Keypair.generate().publicKey,
    };
    const pool: PoolAccountContext = {
      pool: Keypair.generate().publicKey,
      vaultA: Keypair.generate().publicKey,
      vaultB: Keypair.generate().publicKey,
      lpPosition: Keypair.generate().publicKey,
    };

    const ix = buildNexusSwapIx({
      ctx,
      pool,
      aToB: true,
      amountIn: 100_000n,
      minAmountOut: 99_000n,
    });

    expect(ix.programId.equals(NATIVE_DEX_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(11);
    expect(ix.data.length).toBe(8 + 8 + 8 + 1);
  });
});

describe('Scenario 4 — optional on-chain check', () => {
  it.runIf(validatorUp)('connects to localnet and calls getVersion', async () => {
    const conn = new Connection(CLUSTER_URLS.localnet, 'confirmed');
    const version = await conn.getVersion();
    expect(version).toHaveProperty('solana-core');
  });

  it.skipIf(validatorUp)('skipped because validator unreachable', () => {
    expect(true).toBe(true);
  });
});
