// Unit tests for `sdk/src/markets/snapshot.ts`.
//
// All tests run against a mocked `Connection`. We build minimal real-byte
// buffers for OtConfig / PoolState / RwtVault so the codegen parsers do
// their actual work — this catches discriminator drift simultaneously
// with the orchestration logic. Mirrors the strategy of
// `tests/unit/portfolio.test.ts`.

import { Buffer } from 'buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import { getMarketsSnapshot } from '../../src/markets/snapshot.js';
import {
  OWNERSHIP_TOKEN_PROGRAM_ID,
  NATIVE_DEX_PROGRAM_ID,
  RWT_ENGINE_PROGRAM_ID,
} from '../../src/network/program-ids.js';
import { RWT_MINTS, USDC_MINTS } from '../../src/network/constants.js';
import { OTCONFIG_DISCRIMINATOR } from '../../src/programs/ownership-token/accounts.generated.js';
import { POOLSTATE_DISCRIMINATOR } from '../../src/programs/native-dex/accounts.generated.js';
import { RWTVAULT_DISCRIMINATOR } from '../../src/programs/rwt-engine/accounts.generated.js';
import { findRwtVaultPda } from '../../src/pda/rwt-engine.js';

// ─────────────────────── byte buffer fixtures ───────────────────────

/**
 * OtConfig layout:
 *   [8] disc | [32] ot_mint | [32] name | [10] symbol | [1] decimals |
 *   [8] total_minted | [200] uri | [1] bump
 */
function buildOtConfigBytes(args: {
  otMint: PublicKey;
  name?: string;
  symbol?: string;
  decimals?: number;
}): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 + 10 + 1 + 8 + 200 + 1);
  let off = 0;
  buf.set(OTCONFIG_DISCRIMINATOR, off); off += 8;
  buf.set(args.otMint.toBuffer(), off); off += 32;

  const nameBytes = Buffer.from(args.name ?? 'Test OT', 'utf-8');
  buf.set(nameBytes, off); off += 32;

  const symBytes = Buffer.from(args.symbol ?? 'TST', 'utf-8');
  buf.set(symBytes, off); off += 10;

  buf.writeUInt8(args.decimals ?? 6, off); off += 1;
  buf.writeBigUInt64LE(0n, off); off += 8;
  off += 200; // uri
  buf.writeUInt8(255, off); // bump
  return buf;
}

/**
 * PoolState layout (272 bytes total, post CP-1 Monotonic Ladder anchors):
 *   [8] disc | [1] pool_type | [32]×4 mints/vaults | [8]×2 reserves |
 *   [16] total_lp_shares | [2] fee_bps | [1] is_active |
 *   [8] total_fees_accumulated | [2] bin_step_bps | [4] active_bin_id |
 *   [32] ot_treasury_fee_destination | [1] has_ot_treasury | [1] bump |
 *   [16]×2 cumulative_fees_per_share |
 *   [4]×4 left_anchor_bin / permanent_tail_floor_bin /
 *         last_rebalance_nav_bin / active_zone_lower |
 *   [2] permanent_tail_offset_bps | [2] _pad_monotonic
 */
function buildPoolStateBytes(args: {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  feeBps?: number;
  isActive?: boolean;
}): Buffer {
  const buf = Buffer.alloc(272);
  let off = 0;
  buf.set(POOLSTATE_DISCRIMINATOR, off); off += 8;
  buf.writeUInt8(0, off); off += 1; // pool_type = 0 (Standard)
  buf.set(args.tokenAMint.toBuffer(), off); off += 32;
  buf.set(args.tokenBMint.toBuffer(), off); off += 32;
  off += 32; // vault_a (zero)
  off += 32; // vault_b (zero)
  buf.writeBigUInt64LE(args.reserveA, off); off += 8;
  buf.writeBigUInt64LE(args.reserveB, off); off += 8;
  off += 16; // total_lp_shares (zero)
  buf.writeUInt16LE(args.feeBps ?? 30, off); off += 2;
  buf.writeUInt8(args.isActive === false ? 0 : 1, off); off += 1;
  off += 8; // total_fees_accumulated
  off += 2; // bin_step_bps
  off += 4; // active_bin_id
  off += 32; // ot_treasury_fee_destination
  buf.writeUInt8(0, off); off += 1; // has_ot_treasury = false
  buf.writeUInt8(255, off); off += 1; // bump
  off += 16; // cumulative_fees_per_share_a
  off += 16; // cumulative_fees_per_share_b
  // CP-1 Monotonic Ladder anchors — zero-default for StandardCurve pools.
  off += 4; // left_anchor_bin
  off += 4; // permanent_tail_floor_bin
  off += 4; // last_rebalance_nav_bin
  off += 4; // active_zone_lower
  off += 2; // permanent_tail_offset_bps
  off += 2; // _pad_monotonic
  return buf;
}

