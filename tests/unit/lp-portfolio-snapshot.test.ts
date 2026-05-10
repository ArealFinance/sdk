// Unit tests for `sdk/src/lp-portfolio/snapshot.ts`.
//
// We stub the three top-level enumerators directly via `vi.mock` so the
// orchestration logic (join, Nexus filter, orphan drop, partial failure,
// slot ordering) can be exercised without building real-byte buffers for
// every account type. Pricing is the real `chainPriceToUsdc` from
// markets/pricing.ts — we feed a synthetic RWT-USDC pool to keep prices
// resolvable.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  NATIVE_DEX_PROGRAM_ID,
  OWNERSHIP_TOKEN_PROGRAM_ID,
} from '../../src/network/program-ids.js';
import { RWT_MINTS, USDC_MINTS } from '../../src/network/constants.js';
import { findLiquidityNexusPda } from '../../src/pda/native-dex.js';
import type { LpPosition, PoolState } from '../../src/programs/native-dex/accounts.generated.js';
import type { OtConfig } from '../../src/programs/ownership-token/accounts.generated.js';

// Hoisted stub references — vi.mock factories run before module imports,
// so we capture handles inside the factory and re-assign per-test below.
const { positionsStub, poolsStub, otsStub } = vi.hoisted(() => ({
  positionsStub: vi.fn(),
  poolsStub: vi.fn(),
  otsStub: vi.fn(),
}));

vi.mock('../../src/lp-portfolio/enumerate-positions.js', async () => {
  const actual: any = await vi.importActual(
    '../../src/lp-portfolio/enumerate-positions.js',
  );
  return {
    ...actual,
    enumerateHolderLpPositions: positionsStub,
  };
});

vi.mock('../../src/markets/enumerate-pools.js', async () => {
  const actual: any = await vi.importActual(
    '../../src/markets/enumerate-pools.js',
  );
  return {
    ...actual,
    enumeratePools: poolsStub,
  };
});

vi.mock('../../src/portfolio/enumerate-ot.js', async () => {
  const actual: any = await vi.importActual(
    '../../src/portfolio/enumerate-ot.js',
  );
  return {
    ...actual,
    enumerateOtConfigs: otsStub,
  };
});

// Import AFTER mocks — getHolderLpPortfolio resolves the mocked enumerators.
import { getHolderLpPortfolio } from '../../src/lp-portfolio/snapshot.js';

// ─────────────────────── fixture builders ───────────────────────

function makePool(args: {
  poolAddress?: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  totalLpShares: bigint;
}): { poolAddress: PublicKey; pool: PoolState } {
  const poolAddress = args.poolAddress ?? Keypair.generate().publicKey;
  const zero32 = new PublicKey(new Uint8Array(32));
  const pool: PoolState = {
    poolType: 0,
    tokenAMint: args.tokenAMint,
    tokenBMint: args.tokenBMint,
    vaultA: zero32,
    vaultB: zero32,
    reserveA: args.reserveA,
    reserveB: args.reserveB,
    totalLpShares: args.totalLpShares,
    feeBps: 30,
    isActive: true,
    totalFeesAccumulated: 0n,
    binStepBps: 0,
    activeBinId: 0,
    otTreasuryFeeDestination: zero32,
    hasOtTreasury: false,
    bump: 255,
    cumulativeFeesPerShareA: 0n,
    cumulativeFeesPerShareB: 0n,
  };
  return { poolAddress, pool };
}

function makePosition(args: {
  positionAddress?: PublicKey;
  pool: PublicKey;
  owner: PublicKey;
  shares: bigint;
}): { positionAddress: PublicKey; position: LpPosition } {
  return {
    positionAddress: args.positionAddress ?? Keypair.generate().publicKey,
    position: {
      pool: args.pool,
      owner: args.owner,
      shares: args.shares,
      lastUpdateTs: 0n,
      bump: 255,
      feesClaimedPerShareA: 0n,
      feesClaimedPerShareB: 0n,
    },
  };
}

function makeOtConfig(args: {
  otMint: PublicKey;
  symbol: string;
  decimals?: number;
}): { configAddress: PublicKey; config: OtConfig } {
  // Right-pad to fixed widths so the trim helper sees the same shape it
  // would on real on-chain bytes.
  const nameBuf = new Uint8Array(32);
  const symBuf = new Uint8Array(10);
  const sym = new TextEncoder().encode(args.symbol);
  symBuf.set(sym.subarray(0, 10), 0);
  return {
    configAddress: Keypair.generate().publicKey,
    config: {
      otMint: args.otMint,
      name: nameBuf,
      symbol_: symBuf,
      decimals: args.decimals ?? 6,
      totalMinted: 0n,
      uri: new Uint8Array(200),
      bump: 255,
    } as unknown as OtConfig,
  };
}

