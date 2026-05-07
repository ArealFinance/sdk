// Composite read: enumerate every OT, then for each OT fetch the holder's
// balance, the MerkleDistributor existence, the on-chain ClaimStatus, and
// (optionally) the latest published Merkle proof from the proof-store.
//
// Correctness contract:
//   - `claimableNow` is `cumulative - claimed`, clamped to >= 0n. It is null
//     when `cumulativeAmount` is unknown — never silently zero.
//   - `slot` is captured AFTER all account reads finish so that a later WS
//     event can be compared against it as an upper bound for staleness.
//   - Failures of the on-chain enumeration degrade to an empty `rows` list
//     rather than throwing — useful when the OT program is not deployed on
//     a given network (e.g. a fresh localnet).
//   - Per-OT account fetches are parallelised with `Promise.all`. The proof
//     fetch happens only after distributor existence is known, since asking
//     the proof-store about a non-existent distributor wastes an HTTP round
//     trip.

import type { Connection, PublicKey } from '@solana/web3.js';

import {
  parseMerkleDistributor,
} from '../programs/yield-distribution/accounts.generated.js';
import { parseClaimStatus } from '../programs/yield-distribution/accounts.generated.js';
import {
  findClaimStatusPda,
  findMerkleDistributorPda,
} from '../pda/yield-distribution.js';
import { findAssociatedTokenAddressPda } from '../pda/shared.js';
import { enumerateOtConfigs, type EnumeratedOt } from './enumerate-ot.js';
import { fetchMerkleProof } from './proof-fetcher.js';
import type { PortfolioRow, PortfolioSnapshot } from './types.js';

export interface GetHolderPortfolioOptions {
  /** Ownership Token program (used for `getProgramAccounts` enumeration). */
  ownershipTokenProgramId: PublicKey;
  /** Yield Distribution program (used for distributor + claim PDAs). */
  yieldDistributionProgramId: PublicKey;
  /**
   * Optional merkle-publisher proof-store base URL. When falsy, the
   * `cumulativeAmount` and `claimableNow` fields will be `null`.
   */
  proofStoreUrl?: string | null;
}

/**
 * Trim trailing 0x00 bytes and decode UTF-8. Codegen emits fixed-width byte
 * arrays for OtConfig.name (32 bytes) and OtConfig.symbol_ (10 bytes), so
 * the literal string is right-padded with NULs that we don't want to
 * surface to the UI.
 */
function trimNullBytes(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return new TextDecoder('utf-8').decode(bytes.subarray(0, end));
}

/**
 * Fetch a single ATA balance and return it as `bigint`. Returns `0n` when
 * the ATA does not exist or the RPC call fails — both states are
 * indistinguishable from "no balance" for the UI.
 */
async function readAtaBalance(
  conn: Connection,
  ata: PublicKey,
): Promise<bigint> {
  try {
    const res = await conn.getTokenAccountBalance(ata, 'confirmed');
    return BigInt(res.value.amount);
  } catch {
    return 0n;
  }
}

/**
 * Return the distributor PDA address only if an account actually exists at
 * it AND the bytes parse as a MerkleDistributor. The parsed value is
 * discarded — we only need existence.
 */
async function resolveDistributor(
  conn: Connection,
  distributor: PublicKey,
): Promise<PublicKey | null> {
  const info = await conn.getAccountInfo(distributor, 'confirmed');
  if (!info) return null;
  try {
    parseMerkleDistributor(info.data);
    return distributor;
  } catch {
    return null;
  }
}

/**
 * Read on-chain ClaimStatus for `(distributor, holder)`. Returns 0n when
 * the PDA does not exist (claimant has never claimed) or when parsing
 * fails.
 */
async function readClaimedAmount(
  conn: Connection,
  claimStatus: PublicKey,
): Promise<bigint> {
  const info = await conn.getAccountInfo(claimStatus, 'confirmed');
  if (!info) return 0n;
  try {
    return parseClaimStatus(info.data).claimedAmount;
  } catch {
    return 0n;
  }
}

/**
 * Composite read: per-OT balance + claim entitlement for a holder.
 *
 * See {@link GetHolderPortfolioOptions} for the program-id and proof-store
 * configuration. The returned snapshot is consistent with itself: `slot`
 * is taken after all reads, so any WS event with `slot >= snapshot.slot`
 * is guaranteed to be newer than at least one of the snapshot's reads.
 */
export async function getHolderPortfolio(
  conn: Connection,
  holder: PublicKey,
  opts: GetHolderPortfolioOptions,
): Promise<PortfolioSnapshot> {
  const fetchedAt = Date.now();

  // OT enumeration may legitimately fail (program not deployed). Degrade
  // to empty rows rather than propagating the error to the UI.
  let configs: EnumeratedOt[];
  try {
    configs = await enumerateOtConfigs(conn, opts.ownershipTokenProgramId);
  } catch {
    configs = [];
  }

  const rows: PortfolioRow[] = await Promise.all(
    configs.map(async ({ config }) => {
      const otMint = config.otMint;
      const [ataAddress] = findAssociatedTokenAddressPda(holder, otMint);
      const [distributorPda] = findMerkleDistributorPda(
        otMint,
        opts.yieldDistributionProgramId,
      );
      const [claimStatusPda] = findClaimStatusPda(
        distributorPda,
        holder,
        opts.yieldDistributionProgramId,
      );

      // Parallelise the three independent on-chain reads.
      const [balance, distributor, claimedAmount] = await Promise.all([
        readAtaBalance(conn, ataAddress),
        resolveDistributor(conn, distributorPda),
        readClaimedAmount(conn, claimStatusPda),
      ]);

      // Proof fetch only when (a) configured AND (b) distributor exists.
      let cumulativeAmount: bigint | null = null;
      if (distributor && opts.proofStoreUrl) {
        const proof = await fetchMerkleProof(
          opts.proofStoreUrl,
          distributor,
          holder,
        );
        if (proof !== null) {
          // Wire spec says `cumulativeAmount` is a decimal string. Strict
          // `/^\d+$/` rejects empty string, hex (`0x...`), leading
          // whitespace, sign chars, decimals, and scientific notation —
          // any of which `BigInt()` would silently coerce (e.g. `BigInt("")
          // === 0n`). On any non-decimal input we fall back to `null`
          // (claimable unknown) rather than report a wrong number. The
          // regex guarantees `BigInt(raw)` cannot throw, so no try/catch
          // is needed here.
          const raw = proof.cumulativeAmount;
          if (typeof raw === 'string' && /^\d+$/.test(raw)) {
            cumulativeAmount = BigInt(raw);
          }
        }
      }

      // Clamp to >= 0n: in the tiny race where `claimed > cumulative`
      // (claim landed before the new root was published) we report 0
      // claimable rather than a confusing negative value.
      let claimableNow: bigint | null = null;
      if (cumulativeAmount !== null) {
        claimableNow =
          cumulativeAmount > claimedAmount
            ? cumulativeAmount - claimedAmount
            : 0n;
      }

      return {
        otMint,
        metadata: {
          name: trimNullBytes(config.name),
          symbol: trimNullBytes(config.symbol_),
          decimals: config.decimals,
        },
        balance,
        distributor,
        cumulativeAmount,
        claimedAmount,
        claimableNow,
        ataAddress,
      };
    }),
  );

  // Capture slot AFTER all reads — see comment at the top of this file.
  const slot = await conn.getSlot('confirmed');

  return {
    holder,
    rows,
    fetchedAt,
    slot,
  };
}
