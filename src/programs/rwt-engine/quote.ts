// Pure off-chain quote helper for `rwt-engine::mint_rwt`.
//
// This file mirrors `contracts/rwt-engine/src/instructions/mint_rwt.rs`
// and `contracts/rwt-engine/src/nav.rs`. Update both atomically — every
// change to the on-chain math (fee split rounding, NAV truncation guard,
// MIN_MINT_AMOUNT, MINT_FEE_BPS) MUST be reflected here in the same PR,
// otherwise SDK consumers will mis-quote the RWT mint and `min_rwt_out`
// slippage guards will trip on real submits.
//
// Scope:
//   - User-facing `mint_rwt` only. The admin `admin_mint_rwt` path has
//     no fee model and is intended for ops, not the UI.
//
// Output discriminated union:
//   - `{ ok: true, quote }`        — quote is buildable, see MintQuoteResult
//   - `{ ok: false, error: ... }`  — same error tags the on-chain code
//                                    would raise (MintPaused, ZeroAmount,
//                                    BelowMinMint, ZeroRwtOutput,
//                                    MathOverflow). UI surfaces the tag
//                                    directly without thumbing through
//                                    RwtError variants.
//
// Note on slippage: the contract REQUIRES a non-zero `min_rwt_out`
// (`ZeroSlippage` error). The quote helper itself is read-only — it
// surfaces an `rwtOut` value the caller then runs through
// `applyMintSlippage` to derive `min_rwt_out`. The slippage validation
// happens in the tx-builder, not here.

import type { PublicKey } from '@solana/web3.js';

import type { ClusterName } from '../../network/clusters.js';
import { isPlaceholderRwtMint } from '../../network/constants.js';
import type { RwtVault } from './accounts.generated.js';

// ─────────────────────────────── constants ────────────────────────────────

/** `BPS_DENOMINATOR` from `contracts/rwt-engine/src/constants.rs`. */
const BPS_DENOMINATOR = 10_000n;

/** `MINT_FEE_BPS` from `contracts/rwt-engine/src/constants.rs` — 1% total mint fee. */
const MINT_FEE_BPS = 100n;

/** `NAV_SCALE` from `contracts/rwt-engine/src/constants.rs` — 6-decimal fixed-point. */
const NAV_SCALE = 1_000_000n;

/** `INITIAL_NAV` from `contracts/rwt-engine/src/constants.rs` — $1.00 in USDC lamports. */
const INITIAL_NAV = NAV_SCALE;

/** `MIN_MINT_AMOUNT` from `contracts/rwt-engine/src/constants.rs` — $1.00 minimum. */
const MIN_MINT_AMOUNT = 1_000_000n;

/** `u64::MAX` — hard ceiling enforced by the on-chain `mul_div_u64` math. */
const U64_MAX = (1n << 64n) - 1n;

// ──────────────────────────────── types ───────────────────────────────────

/**
 * Mirrors the on-chain `RwtError` variants the `mint_rwt` path can raise.
 * Quote uses the same tag names so UI code can switch on `error` without
 * juggling a separate enum.
 *
 * `MainnetNotDeployed` is the SDK-side mainnet placeholder guard — it
 * does not exist in the contract because the contract pins `RWT_MINT` at
 * compile time. The SDK refuses to quote against the placeholder so a
 * caller using the wrong cluster does not silently sign a tx that will
 * revert with `InvalidTokenAccount` on-chain.
 */
export type MintQuoteError =
  | 'MintPaused'
  | 'ZeroAmount'
  | 'BelowMinMint'
  | 'ZeroRwtOutput'
  | 'MathOverflow'
  | 'MainnetNotDeployed';

/**
 * Fee breakdown matching the on-chain accounting in `mint_rwt::handler`.
 *
 * `feeTotal = amount * MINT_FEE_BPS / BPS_DENOMINATOR` (1%).
 * `feeDao  = feeTotal >> 1` (floor of half).
 * `feeVault = feeTotal - feeDao` (remainder pattern — vault gets the
 * odd-cent rounding so the user's deposit principal is preserved).
 * `netDeposit = amount - feeTotal`.
 *
 * The vault's invested capital grows by `netDeposit + feeVault` (the
 * vault-side fee is counted toward yield, not given away).
 */
