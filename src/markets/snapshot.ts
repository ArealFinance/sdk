// Composite read: enumerate every OT + every DEX pool, then compose token
// rows (with USDC prices + RWT NAV) and pool rows (with USDC TVL).
//
// Correctness contract:
//   - All top-level program reads (`enumerateOtConfigs`, `enumeratePools`,
//     optional `RwtVault`) run in parallel via `Promise.allSettled`. A
//     failure in any one degrades that part of the snapshot to an empty
//     value rather than throwing — useful when a program is not deployed
//     on a given network (e.g. fresh localnet).
//   - `slot` is captured AFTER all reads finish so a later WS event with
//     `slot >= snapshot.slot` is guaranteed newer than at least one read.
//   - USDC pricing uses pure helpers — no extra RPC roundtrips beyond
//     the three top-level reads.
//   - Pool TVL falls back to `'mirrored'` (single-side × 2) when only one
//     side is priced; UI can warn the user about this lower-precision case.

import type { Connection, PublicKey } from '@solana/web3.js';

import { isPlaceholderRwtMint, USDC_MINTS, RWT_MINTS } from '../network/constants.js';
import type { ClusterName } from '../network/clusters.js';
import { findRwtVaultPda } from '../pda/rwt-engine.js';
import {
  enumerateOtConfigs,
  type EnumeratedOt,
} from '../portfolio/enumerate-ot.js';
import type { OtConfig } from '../programs/ownership-token/accounts.generated.js';
import { parseRwtVault } from '../programs/rwt-engine/accounts.generated.js';
import { enumeratePools } from './enumerate-pools.js';
import { chainPriceToUsdc, poolTvlUsdc } from './pricing.js';
import type {
  ChainPriceResult,
  EnumeratedPool,
  MarketsSnapshot,
  PoolRow,
  TokenRow,
} from './types.js';

/** USDC and RWT both use 6 decimals — verified via `network/constants.ts`. */
const USDC_DECIMALS = 6;
const RWT_DECIMALS = 6;
/**
 * 6-decimal fixed-point scale for `RwtVault.nav_book_value`. Mirrors
 * `contracts/rwt-engine/src/constants.rs::NAV_SCALE`. NAV is stored as
 * USDC-base-units per RWT (e.g. 1_000_000n → $1.00); dividing by this
 * scale yields the floating-point USDC price the UI consumes.
 */
const NAV_SCALE = 1_000_000;
/**
 * Authoritative on-chain RWT name + symbol surfaced to the UI when no
 * separate metadata source is configured. The RWT mint is contract-pinned
 * (no OtConfig exists for it), so we synthesise the row directly.
 */
const RWT_SYMBOL = 'RWT';
// Display name shown across the app for the protocol's RWT token. Matches
// the Figma macet ("Real World Token") rather than the older "Areal RWT"
// branding the SDK shipped with at R20.
const RWT_NAME = 'Real World Token';

export interface GetMarketsSnapshotOptions {
  /** Native DEX program (used for pool enumeration + DexConfig PDA). */
  nativeDexProgramId: PublicKey;
  /** Ownership Token program (used for OtConfig enumeration). */
  ownershipTokenProgramId: PublicKey;
  /** RWT Engine program (used for the optional RwtVault read). */
  rwtEngineProgramId: PublicKey;
  /**
   * When true, fetch RwtVault and surface `navBookValue` on the RWT
   * token row + the snapshot. When false, RWT row's `nav` is null and
   * `rwtVault` is null. Skipping this saves one RPC roundtrip on pages
   * that only need pool data.
   */
  includeNav?: boolean;
  /**
   * Override for the RWT mint pubkey on the active cluster. Defaults to
   * `RWT_MINTS[cluster]` from `network/constants.ts` — that table holds
   * the canonical R20-pinned values, but bootstrap pipelines that mint
   * a non-pinned RWT (because the deployer doesn't hold the canonical
   * keypair) need to point the snapshot at the actual on-chain mint or
   * the price/supply lookups all read empty accounts. Pass through from
   * a per-cluster override (see `app/src/lib/network/endpoints.ts`
   * `rwtMint` field) when the deployment isn't using R20 pins.
   */
  rwtMint?: PublicKey;
  /**
   * Override for the USDC mint pubkey on the active cluster. Same reason
   * as `rwtMint`: when bootstrap-init.ts creates a test USDC mint at a
   * non-canonical address, `chainPriceToUsdc` can't find any USDC-paired
   * pool against `USDC_MINTS[cluster]` (Solana devnet's real USDC) and
   * every price comes back null. Override to the actual on-chain test
   * USDC and the canonical pool walk works as designed.
   */
  usdcMint?: PublicKey;
}

