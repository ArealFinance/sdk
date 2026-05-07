// Unit tests for `sdk/src/portfolio/`.
//
// All tests run against a mocked `Connection` so they exercise the composite
// orchestration logic without touching the network. We build minimal
// real-byte buffers for OtConfig / MerkleDistributor / ClaimStatus so the
// codegen parsers do their actual work — this catches discriminator drift
// at the same time as the orchestration logic.
//
// The 14 test cases in PM brief order:
//   1. Empty `rows` when no OT configs.
//   2. Single OT, no ATA → balance: 0n, claimedAmount: 0n.
//   3. Single OT, ATA exists → balance = mocked amount.
//   4. Distributor + proof, cumulative > claimed → claimableNow = diff.
//   5. Distributor + proof, cumulative == claimed → claimableNow = 0n.
//   6. Distributor + proof, claimed > cumulative → claimableNow = 0n (clamp).
//   7. Distributor exists, no proofStoreUrl → cumulative/claimable null.
//   8. Distributor exists, fetchMerkleProof returns null → same as (7).
//   9. No distributor → distributor: null, claimed: 0n, claimable: null.
//  10. enumerateOtConfigs throws → rows: [], no throw.
//  11. slot captured AFTER row reads (mock call-order assertion).
//  12. metadata.name/symbol null-byte trimmed.
//  13. metadata.decimals flows through unmodified.
//  14. ataAddress matches deterministic ATA PDA.

import { Buffer } from 'buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import { getHolderPortfolio } from '../../src/portfolio/snapshot.js';
import {
  CLAIMSTATUS_DISCRIMINATOR,
} from '../../src/programs/yield-distribution/accounts.generated.js';
import {
  MERKLEDISTRIBUTOR_DISCRIMINATOR,
} from '../../src/programs/yield-distribution/accounts.generated.js';
import {
  OTCONFIG_DISCRIMINATOR,
} from '../../src/programs/ownership-token/accounts.generated.js';
import {
  findAssociatedTokenAddressPda,
  findClaimStatusPda,
  findMerkleDistributorPda,
} from '../../src/pda/index.js';
import {
  OWNERSHIP_TOKEN_PROGRAM_ID,
  YIELD_DISTRIBUTION_PROGRAM_ID,
} from '../../src/network/program-ids.js';

// ─────────────────────── byte buffer fixtures ───────────────────────

/**
 * Build a minimal OtConfig account buffer matching the IDL layout:
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
  buf.set(nameBytes, off); off += 32; // padded with 0x00

  const symBytes = Buffer.from(args.symbol ?? 'TST', 'utf-8');
  buf.set(symBytes, off); off += 10;

  buf.writeUInt8(args.decimals ?? 6, off); off += 1;
  buf.writeBigUInt64LE(0n, off); off += 8;
  // uri left as zeros
  off += 200;
  buf.writeUInt8(255, off); // bump
  return buf;
}

/**
 * Build a minimal MerkleDistributor buffer. Only the discriminator matters
 * for our tests — all other fields are zeroed but valid for the parser.
 *
 *   [8] disc | [32] ot_mint | [32] reward_vault | [32] accumulator |
 *   [32] merkle_root | [8] max_total_claim | [8] total_claimed |
 *   [8] total_funded | [8] locked_vested | [8] last_fund_ts |
 *   [8] vesting_period_secs | [8] epoch | [1] is_active | [1] bump
 */
function buildDistributorBytes(otMint: PublicKey): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1);
  buf.set(MERKLEDISTRIBUTOR_DISCRIMINATOR, 0);
  buf.set(otMint.toBuffer(), 8);
  // remaining bytes are zero-valued (valid)
  return buf;
}

/**
 * Build a ClaimStatus buffer.
 *   [8] disc | [32] claimant | [32] distributor | [8] claimed_amount | [1] bump
 */
function buildClaimStatusBytes(args: {
  claimant: PublicKey;
  distributor: PublicKey;
  claimedAmount: bigint;
}): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 + 8 + 1);
  buf.set(CLAIMSTATUS_DISCRIMINATOR, 0);
  buf.set(args.claimant.toBuffer(), 8);
  buf.set(args.distributor.toBuffer(), 8 + 32);
  buf.writeBigUInt64LE(args.claimedAmount, 8 + 32 + 32);
  buf.writeUInt8(255, 8 + 32 + 32 + 8);
  return buf;
}

