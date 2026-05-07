// Unit tests for `sdk/src/tx/yield-distribution/claim-distribution.ts`.
//
// Twelve cases (per architect plan):
//   1. Account list byte-for-byte parity (10 keys, exact order, signer/writable flags).
//   2. Discriminator equals CLAIM_DISCRIMINATOR (codegen).
//   3. Args encoding golden test (cumulativeAmount + 2 proof nodes).
//   4. proof.length=21 throws "MAX_PROOF_LEN".
//   5. Proof node with length !== 32 throws "expected 32".
//   6. buildClaimTx rejects non-hex proof string.
//   7. buildClaimTx rejects wrong-length hex (e.g. 63 chars).
//   8. payer defaulting: when omitted, payer === claimant; both at correct positions.
//   9. ensureAta=true + ATA exists → 1 ix (just claim).
//  10. ensureAta=true + ATA missing → 2 ix (createATA prepended at index 0).
//  11. ensureAta=false (or undefined) → never reads ATA, single ix.
//  12. Worst case proof.length=20 → tx serializes < 1232 bytes (legacy tx limit).

import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  buildClaimDistributionIx,
  buildClaimTx,
  MAX_PROOF_LEN,
} from '../../src/tx/yield-distribution/claim-distribution.js';
import { CLAIM_DISCRIMINATOR } from '../../src/programs/yield-distribution/instructions.generated.js';
import {
  SPL_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  RWT_MINTS,
} from '../../src/network/constants.js';
import {
  findAssociatedTokenAddressPda,
  findClaimStatusPda,
  findMerkleDistributorPda,
  findYdConfigPda,
} from '../../src/pda/index.js';
import { YIELD_DISTRIBUTION_PROGRAM_ID } from '../../src/network/program-ids.js';

const k = () => Keypair.generate().publicKey;

function baseIxArgs() {
  return {
    ydProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
    claimant: k(),
    payer: k(),
    config: k(),
    otMint: k(),
    distributor: k(),
    claimStatus: k(),
    rewardVault: k(),
    claimantToken: k(),
    cumulativeAmount: 1_000_000n,
    proof: [new Uint8Array(32).fill(0xaa), new Uint8Array(32).fill(0xbb)],
  };
}

// ─────────────────── buildClaimDistributionIx ───────────────────