/**
 * Trim trailing 0x00 bytes and decode UTF-8. Mirrors the helper in
 * `portfolio/snapshot.ts` — codegen emits fixed-width byte arrays for
 * OtConfig.name (32 bytes) and OtConfig.symbol_ (10 bytes).
 */
function trimNullBytes(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return new TextDecoder('utf-8').decode(bytes.subarray(0, end));
}

/**
 * Heuristic category bucket from the OT name/symbol. Pure helper so the
 * UI doesn't have to re-implement the prefix matching.
 *
 *   - `STOCK*`, `EQ*`          → 'stock' (tokenised equities, future)
 *   - `RWT`                    → 'protocol' (handled separately, but kept
 *                                here for completeness if a config ever
 *                                has the RWT symbol)
 *   - default                  → 'ownership' — the generic OT category,
 *                                consumed by the /markets PROTOCOL section.
 *                                Sparkles (SPRK) is the first such OT and
 *                                belongs alongside RWT, not under STOCKS.
 */
function deriveCategory(config: OtConfig): TokenRow['category'] {
  const symbol = trimNullBytes(config.symbol_).toUpperCase();
  if (symbol === 'RWT') return 'protocol';
  if (symbol.startsWith('STOCK') || symbol.startsWith('EQ')) {
    return 'stock';
  }
  return 'ownership';
}

/**
 * Read `RwtVault` for `programId`. Returns null on any error — the
 * snapshot uses null to signal "NAV unavailable" without taking the
 * whole call down.
 */
async function readRwtVault(
  conn: Connection,
  programId: PublicKey,
): Promise<{
  navBookValue: bigint;
  totalRwtSupply: bigint;
  totalInvestedCapital: bigint;
} | null> {
  try {
    const [vaultPda] = findRwtVaultPda(programId);
    const info = await conn.getAccountInfo(vaultPda, 'confirmed');
    if (!info) return null;
    const parsed = parseRwtVault(info.data);
    return {
      navBookValue: parsed.navBookValue,
      totalRwtSupply: parsed.totalRwtSupply,
      totalInvestedCapital: parsed.totalInvestedCapital,
    };
  } catch {
    return null;
  }
}

/**
 * Composite read: pool list + token list with USDC pricing + optional NAV.
 *
 * See {@link GetMarketsSnapshotOptions} for the program IDs and toggles.
 * The returned snapshot is consistent with itself: `slot` is taken after
 * all reads, so any WS event with `slot >= snapshot.slot` is guaranteed
 * to be newer than at least one of the snapshot's reads.
 */
