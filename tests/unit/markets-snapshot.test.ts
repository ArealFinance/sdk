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

// Devnet uses the placeholder mint per RWT_MINTS table.
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

    // RWT row
    const rwt = snap.tokens.find((t) => t.symbol === 'RWT');
    expect(rwt).toBeDefined();
    expect(rwt!.priceUsdc).toBe(1);
    expect(rwt!.priceSource).toBe('direct-usdc');
    expect(rwt!.nav).toBe(5_000_000n);

    // OT row priced via RWT
    const ot = snap.tokens.find((t) => t.symbol === 'TST');
    expect(ot).toBeDefined();
    expect(ot!.priceSource).toBe('via-rwt');
    expect(ot!.priceUsdc).toBe(1);

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
});