describe('buildClaimDistributionIx', () => {
  // Case 1
  it('account list: 10 keys in exact order with correct signer/writable flags', () => {
    const args = baseIxArgs();
    const ix = buildClaimDistributionIx(args);

    expect(ix.programId.equals(YIELD_DISTRIBUTION_PROGRAM_ID)).toBe(true);
    expect(ix.keys.length).toBe(10);

    expect(ix.keys[0]!.pubkey.equals(args.claimant)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(false);

    expect(ix.keys[1]!.pubkey.equals(args.payer)).toBe(true);
    expect(ix.keys[1]!.isSigner).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(true);

    expect(ix.keys[2]!.pubkey.equals(args.config)).toBe(true);
    expect(ix.keys[2]!.isSigner).toBe(false);
    expect(ix.keys[2]!.isWritable).toBe(false);

    expect(ix.keys[3]!.pubkey.equals(args.otMint)).toBe(true);
    expect(ix.keys[3]!.isSigner).toBe(false);
    expect(ix.keys[3]!.isWritable).toBe(false);

    expect(ix.keys[4]!.pubkey.equals(args.distributor)).toBe(true);
    expect(ix.keys[4]!.isSigner).toBe(false);
    expect(ix.keys[4]!.isWritable).toBe(true);

    expect(ix.keys[5]!.pubkey.equals(args.claimStatus)).toBe(true);
    expect(ix.keys[5]!.isSigner).toBe(false);
    expect(ix.keys[5]!.isWritable).toBe(true);

    expect(ix.keys[6]!.pubkey.equals(args.rewardVault)).toBe(true);
    expect(ix.keys[6]!.isSigner).toBe(false);
    expect(ix.keys[6]!.isWritable).toBe(true);

    expect(ix.keys[7]!.pubkey.equals(args.claimantToken)).toBe(true);
    expect(ix.keys[7]!.isSigner).toBe(false);
    expect(ix.keys[7]!.isWritable).toBe(true);

    expect(ix.keys[8]!.pubkey.equals(SPL_TOKEN_PROGRAM_ID)).toBe(true);
    expect(ix.keys[8]!.isSigner).toBe(false);
    expect(ix.keys[8]!.isWritable).toBe(false);

    expect(ix.keys[9]!.pubkey.equals(SYSTEM_PROGRAM_ID)).toBe(true);
    expect(ix.keys[9]!.isSigner).toBe(false);
    expect(ix.keys[9]!.isWritable).toBe(false);
  });

  // Case 2
  it('discriminator matches codegen CLAIM_DISCRIMINATOR', () => {
    const ix = buildClaimDistributionIx(baseIxArgs());
    const head = Buffer.from(ix.data).subarray(0, 8);
    expect(head.equals(Buffer.from(CLAIM_DISCRIMINATOR))).toBe(true);
  });

  // Case 3
  it('args encoding golden: u64 LE cumulativeAmount + u32 LE proof_len + 32*N nodes', () => {
    const proof = [new Uint8Array(32).fill(0x11), new Uint8Array(32).fill(0x22)];
    const ix = buildClaimDistributionIx({
      ...baseIxArgs(),
      cumulativeAmount: 1_234_567_890n,
      proof,
    });
    const data = Buffer.from(ix.data);

    // [8] disc | [8] u64 | [4] u32 | [32 * 2] nodes  =  84 bytes total
    expect(data.length).toBe(8 + 8 + 4 + 32 * 2);

    // Discriminator
    expect(data.subarray(0, 8).equals(Buffer.from(CLAIM_DISCRIMINATOR))).toBe(true);

    // cumulative_amount (u64 LE)
    expect(data.readBigUInt64LE(8)).toBe(1_234_567_890n);

    // proof.len (u32 LE)
    expect(data.readUInt32LE(16)).toBe(2);

    // node 0 = 32 * 0x11
    const node0 = data.subarray(20, 52);
    expect(node0.every((b) => b === 0x11)).toBe(true);

    // node 1 = 32 * 0x22
    const node1 = data.subarray(52, 84);
    expect(node1.every((b) => b === 0x22)).toBe(true);
  });

  // Case 4
  it('throws "MAX_PROOF_LEN" when proof.length=21', () => {
    const proof = Array.from({ length: 21 }, () => new Uint8Array(32));
    expect(() =>
      buildClaimDistributionIx({ ...baseIxArgs(), proof }),
    ).toThrow(/MAX_PROOF_LEN/);
  });

  // Case 5
  it('throws "expected 32" when a proof node is not 32 bytes', () => {
    const proof = [new Uint8Array(31)];
    expect(() =>
      buildClaimDistributionIx({ ...baseIxArgs(), proof }),
    ).toThrow(/expected 32/);
  });
});

// ──────────────────────── buildClaimTx ────────────────────────

const HOLDER = Keypair.generate().publicKey;
const OT_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const RWT_MINT = RWT_MINTS.localnet;

function hex(byte: number): string {
  return Buffer.alloc(32, byte).toString('hex');
}

function makeMockConn(opts: { ataExists: boolean }) {
  const calls: PublicKey[] = [];
  const conn = {
    getAccountInfo: vi.fn(async (key: PublicKey) => {
      calls.push(key);
      return opts.ataExists ? { data: Buffer.alloc(0), executable: false, lamports: 1, owner: SPL_TOKEN_PROGRAM_ID, rentEpoch: 0 } : null;
    }),
  };
  return { conn, calls };
}

function baseTxArgs(connection: any, overrides: Record<string, any> = {}) {
  return {
    connection,
    ydProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
    otMint: OT_MINT,
    rwtMint: RWT_MINT,
    claimant: HOLDER,
    rewardVault: k(),
    cumulativeAmount: 500n,
    proofHex: [hex(0xab), hex(0xcd)],
    ...overrides,
  };
}

describe('buildClaimTx', () => {
  // Case 6
  it('rejects non-hex proof string', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    await expect(
      buildClaimTx(
        baseTxArgs(conn, { proofHex: ['z'.repeat(64)] }),
      ),
    ).rejects.toThrow(/not a hex/);
  });

  // Case 7
  it('rejects wrong-length hex (63 chars)', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    await expect(
      buildClaimTx(baseTxArgs(conn, { proofHex: ['a'.repeat(63)] })),
    ).rejects.toThrow(/length 63, expected 64/);
  });

  // Case 8
  it('payer defaults to claimant; both keys land in correct positions', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    const tx = await buildClaimTx(baseTxArgs(conn)); // no payer override
    expect(tx.instructions.length).toBe(1);
    const ix = tx.instructions[0]!;
    expect(ix.keys[0]!.pubkey.equals(HOLDER)).toBe(true); // claimant
    expect(ix.keys[1]!.pubkey.equals(HOLDER)).toBe(true); // payer (defaulted)
    // payer position must be writable signer
    expect(ix.keys[1]!.isSigner).toBe(true);
    expect(ix.keys[1]!.isWritable).toBe(true);
  });

  // Case 9
  it('ensureAta=true + ATA exists → 1 ix (just claim), getAccountInfo called once', async () => {
    const { conn, calls } = makeMockConn({ ataExists: true });
    const tx = await buildClaimTx(
      baseTxArgs(conn, { ensureAta: true }),
    );
    expect(tx.instructions.length).toBe(1);
    expect(conn.getAccountInfo).toHaveBeenCalledTimes(1);

    // The single ix targets YD program (not the ATA program).
    expect(tx.instructions[0]!.programId.equals(YIELD_DISTRIBUTION_PROGRAM_ID)).toBe(true);

    // Sanity: it queried the deterministic ATA address.
    const [ataPda] = findAssociatedTokenAddressPda(HOLDER, RWT_MINT);
    expect(calls[0]!.equals(ataPda)).toBe(true);
  });

  // Case 10
  it('ensureAta=true + ATA missing → 2 ix (createATA prepended), claim is index 1', async () => {
    const { conn } = makeMockConn({ ataExists: false });
    const tx = await buildClaimTx(
      baseTxArgs(conn, { ensureAta: true }),
    );
    expect(tx.instructions.length).toBe(2);

    // First ix is the SPL Associated Token Account program create-idempotent.
    const ataIx = tx.instructions[0]!;
    expect(ataIx.programId.toBase58()).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );

    // Second ix is the claim itself.
    const claimIx = tx.instructions[1]!;
    expect(claimIx.programId.equals(YIELD_DISTRIBUTION_PROGRAM_ID)).toBe(true);
    expect(claimIx.keys.length).toBe(10);
  });

  // Case 11
  it('ensureAta omitted → never reads ATA, single ix', async () => {
    const { conn } = makeMockConn({ ataExists: false });
    const tx = await buildClaimTx(baseTxArgs(conn));
    expect(tx.instructions.length).toBe(1);
    expect(conn.getAccountInfo).not.toHaveBeenCalled();
  });

  // Case 11b — same but explicitly false (defensive)
  it('ensureAta=false → never reads ATA, single ix', async () => {
    const { conn } = makeMockConn({ ataExists: false });
    const tx = await buildClaimTx(baseTxArgs(conn, { ensureAta: false }));
    expect(tx.instructions.length).toBe(1);
    expect(conn.getAccountInfo).not.toHaveBeenCalled();
  });

  // Case 12 — worst-case proof size still fits in legacy tx limit
  it('worst case proof.length=20 → tx serializes < 1232 bytes (legacy limit)', async () => {
    const { conn } = makeMockConn({ ataExists: true });

    const proofHex = Array.from({ length: MAX_PROOF_LEN }, (_, i) =>
      hex(i & 0xff),
    );

    const tx = await buildClaimTx(
      baseTxArgs(conn, { proofHex, ensureAta: true }),
    );

    // compileMessage needs both feePayer and recentBlockhash; values do not
    // matter for size-counting, only that they are set.
    tx.feePayer = HOLDER;
    tx.recentBlockhash = '11111111111111111111111111111111';

    const msgBytes = tx.compileMessage().serialize();
    // Add room for one signature (64 bytes) + 1 byte sig count = 65 bytes.
    const txSize = msgBytes.length + 1 + 64;
    expect(txSize).toBeLessThan(1232);
  });

  // Sanity: the ATA derivation uses the canonical SPL formula.
  it('claimantToken in the claim ix matches deterministic ATA(holder, rwtMint)', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    const tx = await buildClaimTx(baseTxArgs(conn));
    const claimIx = tx.instructions[0]!;

    const [expectedAta] = findAssociatedTokenAddressPda(HOLDER, RWT_MINT);
    expect(claimIx.keys[7]!.pubkey.equals(expectedAta)).toBe(true);
  });

  // ─────────────── mainnet placeholder guard (security LOW) ───────────────

  it('cluster=mainnet + placeholder rwtMint → throws "placeholder; mainnet RWT mint not yet deployed"', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    await expect(
      buildClaimTx(
        baseTxArgs(conn, {
          cluster: 'mainnet',
          rwtMint: RWT_MINTS.mainnet, // same placeholder bytes today
        }),
      ),
    ).rejects.toThrow(/placeholder; mainnet RWT mint not yet deployed/);
  });

  it('cluster=mainnet + non-placeholder rwtMint → does NOT throw (builds tx normally)', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    const realMint = Keypair.generate().publicKey; // any non-placeholder bytes
    const tx = await buildClaimTx(
      baseTxArgs(conn, { cluster: 'mainnet', rwtMint: realMint }),
    );
    expect(tx.instructions.length).toBe(1);
    expect(tx.instructions[0]!.programId.equals(YIELD_DISTRIBUTION_PROGRAM_ID)).toBe(true);
  });

  it('cluster=devnet + placeholder rwtMint → does NOT throw (placeholder is expected on devnet)', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    const tx = await buildClaimTx(
      baseTxArgs(conn, { cluster: 'devnet', rwtMint: RWT_MINTS.devnet }),
    );
    expect(tx.instructions.length).toBe(1);
  });

  it('cluster omitted + placeholder rwtMint → does NOT throw (backwards-compatible)', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    // baseTxArgs already uses RWT_MINTS.localnet (placeholder bytes) and no cluster.
    const tx = await buildClaimTx(baseTxArgs(conn));
    expect(tx.instructions.length).toBe(1);
  });

  // Sanity: derived PDAs land in the right slots.
  it('derives YD config / distributor / claim_status into the correct slots', async () => {
    const { conn } = makeMockConn({ ataExists: true });
    const tx = await buildClaimTx(baseTxArgs(conn));
    const ix = tx.instructions[0]!;

    const [config] = findYdConfigPda(YIELD_DISTRIBUTION_PROGRAM_ID);
    const [distributor] = findMerkleDistributorPda(
      OT_MINT,
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );
    const [claimStatus] = findClaimStatusPda(
      distributor,
      HOLDER,
      YIELD_DISTRIBUTION_PROGRAM_ID,
    );

    expect(ix.keys[2]!.pubkey.equals(config)).toBe(true);
    expect(ix.keys[3]!.pubkey.equals(OT_MINT)).toBe(true);
    expect(ix.keys[4]!.pubkey.equals(distributor)).toBe(true);
    expect(ix.keys[5]!.pubkey.equals(claimStatus)).toBe(true);
  });
});