export async function getMarketsSnapshot(
  conn: Connection,
  cluster: ClusterName,
  opts: GetMarketsSnapshotOptions,
): Promise<MarketsSnapshot> {
  const fetchedAt = Date.now();
  const usdcMint = opts.usdcMint ?? USDC_MINTS[cluster];
  const rwtMint = opts.rwtMint ?? RWT_MINTS[cluster];
  const includeNav = opts.includeNav ?? true;

  // Top-level parallel reads. allSettled so any single failure degrades
  // gracefully — a missing OT program shouldn't blank out the pool list.
  const [otsRes, poolsRes, navRes] = await Promise.allSettled([
    enumerateOtConfigs(conn, opts.ownershipTokenProgramId),
    enumeratePools(conn, opts.nativeDexProgramId),
    includeNav
      ? readRwtVault(conn, opts.rwtEngineProgramId)
      : Promise.resolve(null),
  ]);

  const ots: EnumeratedOt[] =
    otsRes.status === 'fulfilled' ? otsRes.value : [];
  const enumeratedPools: EnumeratedPool[] =
    poolsRes.status === 'fulfilled' ? poolsRes.value : [];
  const rwtVault = navRes.status === 'fulfilled' ? navRes.value : null;

  const poolStates = enumeratedPools.map((p) => p.pool);

  // Build a mint → (decimals, name, symbol, category) lookup so pool
  // pricing can find each side without repeating the linear scan.
  const otByMint = new Map<
    string,
    {
      decimals: number;
      name: string;
      symbol: string;
      category: TokenRow['category'];
    }
  >();
  for (const { config } of ots) {
    otByMint.set(config.otMint.toBase58(), {
      decimals: config.decimals,
      name: trimNullBytes(config.name),
      symbol: trimNullBytes(config.symbol_),
      category: deriveCategory(config),
    });
  }

  // Build token rows: RWT singleton + every OT (RWT may also appear as
  // an OT config in some deploys; we de-dup via the mint map below).
  const tokens: TokenRow[] = [];

  // RWT row. The RWT mint is contract-pinned and does NOT have an
  // OtConfig in the canonical layout, so we synthesise this row directly.
  // If a deploy DOES emit an OtConfig for the RWT mint, the OT loop
  // below will skip it (we check the dedupe set).
  //
  // Price source preference for RWT:
  //   1. `RwtVault.nav_book_value / NAV_SCALE` — canonical NAV. This is
  //      the right answer per `docs/economics/rwt-real-world-token`: NAV
  //      starts at $1.00 and grows from protocol yield, independent of
  //      pool reserves.
  //   2. Fallback to reserve-derived pricing when no vault is loaded
  //      (e.g. `includeNav: false` or vault read failed).
  //
  // Why we do NOT use the master pool's reserve ratio: the Monotonic
  // Ladder master pool is intentionally single-sided — Nexus funds a
  // USDC bid wall, the RWT side fills only from organic user sells. So
  // `reserveB / reserveA` is meaningless as a price (it can drift from
  // $20 to $0.05 just from a single Smoke swap). See
  // docs/economics/rwt-real-world-token.mdx and `nav.rs` for the
  // canonical pricing rule.
  let rwtPriceRes: ChainPriceResult;
  if (rwtVault && rwtVault.navBookValue > 0n) {
    rwtPriceRes = {
      priceUsdc: Number(rwtVault.navBookValue) / NAV_SCALE,
      source: 'nav',
    };
  } else {
    rwtPriceRes = chainPriceToUsdc(
      rwtMint,
      RWT_DECIMALS,
      poolStates,
      usdcMint,
      rwtMint,
      RWT_DECIMALS,
      USDC_DECIMALS,
    );
  }
  tokens.push({
    mint: rwtMint,
    symbol: RWT_SYMBOL,
    name: RWT_NAME,
    decimals: RWT_DECIMALS,
    category: 'protocol',
    priceUsdc: rwtPriceRes.priceUsdc,
    priceSource: rwtPriceRes.source,
    nav: rwtVault?.navBookValue ?? null,
    isPlaceholder: isPlaceholderRwtMint(rwtMint),
  });
  const seenMints = new Set<string>([rwtMint.toBase58()]);

  for (const { config } of ots) {
    const mint = config.otMint;
    const key = mint.toBase58();
    if (seenMints.has(key)) continue;
    seenMints.add(key);

    const priceRes = chainPriceToUsdc(
      mint,
      config.decimals,
      poolStates,
      usdcMint,
      rwtMint,
      RWT_DECIMALS,
      USDC_DECIMALS,
    );

    tokens.push({
      mint,
      symbol: trimNullBytes(config.symbol_),
      name: trimNullBytes(config.name),
      decimals: config.decimals,
      category: deriveCategory(config),
      priceUsdc: priceRes.priceUsdc,
      priceSource: priceRes.source,
      nav: null,
      isPlaceholder: false,
    });
  }

  // Helper: per-mint USDC price + decimals for TVL math. We re-build
  // a price map from `tokens` so each pool side picks up the same
  // resolved price the token row surfaces (single source of truth).
  const priceByMint = new Map<string, { price: number | null; decimals: number }>();
  for (const t of tokens) {
    priceByMint.set(t.mint.toBase58(), {
      price: t.priceUsdc,
      decimals: t.decimals,
    });
  }
  // USDC itself is not always in `tokens` — register it explicitly.
  priceByMint.set(usdcMint.toBase58(), { price: 1, decimals: USDC_DECIMALS });

  // Build pool rows with USDC TVL.
  const pools: PoolRow[] = enumeratedPools.map(({ poolAddress, pool }) => {
    const sideA = priceByMint.get(pool.tokenAMint.toBase58());
    const sideB = priceByMint.get(pool.tokenBMint.toBase58());
    const decimalsA = sideA?.decimals ?? RWT_DECIMALS;
    const decimalsB = sideB?.decimals ?? RWT_DECIMALS;
    const priceA = sideA?.price ?? null;
    const priceB = sideB?.price ?? null;

    const tvl = poolTvlUsdc(pool, priceA, priceB, decimalsA, decimalsB);

    return {
      poolAddress,
      poolType: pool.poolType,
      tokenAMint: pool.tokenAMint,
      tokenBMint: pool.tokenBMint,
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      feeBps: pool.feeBps,
      isActive: pool.isActive,
      hasOtTreasury: pool.hasOtTreasury,
      tvlUsdc: tvl.tvl,
      tvlSource: tvl.source,
      rawPool: pool,
    };
  });

  // Capture slot AFTER all reads — see top-of-file contract.
  const slot = await conn.getSlot('confirmed');

  return {
    tokens,
    pools,
    rwtVault,
    fetchedAt,
    slot,
  };
}