// ─────────────────────── connection mock ───────────────────────

interface AccountStore {
  getProgramAccounts: ReturnType<typeof vi.fn>;
  getAccountInfo: ReturnType<typeof vi.fn>;
  getTokenAccountBalance: ReturnType<typeof vi.fn>;
  getSlot: ReturnType<typeof vi.fn>;
  /** Tracks the order of calls between distinct mock methods. */
  callOrder: string[];
}

function makeMockConnection(): AccountStore {
  const callOrder: string[] = [];
  const track = (name: string) => callOrder.push(name);

  return {
    callOrder,
    getProgramAccounts: vi.fn(async () => {
      track('getProgramAccounts');
      return [];
    }),
    getAccountInfo: vi.fn(async () => {
      track('getAccountInfo');
      return null;
    }),
    getTokenAccountBalance: vi.fn(async () => {
      track('getTokenAccountBalance');
      throw new Error('not found');
    }),
    getSlot: vi.fn(async () => {
      track('getSlot');
      return 4242;
    }),
  };
}

const HOLDER = new PublicKey('11111111111111111111111111111111');
const OT_MINT_A = new PublicKey('So11111111111111111111111111111111111111112');
const OT_MINT_B = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

function singleOtAccountsResponse(otMint: PublicKey, opts?: {
  name?: string;
  symbol?: string;
  decimals?: number;
}) {
  return [{
    pubkey: Keypair.generate().publicKey, // OtConfig PDA — not used by snapshot
    account: {
      data: buildOtConfigBytes({
        otMint,
        name: opts?.name,
        symbol: opts?.symbol,
        decimals: opts?.decimals,
      }),
      executable: false,
      lamports: 0,
      owner: OWNERSHIP_TOKEN_PROGRAM_ID,
      rentEpoch: 0,
    },
  }];
}

const baseOpts = {
  ownershipTokenProgramId: OWNERSHIP_TOKEN_PROGRAM_ID,
  yieldDistributionProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
};