export interface MintQuoteFees {
  feeTotal: bigint;
  feeDao: bigint;
  feeVault: bigint;
  netDeposit: bigint;
}

/**
 * Successful quote payload. All fields are bigint (no `Number`
 * coercion — even `capitalAfter` stays in `u128` range).
 *
 * `navAtQuote` is the NAV used to price this mint (computed from the
 * CURRENT vault state, not from `vault.navBookValue`). The contract
 * recomputes NAV on every mint to prevent stale-cache bugs; the SDK
 * does the same so `min_rwt_out` lines up.
 *
 * `capitalAfter`/`supplyAfter`/`navAfter` show the post-mint state for
 * UI display ("after this mint, NAV will be $X.XX").
 */
export interface MintQuoteResult {
  rwtOut: bigint;
  netDeposit: bigint;
  fees: MintQuoteFees;
  navAtQuote: bigint;
  capitalAfter: bigint;
  supplyAfter: bigint;
  navAfter: bigint;
}

export type MintQuoteOutcome =
  | { ok: true; quote: MintQuoteResult }
  | { ok: false; error: MintQuoteError };

export interface QuoteMintRwtArgs {
  /**
   * Parsed `RwtVault` (use `parseRwtVault`). Only the three load-bearing
   * fields are required — caller can build a minimal struct or pass the
   * full parsed account.
   */
  vault: Pick<RwtVault, 'totalInvestedCapital' | 'totalRwtSupply' | 'mintPaused'>;
  /** User's intended deposit amount (USDC lamports, 6 decimals). */
  amountIn: bigint;
  /**
   * Optional safety check. When `'mainnet'` and `rwtMint` matches the
   * R20 placeholder bytes, `quoteMintRwt` returns
   * `{ ok: false, error: 'MainnetNotDeployed' }` without proceeding.
   * Mirrors the invariant enforced by `buildMintRwtTx` so callers cannot
   * mis-detect the mint context. Devnet/localnet pass through unchanged
   * (placeholder IS expected there).
   */
  cluster?: ClusterName;
  /** RWT mint per cluster — checked against placeholder when `cluster='mainnet'`. */
  rwtMint?: PublicKey;
}

// ─────────────────────────────── public API ───────────────────────────────

/**
 * Pure off-chain quote for `rwt-engine::mint_rwt`.
 *
 * Returns `{ ok: false, error }` for every condition `mint_rwt::handler`
 * would reject the tx for (paused, zero amount, below-minimum, NAV
 * overflow, dust mint where fees produce 0 RWT).
 *
 * Returns `{ ok: true, quote }` with `rwtOut`, fee breakdown matching
 * the on-chain remainder pattern, the NAV used to price the mint, and
 * the post-mint vault projection for UI display.
 *
 * The function is pure — no RPC, no PDA derivation, no `Number`
 * coercion. Callers use this to populate the UI quote, then run
 * `rwtOut` through `applyMintSlippage` to derive the `min_rwt_out`
 * value handed to `buildMintRwtIx`.
 */
