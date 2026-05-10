// Composite read: enumerate every LpPosition owned by `holder`, join each
// with its parent PoolState, decorate with OT-config-derived token metadata,
// and value in USDC via `chainPriceToUsdc`.
//
// Correctness contract:
//   - All three top-level reads (`enumerateHolderLpPositions`,
//     `enumeratePools`, `enumerateOtConfigs`) run in parallel via
//     `Promise.allSettled`. A failure in any one degrades that part of the
//     snapshot to an empty list rather than throwing — useful when a
//     program is not yet deployed on a given network (e.g. fresh localnet).
//   - `slot` is captured AFTER all reads finish so a later WS event with
//     `slot >= snapshot.slot` is guaranteed newer than at least one read.
//   - Defense-in-depth Nexus filter: positions whose `owner` equals the
//     LiquidityNexus PDA are dropped. The server-side memcmp on owner=holder
//     already excludes them in the typical caller flow, but a caller that
//     mistakenly passes the Nexus PDA as `holder` would otherwise leak
//     protocol-owned positions into a UI portfolio.
//   - Orphan positions (LpPosition.pool not in the enumerated pool list)
//     are silently dropped — there's nothing renderable without the pool's
//     reserves and mints.
//   - USDC pricing uses pure helpers — no extra RPC roundtrips beyond
//     the three top-level reads.

import type { Connection, PublicKey } from '@solana/web3.js';

import type { ClusterName } from '../network/clusters.js';
import { RWT_MINTS, USDC_MINTS } from '../network/constants.js';
import { enumeratePools } from '../markets/enumerate-pools.js';
import { chainPriceToUsdc } from '../markets/pricing.js';
import {
  enumerateOtConfigs,
  type EnumeratedOt,
} from '../portfolio/enumerate-ot.js';
import type { EnumeratedPool } from '../markets/types.js';
import type { PoolState } from '../programs/native-dex/accounts.generated.js';
import {
  enumerateHolderLpPositions,
  type EnumeratedLpPosition,
} from './enumerate-positions.js';
import type { HolderLpRow, HolderLpSnapshot } from './types.js';
import { valueLpPosition } from './value.js';

/** USDC and RWT both use 6 decimals — verified via `network/constants.ts`. */
const USDC_DECIMALS = 6;
const RWT_DECIMALS = 6;
const USDC_SYMBOL = 'USDC';
const RWT_SYMBOL = 'RWT';

export interface GetHolderLpPortfolioOptions {
  /** Native DEX program — used for LP position enumeration + pool list. */
  nativeDexProgramId: PublicKey;
  /** Ownership Token program — used for OtConfig metadata enumeration. */
  ownershipTokenProgramId: PublicKey;
  /** Cluster — selects USDC + RWT mints for pricing. */
  cluster: ClusterName;
  /**
   * LiquidityNexus PDA address (caller resolves via
   * `findLiquidityNexusPda(nativeDexProgramId)`). Positions whose `owner`
   * field equals this address are filtered out as defense-in-depth even
   * though the server-side memcmp on owner=holder normally excludes them.
   */
  liquidityNexus: PublicKey;
}

/**
 * Trim trailing 0x00 bytes and decode UTF-8. Mirrors the helper in
 * `markets/snapshot.ts` — codegen emits fixed-width byte arrays for
 * OtConfig.name (32 bytes) and OtConfig.symbol_ (10 bytes).
 */
function trimNullBytes(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return new TextDecoder('utf-8').decode(bytes.subarray(0, end));
}

/**
 * Composite read: per-holder LP positions joined with pool state and
 * priced in USDC.
 *
 * See {@link GetHolderLpPortfolioOptions} for the program-id and cluster
 * configuration. The returned snapshot is consistent with itself: `slot`
 * is taken after all reads, so any WS event with `slot >= snapshot.slot`
 * is guaranteed to be newer than at least one of the snapshot's reads.
 */