// Mock connection — only `getSlot` matters here (enumerators are mocked).
function mockConn(): { conn: any; callOrder: string[] } {
  const callOrder: string[] = [];
  const conn = {
    getSlot: vi.fn(async () => {
      callOrder.push('getSlot');
      return 4242;
    }),
  };
  return { conn, callOrder };
}

const DEVNET_USDC = USDC_MINTS.devnet;
const DEVNET_RWT = RWT_MINTS.devnet;
const [NEXUS_PDA] = findLiquidityNexusPda(NATIVE_DEX_PROGRAM_ID);

const baseOpts = {
  nativeDexProgramId: NATIVE_DEX_PROGRAM_ID,
  ownershipTokenProgramId: OWNERSHIP_TOKEN_PROGRAM_ID,
  cluster: 'devnet' as const,
  liquidityNexus: NEXUS_PDA,
};

beforeEach(() => {
  positionsStub.mockReset();
  poolsStub.mockReset();
  otsStub.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────── tests ───────────────────────────

describe('getHolderLpPortfolio', () => {
  // GHL-1: happy path — one position joined with its pool, USDC priced.
  it('joins position with pool and values it in USDC end-to-end', async () => {
    const holder = Keypair.generate().publicKey;
    const ot = Keypair.generate().publicKey;

    // Two pools: one direct OT-USDC for OT pricing, plus the OT-USDC
    // pool used as the LP-position parent. (Same pool serves both roles.)
    const { poolAddress: otUsdcAddr, pool: otUsdcPool } = makePool({
      tokenAMint: ot,
      tokenBMint: DEVNET_USDC,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      totalLpShares: 1_000_000n,
    });

    poolsStub.mockResolvedValue([{ poolAddress: otUsdcAddr, pool: otUsdcPool }]);
    otsStub.mockResolvedValue([
      makeOtConfig({ otMint: ot, symbol: 'TST', decimals: 6 }),
    ]);
    positionsStub.mockResolvedValue([
      makePosition({ pool: otUsdcAddr, owner: holder, shares: 100_000n }),
    ]);

    const { conn, callOrder } = mockConn();
    const snap = await getHolderLpPortfolio(conn, holder, baseOpts);

    expect(snap.holder.equals(holder)).toBe(true);
    expect(snap.rows).toHaveLength(1);
    const row = snap.rows[0]!;
    expect(row.poolAddress.equals(otUsdcAddr)).toBe(true);
    expect(row.symbolA).toBe('TST');
    expect(row.symbolB).toBe('USDC');
    expect(row.decimalsA).toBe(6);
    expect(row.decimalsB).toBe(6);
    expect(row.isEmpty).toBe(false);

    // 100k / 1M shares = 10% of pool: 100k of each side raw.
    expect(row.valuation.amountA).toBe(100_000n);
    expect(row.valuation.amountB).toBe(100_000n);
    // 0.1 token × $1 each side = $0.10; total = $0.20.
    expect(row.valuation.totalUsdc).toBeCloseTo(0.2, 12);
    expect(row.valuation.pctA).toBeCloseTo(0.5, 12);
    expect(row.valuation.ratioA).toBe(row.valuation.pctA);

    expect(snap.totalUsdc).toBeCloseTo(0.2, 12);
    expect(snap.slot).toBe(4242);
    expect(typeof snap.fetchedAt).toBe('number');
    // getSlot is the LAST call after all reads (all enumerators mocked
    // and resolved before getSlot is awaited).
    expect(callOrder[callOrder.length - 1]).toBe('getSlot');
  });

  // GHL-2: orphan position (pool not in pool map) is dropped silently.
  it('drops positions whose parent pool is not enumerated', async () => {
    const holder = Keypair.generate().publicKey;
    const orphanPoolAddr = Keypair.generate().publicKey;

    poolsStub.mockResolvedValue([]); // pool list is empty
    otsStub.mockResolvedValue([]);
    positionsStub.mockResolvedValue([
      makePosition({
        pool: orphanPoolAddr,
        owner: holder,
        shares: 500n,
      }),
    ]);

    const { conn } = mockConn();
    const snap = await getHolderLpPortfolio(conn, holder, baseOpts);
    expect(snap.rows).toHaveLength(0);
    expect(snap.totalUsdc).toBeNull();
  });

  // GHL-3: defensive Nexus filter — a position owned by Nexus PDA is dropped.
  it('drops positions whose owner equals the LiquidityNexus PDA', async () => {
    // Holder == Nexus PDA simulates the worst case: caller misuses the
    // helper with the Nexus address. Even with a parent pool present,
    // the row must NOT appear.
    const { poolAddress, pool } = makePool({
      tokenAMint: DEVNET_RWT,
      tokenBMint: DEVNET_USDC,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      totalLpShares: 1_000_000n,
    });

    poolsStub.mockResolvedValue([{ poolAddress, pool }]);
    otsStub.mockResolvedValue([]);
    positionsStub.mockResolvedValue([
      makePosition({
        pool: poolAddress,
        owner: NEXUS_PDA, // the defense-in-depth case
        shares: 1_000n,
      }),
    ]);

    const { conn } = mockConn();
    const snap = await getHolderLpPortfolio(conn, NEXUS_PDA, baseOpts);
    expect(snap.rows).toHaveLength(0);
  });

  // GHL-4: partial failure — positions enumerator throws → empty rows,
  // snapshot still returns successfully.
  it('degrades to empty rows when enumerateHolderLpPositions fails', async () => {
    positionsStub.mockRejectedValue(new Error('rpc down'));
    poolsStub.mockResolvedValue([]);
    otsStub.mockResolvedValue([]);

    const { conn } = mockConn();
    const snap = await getHolderLpPortfolio(
      conn,
      Keypair.generate().publicKey,
      baseOpts,
    );
    expect(snap.rows).toHaveLength(0);
    expect(snap.totalUsdc).toBeNull();
    expect(snap.slot).toBe(4242);
  });

  // GHL-5: pool enumerator fails → all positions become orphans.
  it('drops all positions when pool enumeration fails', async () => {
    const holder = Keypair.generate().publicKey;
    poolsStub.mockRejectedValue(new Error('dex down'));
    otsStub.mockResolvedValue([]);
    positionsStub.mockResolvedValue([
      makePosition({
        pool: Keypair.generate().publicKey,
        owner: holder,
        shares: 1n,
      }),
    ]);

    const { conn } = mockConn();
    const snap = await getHolderLpPortfolio(conn, holder, baseOpts);
    expect(snap.rows).toHaveLength(0);
  });

  // GHL-6: OT enumerator fails → fallback symbols (4-char prefix), still works.
  it('falls back to 4-char mint prefixes when OT enumeration fails', async () => {
    const holder = Keypair.generate().publicKey;
    const exotic = Keypair.generate().publicKey;
    const { poolAddress, pool } = makePool({
      tokenAMint: exotic,
      tokenBMint: DEVNET_USDC,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      totalLpShares: 1_000_000n,
    });

    poolsStub.mockResolvedValue([{ poolAddress, pool }]);
    otsStub.mockRejectedValue(new Error('ot program missing'));
    positionsStub.mockResolvedValue([
      makePosition({ pool: poolAddress, owner: holder, shares: 1_000n }),
    ]);

    const { conn } = mockConn();
    const snap = await getHolderLpPortfolio(conn, holder, baseOpts);
    expect(snap.rows).toHaveLength(1);
    expect(snap.rows[0]!.symbolA).toBe(exotic.toBase58().slice(0, 4));
    // USDC always registered explicitly — not a prefix fallback.
    expect(snap.rows[0]!.symbolB).toBe('USDC');
  });

  // GHL-7: aggregate totalUsdc — null when every row contributed null.
  it('aggregates totalUsdc as null when no row contributed', async () => {
    const holder = Keypair.generate().publicKey;
    const exoticA = Keypair.generate().publicKey;
    const exoticB = Keypair.generate().publicKey;
    // Pool with two unknown mints (no direct USDC pool, no RWT pool) →
    // both sides unpriceable → row.totalUsdc is null.
    const { poolAddress, pool } = makePool({
      tokenAMint: exoticA,
      tokenBMint: exoticB,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      totalLpShares: 1_000_000n,
    });

    poolsStub.mockResolvedValue([{ poolAddress, pool }]);
    otsStub.mockResolvedValue([]);
    positionsStub.mockResolvedValue([
      makePosition({ pool: poolAddress, owner: holder, shares: 1_000n }),
    ]);

    const { conn } = mockConn();
    const snap = await getHolderLpPortfolio(conn, holder, baseOpts);
    expect(snap.rows).toHaveLength(1);
    expect(snap.rows[0]!.valuation.totalUsdc).toBeNull();
    expect(snap.totalUsdc).toBeNull();
  });

  // GHL-8: empty position (shares == 0n) → isEmpty=true, kept in rows.
  it('marks shares==0n positions as isEmpty without filtering them out', async () => {
    const holder = Keypair.generate().publicKey;
    const { poolAddress, pool } = makePool({
      tokenAMint: DEVNET_RWT,
      tokenBMint: DEVNET_USDC,
      reserveA: 1_000_000n,
      reserveB: 1_000_000n,
      totalLpShares: 1_000_000n,
    });

    poolsStub.mockResolvedValue([{ poolAddress, pool }]);
    otsStub.mockResolvedValue([]);
    positionsStub.mockResolvedValue([
      makePosition({ pool: poolAddress, owner: holder, shares: 0n }),
    ]);

    const { conn } = mockConn();
    const snap = await getHolderLpPortfolio(conn, holder, baseOpts);
    expect(snap.rows).toHaveLength(1);
    expect(snap.rows[0]!.isEmpty).toBe(true);
    expect(snap.rows[0]!.valuation.amountA).toBe(0n);
  });
});