/**
 * RwtVault layout (267 bytes total):
 *   [8] disc | [16] total_invested_capital | [8] total_rwt_supply |
 *   [8] nav_book_value | [32] capital_accumulator_ata | [32] rwt_mint |
 *   [32] authority | [32] pending_authority | [1] has_pending |
 *   [32] manager | [32] pause_authority | [1] mint_paused |
 *   [32] areal_fee_destination | [1] bump
 */
function buildRwtVaultBytes(args: {
  navBookValue: bigint;
  totalRwtSupply: bigint;
}): Buffer {
  const buf = Buffer.alloc(8 + 16 + 8 + 8 + 32 * 3 + 32 + 1 + 32 + 32 + 1 + 32 + 1);
  let off = 0;
  buf.set(RWTVAULT_DISCRIMINATOR, off); off += 8;
  off += 16; // total_invested_capital (zero)
  buf.writeBigUInt64LE(args.totalRwtSupply, off); off += 8;
  buf.writeBigUInt64LE(args.navBookValue, off); off += 8;
  off += 32; // capital_accumulator_ata
  off += 32; // rwt_mint
  off += 32; // authority
  off += 32; // pending_authority
  buf.writeUInt8(0, off); off += 1; // has_pending
  off += 32; // manager
  off += 32; // pause_authority
  buf.writeUInt8(0, off); off += 1; // mint_paused
  off += 32; // areal_fee_destination
  buf.writeUInt8(255, off); // bump
  return buf;
}

// ─────────────────────── connection mock ───────────────────────

interface MockConnection {
  getProgramAccounts: ReturnType<typeof vi.fn>;
  getAccountInfo: ReturnType<typeof vi.fn>;
  getSlot: ReturnType<typeof vi.fn>;
  callOrder: string[];
}

function makeMockConnection(): MockConnection {
  const callOrder: string[] = [];
  const track = (name: string) => callOrder.push(name);

  return {
    callOrder,
    getProgramAccounts: vi.fn(async (_programId: PublicKey) => {
      track('getProgramAccounts');
      return [];
    }),
    getAccountInfo: vi.fn(async (_pk: PublicKey) => {
      track('getAccountInfo');
      return null;
    }),
    getSlot: vi.fn(async () => {
      track('getSlot');
      return 9999;
    }),
  };
}

// Devnet RWT/USDC mints come from the bootstrap pipeline (real on-chain
// mints); the per-cluster table in network/constants.ts is the source of
// truth and is consumed here for test fixtures.
const DEVNET_RWT = RWT_MINTS.devnet;
const DEVNET_USDC = USDC_MINTS.devnet;
const OT_MINT = Keypair.generate().publicKey;