export async function getHolderLpPortfolio(
  conn: Connection,
  holder: PublicKey,
  opts: GetHolderLpPortfolioOptions,
): Promise<HolderLpSnapshot> {
  const fetchedAt = Date.now();
  const usdcMint = USDC_MINTS[opts.cluster];
  const rwtMint = RWT_MINTS[opts.cluster];

  // Top-level parallel reads. allSettled so any single failure degrades
  // gracefully — a missing OT program shouldn't blank out the position list.
  const [positionsRes, poolsRes, otsRes] = await Promise.allSettled([
    enumerateHolderLpPositions(conn, holder, opts.nativeDexProgramId),
    enumeratePools(conn, opts.nativeDexProgramId),
    enumerateOtConfigs(conn, opts.ownershipTokenProgramId),
  ]);

  const positions: EnumeratedLpPosition[] =
    positionsRes.status === 'fulfilled' ? positionsRes.value : [];
  const enumeratedPools: EnumeratedPool[] =
    poolsRes.status === 'fulfilled' ? poolsRes.value : [];
  const ots: EnumeratedOt[] =
    otsRes.status === 'fulfilled' ? otsRes.value : [];

  // Build pool map for the join. Key = pool PDA base58.
  const poolByAddr = new Map<
    string,
    { poolAddress: PublicKey; pool: PoolState }
  >();
  for (const p of enumeratedPools) {
    poolByAddr.set(p.poolAddress.toBase58(), p);
  }

  // Build mint → (symbol, decimals) lookup. USDC + RWT registered
  // explicitly so positions referencing them resolve regardless of OT
  // config presence (mirrors the registration in `markets/snapshot.ts`).
  const metaByMint = new Map<string, { symbol: string; decimals: number }>();
  for (const { config } of ots) {
    metaByMint.set(config.otMint.toBase58(), {
      symbol: trimNullBytes(config.symbol_),
      decimals: config.decimals,
    });
  }
  metaByMint.set(usdcMint.toBase58(), {
    symbol: USDC_SYMBOL,
    decimals: USDC_DECIMALS,
  });
  // Don't clobber an OT config that happens to describe the RWT mint.
  if (!metaByMint.has(rwtMint.toBase58())) {
    metaByMint.set(rwtMint.toBase58(), {
      symbol: RWT_SYMBOL,
      decimals: RWT_DECIMALS,
    });
  }

  const poolStates = enumeratedPools.map((p) => p.pool);

  const rows: HolderLpRow[] = [];
  for (const { positionAddress, position } of positions) {
    // Defensive Nexus filter (server-side memcmp normally excludes them).
    if (position.owner.equals(opts.liquidityNexus)) continue;

    const poolEntry = poolByAddr.get(position.pool.toBase58());
    if (!poolEntry) continue; // orphan — skip silently

    const { poolAddress, pool } = poolEntry;
    const fallbackSymbol = (m: PublicKey) => m.toBase58().slice(0, 4);

    const metaA = metaByMint.get(pool.tokenAMint.toBase58());
    const metaB = metaByMint.get(pool.tokenBMint.toBase58());
    const symbolA = metaA?.symbol ?? fallbackSymbol(pool.tokenAMint);
    const symbolB = metaB?.symbol ?? fallbackSymbol(pool.tokenBMint);
    // Unknown mints: fall back to RWT decimals (matches the heuristic in
    // markets/snapshot.ts:253-254 — keeps math safe instead of NaN).
    const decimalsA = metaA?.decimals ?? RWT_DECIMALS;
    const decimalsB = metaB?.decimals ?? RWT_DECIMALS;

    const priceA = chainPriceToUsdc(
      pool.tokenAMint,
      decimalsA,
      poolStates,
      usdcMint,
      rwtMint,
      RWT_DECIMALS,
      USDC_DECIMALS,
    ).priceUsdc;
    const priceB = chainPriceToUsdc(
      pool.tokenBMint,
      decimalsB,
      poolStates,
      usdcMint,
      rwtMint,
      RWT_DECIMALS,
      USDC_DECIMALS,
    ).priceUsdc;

    const valuation = valueLpPosition({
      shares: position.shares,
      pool,
      decimalsA,
      decimalsB,
      priceUsdcA: priceA,
      priceUsdcB: priceB,
    });

    rows.push({
      positionAddress,
      position,
      pool,
      poolAddress,
      symbolA,
      symbolB,
      decimalsA,
      decimalsB,
      valuation,
      isEmpty: position.shares === 0n,
    });
  }

  // Aggregate USDC: sum non-null `totalUsdc`. If no row contributed,
  // the snapshot total is null (distinct from $0).
  let totalUsdc: number | null = null;
  for (const row of rows) {
    if (row.valuation.totalUsdc !== null) {
      totalUsdc = (totalUsdc ?? 0) + row.valuation.totalUsdc;
    }
  }

  // Capture slot AFTER all reads — see top-of-file contract.
  const slot = await conn.getSlot('confirmed');

  return {
    holder,
    rows,
    totalUsdc,
    fetchedAt,
    slot,
  };
}
