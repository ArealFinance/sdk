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

import { SYSVAR_CLOCK_PUBKEY, type Connection, type PublicKey } from '@solana/web3.js';

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
 * Return the distributor PDA address AND parsed state when the account
 * exists. Callers that don't need the parsed state can ignore the second
 * field. Returns null when missing/unparseable.
 */
async function resolveDistributor(
  conn: Connection,
  distributor: PublicKey,
): Promise<{
  address: PublicKey;
  parsed: ReturnType<typeof parseMerkleDistributor>;
} | null> {
  const info = await conn.getAccountInfo(distributor, 'confirmed');
  if (!info) return null;
  try {
    const parsed = parseMerkleDistributor(info.data);
    return { address: distributor, parsed };
  } catch {
    return null;
  }
}

/**
 * Mirror of `contracts/yield-distribution/src/vesting.rs::{calculate_total_vested,
 * calculate_claimable}`. Pure function — no RPC.
 *
 * On-chain `claim` only transfers the *vested* share at each invocation:
 *
 *   total_vested = locked_vested
 *                + (total_funded - locked_vested) × elapsed / vesting_period
 *   my_share     = total_vested × cumulativeAmount / max_total_claim
 *   claimable    = max(0, my_share - claimed_amount)
 *
 * Without this calculation client-side, the UI displays `cumulative -
 * claimed` (theoretical max) while a real `claim` ix transfers only the
 * tiny vested portion — looking like the protocol is "stealing" funds.
 */
/**
 * Per-second emission rate for a single holder, in base units / sec.
 *
 * The contract's vesting math (`vesting.rs`) releases new funds linearly
 * over `vesting_period_secs`. For one holder, the per-second unlock is
 * a constant during the window:
 *
 *   `(total_funded - locked_vested) × cumulative / max_total_claim / vesting_period`
 *
 * Outside the window (already fully vested OR no new funds) the rate is
 * `0n`. Pure function — no RPC.
 */
function computeVestingRatePerSec(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dist: any,
  cumulativeAmount: bigint,
  nowSecs: bigint,
): bigint {
  const maxTotalClaim = dist.maxTotalClaim as bigint;
  if (maxTotalClaim === 0n) return 0n;
  const totalFunded = dist.totalFunded as bigint;
  const lockedVested = dist.lockedVested as bigint;
  const vestingPeriod =
    (dist.vestingPeriodSecs as bigint) > 0n
      ? (dist.vestingPeriodSecs as bigint)
      : 1n;
  const lastFundTs = dist.lastFundTs as bigint;

  // Window closed → flat 0 until the next fund.
  const elapsed = nowSecs > lastFundTs ? nowSecs - lastFundTs : 0n;
  if (elapsed >= vestingPeriod) return 0n;

  const newPortion =
    totalFunded > lockedVested ? totalFunded - lockedVested : 0n;
  if (newPortion === 0n) return 0n;

  // Multiply first, divide last — avoids precision loss at low cumulative
  // shares (e.g. tens of base units / sec).
  return (newPortion * cumulativeAmount) / (maxTotalClaim * vestingPeriod);
}

function computeVestedClaimable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dist: any,
  cumulativeAmount: bigint,
  claimedAmount: bigint,
  nowSecs: bigint,
): bigint {
  const maxTotalClaim = dist.maxTotalClaim as bigint;
  if (maxTotalClaim === 0n) return 0n;
  const totalFunded = dist.totalFunded as bigint;
  const lockedVested = dist.lockedVested as bigint;
  const vestingPeriod =
    (dist.vestingPeriodSecs as bigint) > 0n
      ? (dist.vestingPeriodSecs as bigint)
      : 1n;
  const lastFundTs = dist.lastFundTs as bigint;

  const elapsed = nowSecs > lastFundTs ? nowSecs - lastFundTs : 0n;
  const capped = elapsed < vestingPeriod ? elapsed : vestingPeriod;
  const newPortion =
    totalFunded > lockedVested ? totalFunded - lockedVested : 0n;
  const newVested = (newPortion * capped) / vestingPeriod;

  let totalVested = lockedVested + newVested;
  if (totalVested > maxTotalClaim) totalVested = maxTotalClaim;

  const myShare = (totalVested * cumulativeAmount) / maxTotalClaim;
  return myShare > claimedAmount ? myShare - claimedAmount : 0n;
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

  // Read the on-chain Clock sysvar in parallel with OT enumeration. Vesting
  // math on the contract side uses `Clock::get().unix_timestamp` — which on
  // a `solana-test-validator` is computed from slot × slot_time and can lag
  // wall-clock by hours/days after restarts. If we used `Date.now()` here
  // the UI's `claimableNow` would over-promise: it'd return the fully-vested
  // amount, but the next `claim` ix would only release the (much smaller)
  // chain-time-vested portion. Mismatch → users complain "claim took
  // pennies, where did my reward go?". Read the chain clock and pass it
  // through to `computeVestedClaimable` so UI matches ix outcome.
  let chainUnixTs: bigint | null = null;

  // OT enumeration may legitimately fail (program not deployed). Degrade
  // to empty rows rather than propagating the error to the UI.
  let configs: EnumeratedOt[];
  try {
    const [clockInfo, otsRes] = await Promise.all([
      conn.getAccountInfo(SYSVAR_CLOCK_PUBKEY, 'confirmed').catch(() => null),
      enumerateOtConfigs(conn, opts.ownershipTokenProgramId),
    ]);
    configs = otsRes;
    if (clockInfo && clockInfo.data.length >= 40) {
      // Clock sysvar layout: slot u64 | epoch_start_ts i64 | epoch u64 |
      // leader_schedule_epoch u64 | unix_timestamp i64.
      chainUnixTs = clockInfo.data.readBigInt64LE(32);
    }
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
      const [balance, distributorResolved, claimedAmount] = await Promise.all([
        readAtaBalance(conn, ataAddress),
        resolveDistributor(conn, distributorPda),
        readClaimedAmount(conn, claimStatusPda),
      ]);
      const distributor = distributorResolved?.address ?? null;
      const parsedDistributor = distributorResolved?.parsed ?? null;

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

      // Vesting-aware claimable. The contract only transfers the vested
      // portion of the merkle leaf at each `claim` (see vesting.rs); a
      // naive `cumulative - claimed` would over-promise and the UI's
      // "Unclaimed Rewards" pill would barely decrement after each claim.
      // We mirror the on-chain math here so the displayed value matches
      // what the next `claim` ix will actually transfer.
      let claimableNow: bigint | null = null;
      let vestingRatePerSec: bigint | null = null;
      if (cumulativeAmount !== null && parsedDistributor) {
        // Prefer the on-chain Clock sysvar over wall-clock — the contract
        // sees the same Clock value at ix execution time, so this keeps
        // UI and on-chain `claim` outcome in sync even on test-validator
        // clusters where the chain clock lags wall-clock by hours/days.
        const nowSecs =
          chainUnixTs ?? BigInt(Math.floor(Date.now() / 1000));
        claimableNow = computeVestedClaimable(
          parsedDistributor,
          cumulativeAmount,
          claimedAmount,
          nowSecs,
        );
        vestingRatePerSec = computeVestingRatePerSec(
          parsedDistributor,
          cumulativeAmount,
          nowSecs,
        );
      } else if (cumulativeAmount !== null) {
        // No distributor state available — fall back to the legacy plain
        // (cumulative - claimed) math so the UI still surfaces something.
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
        vestingRatePerSec,
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