beforeEach(() => {
  // Reset the global fetch mock between tests.
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────── tests ───────────────────────────

describe('getHolderPortfolio', () => {
  // Case 1
  it('returns empty rows when no OT configs exist', async () => {
    const conn = makeMockConnection();
    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    expect(snap.rows).toHaveLength(0);
    expect(snap.holder.equals(HOLDER)).toBe(true);
    expect(snap.slot).toBe(4242);
    expect(typeof snap.fetchedAt).toBe('number');
  });

  // Case 2
  it('single OT, no ATA → balance 0n, claimedAmount 0n', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    // getAccountInfo always null → no distributor, no claim status
    // getTokenAccountBalance throws → balance 0n
    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    expect(snap.rows).toHaveLength(1);
    expect(snap.rows[0]!.balance).toBe(0n);
    expect(snap.rows[0]!.claimedAmount).toBe(0n);
  });

  // Case 3
  it('single OT, ATA exists → balance = mocked amount', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    conn.getTokenAccountBalance.mockImplementationOnce(async () => {
      conn.callOrder.push('getTokenAccountBalance');
      return { value: { amount: '1234567', decimals: 6, uiAmount: 1.234567, uiAmountString: '1.234567' } };
    });
    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    expect(snap.rows[0]!.balance).toBe(1234567n);
  });

  // Case 4 — distributor + proof, cumulative > claimed
  it('distributor + proof, cumulative > claimed → claimableNow = diff', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    const [distributorPda] = findMerkleDistributorPda(OT_MINT_A, YIELD_DISTRIBUTION_PROGRAM_ID);
    const [claimStatusPda] = findClaimStatusPda(distributorPda, HOLDER, YIELD_DISTRIBUTION_PROGRAM_ID);

    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      conn.callOrder.push('getAccountInfo');
      if (key.equals(distributorPda)) {
        return { data: buildDistributorBytes(OT_MINT_A), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      if (key.equals(claimStatusPda)) {
        return { data: buildClaimStatusBytes({ claimant: HOLDER, distributor: distributorPda, claimedAmount: 100n }), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      return null;
    });

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        distributor: distributorPda.toBase58(),
        epoch: 1,
        holder: HOLDER.toBase58(),
        cumulativeAmount: '500',
        proof: [],
        merkleRoot: '00',
        publishedAt: Date.now(),
      }),
    })));

    const snap = await getHolderPortfolio(conn as any, HOLDER, {
      ...baseOpts,
      proofStoreUrl: 'https://proofs.example.test',
    });
    expect(snap.rows[0]!.distributor?.equals(distributorPda)).toBe(true);
    expect(snap.rows[0]!.claimedAmount).toBe(100n);
    expect(snap.rows[0]!.cumulativeAmount).toBe(500n);
    expect(snap.rows[0]!.claimableNow).toBe(400n);
  });

  // Case 5 — cumulative == claimed
  it('distributor + proof, cumulative == claimed → claimableNow = 0n', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    const [distributorPda] = findMerkleDistributorPda(OT_MINT_A, YIELD_DISTRIBUTION_PROGRAM_ID);
    const [claimStatusPda] = findClaimStatusPda(distributorPda, HOLDER, YIELD_DISTRIBUTION_PROGRAM_ID);

    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      conn.callOrder.push('getAccountInfo');
      if (key.equals(distributorPda)) {
        return { data: buildDistributorBytes(OT_MINT_A), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      if (key.equals(claimStatusPda)) {
        return { data: buildClaimStatusBytes({ claimant: HOLDER, distributor: distributorPda, claimedAmount: 500n }), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      return null;
    });

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        distributor: distributorPda.toBase58(),
        epoch: 1,
        holder: HOLDER.toBase58(),
        cumulativeAmount: '500',
        proof: [],
        merkleRoot: '00',
        publishedAt: Date.now(),
      }),
    })));

    const snap = await getHolderPortfolio(conn as any, HOLDER, {
      ...baseOpts,
      proofStoreUrl: 'https://proofs.example.test',
    });
    expect(snap.rows[0]!.claimableNow).toBe(0n);
  });

  // Case 6 — claimed > cumulative (clamp)
  it('distributor + proof, claimed > cumulative → claimableNow = 0n (clamp)', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    const [distributorPda] = findMerkleDistributorPda(OT_MINT_A, YIELD_DISTRIBUTION_PROGRAM_ID);
    const [claimStatusPda] = findClaimStatusPda(distributorPda, HOLDER, YIELD_DISTRIBUTION_PROGRAM_ID);

    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      conn.callOrder.push('getAccountInfo');
      if (key.equals(distributorPda)) {
        return { data: buildDistributorBytes(OT_MINT_A), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      if (key.equals(claimStatusPda)) {
        return { data: buildClaimStatusBytes({ claimant: HOLDER, distributor: distributorPda, claimedAmount: 1000n }), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      return null;
    });

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        distributor: distributorPda.toBase58(),
        epoch: 1,
        holder: HOLDER.toBase58(),
        cumulativeAmount: '500',
        proof: [],
        merkleRoot: '00',
        publishedAt: Date.now(),
      }),
    })));

    const snap = await getHolderPortfolio(conn as any, HOLDER, {
      ...baseOpts,
      proofStoreUrl: 'https://proofs.example.test',
    });
    expect(snap.rows[0]!.claimableNow).toBe(0n);
  });

  // Case 7 — distributor exists but no proofStoreUrl
  it('distributor exists, no proofStoreUrl → cumulative null, claimable null', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    const [distributorPda] = findMerkleDistributorPda(OT_MINT_A, YIELD_DISTRIBUTION_PROGRAM_ID);
    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      conn.callOrder.push('getAccountInfo');
      if (key.equals(distributorPda)) {
        return { data: buildDistributorBytes(OT_MINT_A), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      return null;
    });

    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    expect(snap.rows[0]!.distributor?.equals(distributorPda)).toBe(true);
    expect(snap.rows[0]!.cumulativeAmount).toBeNull();
    expect(snap.rows[0]!.claimableNow).toBeNull();
  });

  // Case 8 — proof fetch returns null
  it('distributor exists, fetchMerkleProof returns null → cumulative/claimable null', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    const [distributorPda] = findMerkleDistributorPda(OT_MINT_A, YIELD_DISTRIBUTION_PROGRAM_ID);
    conn.getAccountInfo.mockImplementation(async (key: PublicKey) => {
      conn.callOrder.push('getAccountInfo');
      if (key.equals(distributorPda)) {
        return { data: buildDistributorBytes(OT_MINT_A), executable: false, lamports: 0, owner: YIELD_DISTRIBUTION_PROGRAM_ID, rentEpoch: 0 };
      }
      return null;
    });

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    const snap = await getHolderPortfolio(conn as any, HOLDER, {
      ...baseOpts,
      proofStoreUrl: 'https://proofs.example.test',
    });
    expect(snap.rows[0]!.cumulativeAmount).toBeNull();
    expect(snap.rows[0]!.claimableNow).toBeNull();
  });

  // Case 9 — no distributor account
  it('no distributor → distributor null, claimedAmount 0n, claimableNow null', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    // getAccountInfo always returns null → no distributor, no claim status
    const snap = await getHolderPortfolio(conn as any, HOLDER, {
      ...baseOpts,
      proofStoreUrl: 'https://proofs.example.test', // even with URL, no distributor → no fetch
    });
    expect(snap.rows[0]!.distributor).toBeNull();
    expect(snap.rows[0]!.claimedAmount).toBe(0n);
    expect(snap.rows[0]!.claimableNow).toBeNull();
  });

  // Case 10 — enumerateOtConfigs throws
  it('enumerateOtConfigs throws → rows: [], no throw', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockRejectedValueOnce(new Error('RPC down'));
    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    expect(snap.rows).toEqual([]);
    expect(snap.slot).toBe(4242);
  });

  // Case 11 — slot captured AFTER all reads
  it('slot is captured AFTER all account reads', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A),
    );
    conn.getTokenAccountBalance.mockImplementationOnce(async () => {
      conn.callOrder.push('getTokenAccountBalance');
      return { value: { amount: '0', decimals: 6, uiAmount: 0, uiAmountString: '0' } };
    });
    await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    // The very last entry in callOrder must be the slot read.
    expect(conn.callOrder[conn.callOrder.length - 1]).toBe('getSlot');
    // And it must come after at least one of the row-level reads.
    const slotIdx = conn.callOrder.lastIndexOf('getSlot');
    const rowReadIdxs = conn.callOrder
      .map((c, i) => (['getAccountInfo', 'getTokenAccountBalance'].includes(c) ? i : -1))
      .filter(i => i >= 0);
    expect(rowReadIdxs.length).toBeGreaterThan(0);
    expect(slotIdx).toBeGreaterThan(Math.max(...rowReadIdxs));
  });

  // Case 12 — name/symbol null-byte trimmed
  it('metadata.name and metadata.symbol are null-byte trimmed', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A, { name: 'Padded', symbol: 'PAD' }),
    );
    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    expect(snap.rows[0]!.metadata.name).toBe('Padded');
    expect(snap.rows[0]!.metadata.symbol).toBe('PAD');
  });

  // Case 13 — decimals flow through
  it('metadata.decimals flows through unmodified', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_A, { decimals: 9 }),
    );
    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    expect(snap.rows[0]!.metadata.decimals).toBe(9);
  });

  // Case 14 — ataAddress matches deterministic ATA PDA
  it('ataAddress matches findAssociatedTokenAddressPda(holder, otMint)', async () => {
    const conn = makeMockConnection();
    conn.getProgramAccounts.mockResolvedValueOnce(
      singleOtAccountsResponse(OT_MINT_B),
    );
    const snap = await getHolderPortfolio(conn as any, HOLDER, baseOpts);
    const [expectedAta] = findAssociatedTokenAddressPda(HOLDER, OT_MINT_B);
    expect(snap.rows[0]!.ataAddress.equals(expectedAta)).toBe(true);
  });
});