export function quoteMintRwt(args: QuoteMintRwtArgs): MintQuoteOutcome {
  const { vault, amountIn, cluster, rwtMint } = args;

  // 1. Mainnet safety: refuse to quote against the R20 placeholder.
  //    Without this guard the caller would silently quote against a
  //    mint the on-chain `mint_rwt` will reject with
  //    `InvalidTokenAccount` (vault.rwt_mint is pinned at deploy).
  if (cluster === 'mainnet' && rwtMint && isPlaceholderRwtMint(rwtMint)) {
    return err('MainnetNotDeployed');
  }

  // Mirror `mint_rwt::handler` preflight order.

  // 2. Pause check.
  if (vault.mintPaused) return err('MintPaused');

  // 3. Zero-amount check.
  if (amountIn === 0n) return err('ZeroAmount');

  // 4. Minimum-mint floor (prevents fee-free dust).
  if (amountIn < MIN_MINT_AMOUNT) return err('BelowMinMint');

  // 5. u64::MAX overflow check on the input amount itself. The contract
  //    only takes a u64, so anything above this would never make it past
  //    deserialisation — we surface the same tag.
  if (amountIn > U64_MAX) return err('MathOverflow');

  // 6. NAV recomputed from current state (matches `calculate_nav`).
  const navAtQuote = calculateNav(vault.totalInvestedCapital, vault.totalRwtSupply);
  if (navAtQuote === null) return err('MathOverflow');

  // 7. Fee math — mirror the contract's `mul_div_u64` + remainder pattern.
  const feeTotal = (amountIn * MINT_FEE_BPS) / BPS_DENOMINATOR;
  if (feeTotal > U64_MAX) return err('MathOverflow');
  // `dao_fee = fee_total >> 1` in the contract; bigint floor div is
  // equivalent for non-negative values.
  const feeDao = feeTotal / 2n;
  const feeVault = feeTotal - feeDao;
  const netDeposit = amountIn - feeTotal;
  // checked_sub guard — should always hold given amount > feeTotal, but
  // keep the contract-level invariant explicit.
  if (netDeposit < 0n) return err('MathOverflow');

  // 8. RWT output: net_deposit * NAV_SCALE / nav.
  if (navAtQuote === 0n) return err('MathOverflow'); // unreachable — clamped to >=1 when supply>0
  const rwtOutWide = (netDeposit * NAV_SCALE) / navAtQuote;
  if (rwtOutWide > U64_MAX) return err('MathOverflow');
  const rwtOut = rwtOutWide;

  // 9. Reject mint that would produce 0 RWT (user pays fee, gets nothing).
  if (rwtOut === 0n) return err('ZeroRwtOutput');

  // 10. Project post-mint state for UI display. The contract increments
  //     `total_invested_capital` by `(net_deposit + vault_fee)` (the
  //     vault-side fee is yield, not given away) and `total_rwt_supply`
  //     by `rwt_out`, then recalculates NAV.
  const capitalIncrease = netDeposit + feeVault;
  const capitalAfter = vault.totalInvestedCapital + capitalIncrease;
  const supplyAfter = vault.totalRwtSupply + rwtOut;
  if (supplyAfter > U64_MAX) return err('MathOverflow');

  const navAfter = calculateNav(capitalAfter, supplyAfter);
  if (navAfter === null) return err('MathOverflow');

  return {
    ok: true,
    quote: {
      rwtOut,
      netDeposit,
      fees: { feeTotal, feeDao, feeVault, netDeposit },
      navAtQuote,
      capitalAfter,
      supplyAfter,
      navAfter,
    },
  };
}

/**
 * Re-export `applySlippage` from native-dex/quote under the
 * `applyMintSlippage` name. The math is identical — `expectedOut *
 * (10_000 - slippageBps) / 10_000` — and there is no need for a
 * second copy. Renamed at re-export so callers can import both
 * helpers without symbol collision.
 */
export { applySlippage as applyMintSlippage } from '../native-dex/quote.js';

// ───────────────────────── internal math helpers ──────────────────────────

/**
 * Mirrors `contracts/rwt-engine/src/nav.rs::calculate_nav`.
 *
 *   supply == 0       → INITIAL_NAV (bootstrap).
 *   otherwise         → max(1, capital * NAV_SCALE / supply) — clamped
 *                       to 1 to prevent NAV=0 from integer truncation
 *                       at extreme capital/supply ratios (e.g.,
 *                       capital=1, supply=NAV_SCALE+1 → raw 0).
 *
 * Returns `null` on overflow (capital * NAV_SCALE > u64::MAX after
 * the divide), matching the contract's `MathOverflow` rejection.
 */
function calculateNav(capital: bigint, supply: bigint): bigint | null {
  if (supply === 0n) return INITIAL_NAV;
  // Same widening as Rust (`mul_div_u128_u64`). bigint is unbounded,
  // but we still bound the final value by u64::MAX to match the
  // contract's `u64::try_from`.
  const raw = (capital * NAV_SCALE) / supply;
  if (raw > U64_MAX) return null;
  // SECURITY clamp — see nav.rs comment.
  return raw === 0n ? 1n : raw;
}

function err(error: MintQuoteError): { ok: false; error: MintQuoteError } {
  return { ok: false, error };
}