const baseOpts = {
  nativeDexProgramId: NATIVE_DEX_PROGRAM_ID,
  ownershipTokenProgramId: OWNERSHIP_TOKEN_PROGRAM_ID,
  rwtEngineProgramId: RWT_ENGINE_PROGRAM_ID,
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────── tests ───────────────────────────

describe('getMarketsSnapshot', () => {
  // MS-1: happy path — OT + RWT-USDC pool + OT-RWT pool, all priced.
  it('produces priced tokens + pools end-to-end', async () => {
    const conn = makeMockConnection();

    conn.getProgramAccounts.mockImplementation(async (programId: PublicKey) => {
      if (programId.equals(OWNERSHIP_TOKEN_PROGRAM_ID)) {
        return [
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: buildOtConfigBytes({
                otMint: OT_MINT,
                name: 'Test',
                symbol: 'TST',
                decimals: 6,
              }),
              executable: false,
              lamports: 0,
              owner: OWNERSHIP_TOKEN_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
        ];
      }
      if (programId.equals(NATIVE_DEX_PROGRAM_ID)) {
        return [
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: buildPoolStateBytes({
                tokenAMint: DEVNET_RWT,
                tokenBMint: DEVNET_USDC,
                reserveA: 1_000_000n,
                reserveB: 1_000_000n,
              }),
              executable: false,
              lamports: 0,
              owner: NATIVE_DEX_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: buildPoolStateBytes({
                tokenAMint: OT_MINT,
                tokenBMint: DEVNET_RWT,
                reserveA: 1_000_000n,
                reserveB: 1_000_000n,
              }),
              executable: false,
              lamports: 0,
              owner: NATIVE_DEX_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
        ];
      }
      return [];
    });

    const [vaultPda] = findRwtVaultPda(RWT_ENGINE_PROGRAM_ID);
    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      if (key.equals(vaultPda)) {
        return {
          data: buildRwtVaultBytes({
            navBookValue: 5_000_000n,
            totalRwtSupply: 1_000_000n,
          }),
          executable: false,
          lamports: 0,
          owner: RWT_ENGINE_PROGRAM_ID,
          rentEpoch: 0,
        };
      }
      return null;
    });

    const snap = await getMarketsSnapshot(conn as any, 'devnet', baseOpts);

    expect(snap.tokens).toHaveLength(2); // RWT + OT
    expect(snap.pools).toHaveLength(2);
    expect(snap.slot).toBe(9999);
    expect(typeof snap.fetchedAt).toBe('number');

    // RWT row — priced from NAV (5_000_000n / NAV_SCALE = $5.00), not
    // from the RWT-USDC pool's reserve ratio. See snapshot.ts comment
    // on the master-pool single-sided design.
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    expect(rwt).toBeDefined();
    expect(rwt!.priceUsdc).toBe(5);
    expect(rwt!.priceSource).toBe('nav');
    expect(rwt!.nav).toBe(5_000_000n);

    // OT row priced via RWT. Per SDK 0.12.7, the snapshot threads the
    // NAV-derived RWT price into `chainPriceToUsdc` as an override, so
    // OT price = OT/RWT spot × NAV-RWT-USDC = 1 × $5.00 = $5.00 (not
    // the master-pool reserve product, which would also give $1 here
    // but would drift to $20 under the realistic single-sided ladder
    // imbalance — see MS-10 below).
    const ot = snap.tokens.find((t) => t.symbol === 'TST');
    expect(ot).toBeDefined();
    expect(ot!.priceSource).toBe('via-rwt');
    expect(ot!.priceUsdc).toBe(5);

    // Both pools have TVL
    expect(snap.pools.every((p) => p.tvlUsdc !== null)).toBe(true);
    // RWT-USDC pool is exact, OT-RWT pool is exact (since RWT itself priced)
    expect(snap.pools.every((p) => p.tvlSource === 'exact')).toBe(true);

    // RwtVault was read
    expect(snap.rwtVault).toEqual({
      navBookValue: 5_000_000n,
      totalRwtSupply: 1_000_000n,
      totalInvestedCapital: 0n,
    });
  });

  // MS-2: enumerateOtConfigs throws → ots:[], snapshot still returns
  it('degrades to empty OT list when OT enumeration fails', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockImplementation(async (programId: PublicKey) => {
      if (programId.equals(OWNERSHIP_TOKEN_PROGRAM_ID)) {
        throw new Error('OT program not deployed');
      }
      return [];
    });

    const snap = await getMarketsSnapshot(conn as any, 'devnet', baseOpts);
    // Only the synthetic RWT row survives (no OT configs).
    expect(snap.tokens).toHaveLength(1);
    expect(snap.tokens[0]!.symbol).toBe('RWT');
    expect(snap.pools).toHaveLength(0);
  });

  // MS-3: enumeratePools throws → pools:[], snapshot still returns
  it('degrades to empty pool list when pool enumeration fails', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockImplementation(async (programId: PublicKey) => {
      if (programId.equals(NATIVE_DEX_PROGRAM_ID)) {
        throw new Error('DEX program not deployed');
      }
      return []; // OT empty
    });

    const snap = await getMarketsSnapshot(conn as any, 'devnet', baseOpts);
    expect(snap.pools).toHaveLength(0);
    expect(snap.tokens).toHaveLength(1); // RWT row only
  });

  // MS-4: slot captured AFTER all reads
  it('captures slot AFTER program-account + RwtVault reads', async () => {
    const conn = makeMockConnection();
    await getMarketsSnapshot(conn as any, 'devnet', baseOpts);
    // getSlot must be the LAST recorded call (after all enumeration calls).
    const lastCall = conn.callOrder[conn.callOrder.length - 1];
    expect(lastCall).toBe('getSlot');
  });

  // MS-5: includeNav=false skips RwtVault read
  it('skips RwtVault read when includeNav=false', async () => {
    const conn = makeMockConnection();
    const snap = await getMarketsSnapshot(conn as any, 'devnet', {
      ...baseOpts,
      includeNav: false,
    });
    expect(snap.rwtVault).toBeNull();
    // RWT row's NAV should be null too.
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    expect(rwt!.nav).toBeNull();
    // getAccountInfo must NOT have been called for the vault PDA.
    expect(conn.getAccountInfo).not.toHaveBeenCalled();
  });

  // MS-6: mainnet placeholder mint → tokenRow.isPlaceholder=true
  it('flags isPlaceholder=true on mainnet when RWT is the placeholder', async () => {
    const conn = makeMockConnection();
    const snap = await getMarketsSnapshot(conn as any, 'mainnet', baseOpts);
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    expect(rwt!.isPlaceholder).toBe(true);
  });

  // MS-7: NAV-priced RWT happy path. With the vault loaded, the RWT
  // row's priceUsdc MUST come from `navBookValue / NAV_SCALE` and
  // priceSource MUST be 'nav' — even when no RWT-USDC pool exists.
  it('prices RWT from RwtVault.navBookValue when vault is loaded', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValue([]); // no OTs, no pools

    const [vaultPda] = findRwtVaultPda(RWT_ENGINE_PROGRAM_ID);
    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      if (key.equals(vaultPda)) {
        return {
          data: buildRwtVaultBytes({
            // 1_500_000 base units = $1.50 NAV per RWT.
            navBookValue: 1_500_000n,
            totalRwtSupply: 1_000_000n,
          }),
          executable: false,
          lamports: 0,
          owner: RWT_ENGINE_PROGRAM_ID,
          rentEpoch: 0,
        };
      }
      return null;
    });

    const snap = await getMarketsSnapshot(conn as any, 'devnet', baseOpts);
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    expect(rwt).toBeDefined();
    expect(rwt!.priceUsdc).toBe(1.5);
    expect(rwt!.priceSource).toBe('nav');
    expect(rwt!.nav).toBe(1_500_000n);
  });

  // MS-8: fallback to reserve-derived pricing when the RwtVault read
  // fails (e.g. vault PDA missing on a fresh deploy). Demonstrates the
  // legacy `chainPriceToUsdc` path is preserved.
  it('falls back to reserve-derived RWT price when RwtVault is missing', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockImplementation(async (programId: PublicKey) => {
      if (programId.equals(NATIVE_DEX_PROGRAM_ID)) {
        return [
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: buildPoolStateBytes({
                tokenAMint: DEVNET_RWT,
                tokenBMint: DEVNET_USDC,
                reserveA: 1_000_000n,
                reserveB: 2_000_000n, // 2 USDC per 1 RWT
              }),
              executable: false,
              lamports: 0,
              owner: NATIVE_DEX_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
        ];
      }
      return [];
    });
    // getAccountInfo defaults to returning null → vault read returns null.

    const snap = await getMarketsSnapshot(conn as any, 'devnet', baseOpts);
    expect(snap.rwtVault).toBeNull();
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    expect(rwt).toBeDefined();
    // Reserve-derived: reserveB / reserveA × 10^(decA-decB) → 2/1 = 2.
    expect(rwt!.priceUsdc).toBe(2);
    expect(rwt!.priceSource).toBe('direct-usdc');
  });

  // MS-9: the original bug — a master-pool with bizarre, imbalanced
  // reserves (USDC bid wall + tiny organic RWT ask) MUST NOT contaminate
  // the RWT price as long as NAV is present. This is the case that was
  // showing $20 RWT on app.areal.finance/markets/rwt before the fix.
  it('ignores master-pool reserve ratio for RWT price when NAV is loaded', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockImplementation(async (programId: PublicKey) => {
      if (programId.equals(NATIVE_DEX_PROGRAM_ID)) {
        return [
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              // Realistic post-Smoke-4 state: 100 USDC bid wall vs
              // 5 RWT organic ask. Naive ratio → $20/RWT. NAV is $1.00.
              data: buildPoolStateBytes({
                tokenAMint: DEVNET_RWT,
                tokenBMint: DEVNET_USDC,
                reserveA: 5_000_000n,     // 5 RWT
                reserveB: 100_000_000n,   // 100 USDC
              }),
              executable: false,
              lamports: 0,
              owner: NATIVE_DEX_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
        ];
      }
      return [];
    });

    const [vaultPda] = findRwtVaultPda(RWT_ENGINE_PROGRAM_ID);
    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      if (key.equals(vaultPda)) {
        return {
          data: buildRwtVaultBytes({
            navBookValue: 1_000_000n, // $1.00 NAV
            totalRwtSupply: 1_000_000n,
          }),
          executable: false,
          lamports: 0,
          owner: RWT_ENGINE_PROGRAM_ID,
          rentEpoch: 0,
        };
      }
      return null;
    });

    const snap = await getMarketsSnapshot(conn as any, 'devnet', baseOpts);
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    expect(rwt).toBeDefined();
    // NOT 20 (the broken-by-design reserve ratio), but 1 from NAV.
    expect(rwt!.priceUsdc).toBe(1);
    expect(rwt!.priceSource).toBe('nav');
  });

  // MS-10: regression for the OT-priced-via-RWT chain. Same imbalanced
  // master pool as MS-9, plus a balanced OT/RWT pool. Pre SDK 0.12.7
  // the OT row inherited the master-pool ratio inside chainPriceToUsdc's
  // recursive RWT lookup and surfaced at ~$20 (matching the bid wall /
  // organic ask drift). With the NAV override threaded through, the OT
  // price MUST equal `OT/RWT_spot × NAV_RWT_USDC` = 1 × $1.00 = $1.00.
  it('ignores master-pool reserve ratio for OT-via-RWT prices when NAV is loaded', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockImplementation(async (programId: PublicKey) => {
      if (programId.equals(OWNERSHIP_TOKEN_PROGRAM_ID)) {
        return [
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: buildOtConfigBytes({
                otMint: OT_MINT,
                name: 'Sparkles',
                symbol: 'SPRK',
                decimals: 6,
              }),
              executable: false,
              lamports: 0,
              owner: OWNERSHIP_TOKEN_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
        ];
      }
      if (programId.equals(NATIVE_DEX_PROGRAM_ID)) {
        return [
          // Master pool: imbalanced (5 RWT vs 100 USDC → ratio $20/RWT).
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: buildPoolStateBytes({
                tokenAMint: DEVNET_RWT,
                tokenBMint: DEVNET_USDC,
                reserveA: 5_000_000n,
                reserveB: 100_000_000n,
              }),
              executable: false,
              lamports: 0,
              owner: NATIVE_DEX_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
          // SPRK/RWT pool: balanced 1:1 → 1 SPRK = 1 RWT.
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: buildPoolStateBytes({
                tokenAMint: OT_MINT,
                tokenBMint: DEVNET_RWT,
                reserveA: 1_000_000n,
                reserveB: 1_000_000n,
              }),
              executable: false,
              lamports: 0,
              owner: NATIVE_DEX_PROGRAM_ID,
              rentEpoch: 0,
            },
          },
        ];
      }
      return [];
    });

    const [vaultPda] = findRwtVaultPda(RWT_ENGINE_PROGRAM_ID);
    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      if (key.equals(vaultPda)) {
        return {
          data: buildRwtVaultBytes({
            navBookValue: 1_000_000n, // $1.00 NAV
            totalRwtSupply: 1_000_000n,
          }),
          executable: false,
          lamports: 0,
          owner: RWT_ENGINE_PROGRAM_ID,
          rentEpoch: 0,
        };
      }
      return null;
    });

    const snap = await getMarketsSnapshot(conn as any, 'devnet', baseOpts);
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    const sprk = snap.tokens.find((t) => t.symbol === 'SPRK');
    expect(rwt!.priceUsdc).toBe(1);
    expect(sprk).toBeDefined();
    expect(sprk!.priceSource).toBe('via-rwt');
    // NOT $20 (the pre-fix bug), but $1 from the NAV override.
    expect(sprk!.priceUsdc).toBe(1);
  });
});
