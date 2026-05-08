// Pure off-chain math helpers for LP `add_liquidity` / `zap_liquidity` /
// `remove_liquidity` (Phase 11 SDK F-LP-1).
//
// These mirror `contracts/native-dex/src/amm.rs::calculate_lp_shares` and
// `calculate_remove_amounts` byte-for-byte. Update both atomically — every
// change to the on-chain math (rounding mode, MIN_LIQUIDITY constant,
// first-deposit sqrt formula) MUST be reflected here in the same PR,
// otherwise SDK consumers will mis-quote min_shares slippage guards.
//
// Why this exists:
//   Phase 11 shipped LP transaction builders (Add / Zap / Remove / ClaimFees)
//   without the off-chain math helpers consumers need to display "you will
//   receive ~X LP shares" or "your N shares are worth ~A token_a + B token_b".
//   Replicating constant-product math in every consumer is brittle (rounding
//   drift trips slippage guards on real txs); centralising it here is the
//   single source of truth.

/**
 * MIN_LIQUIDITY from `contracts/native-dex/src/constants.rs`.
 *
 * Burned on the very first deposit to prevent the classic "first-depositor
 * inflation" attack: the deployer cannot mint a single share and inflate its
 * value by donating tokens directly to the vault, because at least
 * MIN_LIQUIDITY shares are permanently locked.
 *
 * Standard Uniswap-V2 convention is 1000; Areal's contract pins it to the
 * same value (verified against constants.rs:10).
 */
export const LP_MIN_LIQUIDITY: bigint = 1_000n;

// ─────────────────────────── add_liquidity ───────────────────────────

export interface LpAddInputs {
  /** Pool's current `reserve_a` (raw lamports). */
  reserveA: bigint;
  /** Pool's current `reserve_b` (raw lamports). */
  reserveB: bigint;
  /** Pool's current `total_lp_shares` (u128). 0 ⇒ first deposit. */
  supply: bigint;
  /** User's contributed `amount_a` (raw lamports). */
  amountA: bigint;
  /** User's contributed `amount_b` (raw lamports). */
  amountB: bigint;
}

export interface LpAddQuote {
  /**
   * LP shares the user would receive (post-MIN_LIQUIDITY burn on the first
   * deposit). u128 in the contract; we use bigint for symmetry.
   */
  shares: bigint;
  /**
   * True iff this would be the first deposit into the pool (supply == 0).
   * On a first deposit the SDK math returns `sqrt(amountA * amountB) -
   * LP_MIN_LIQUIDITY`; on subsequent deposits the proportional formula
   * applies. UI surfaces this so the user understands why their effective
   * share is slightly lower the first time.
   */
  isFirstDeposit: boolean;
}

/**
 * Quote LP shares for `add_liquidity` / `zap_liquidity` (the deposit-side
 * portion of the zap). Pure function — no RPC, no mutation.
 *
 * Math (mirrors amm.rs::calculate_lp_shares):
 *   - First deposit (supply == 0): `shares = isqrt(amountA * amountB) - MIN_LIQUIDITY`
 *     If `isqrt(...)` < MIN_LIQUIDITY the contract rejects with
 *     `InitialLiquidityTooSmall`; we mirror that by clamping to 0n so the
 *     caller's slippage guard naturally trips. (We do NOT throw here —
 *     callers want a quote object with shares=0n to render "deposit too
 *     small" UI without try/catching.)
 *   - Subsequent deposit: `shares = min(amountA * supply / reserveA,
 *                                       amountB * supply / reserveB)`
 *     using floor division. Matches `checked_mul_div_u128` rounding.
 *
 * Edge cases:
 *   - First deposit with one side zero → product = 0 → sqrt(0) = 0 → shares 0n.
 *   - Subsequent deposit with reserveA or reserveB == 0 is impossible by
 *     contract invariant (a non-empty pool cannot have a zero reserve), but
 *     the formula would divide by zero — we clamp to 0n shares for safety.
 */
export function quoteLpShares(inputs: LpAddInputs): LpAddQuote {
  const { reserveA, reserveB, supply, amountA, amountB } = inputs;
  const isFirstDeposit = supply === 0n;

  if (isFirstDeposit) {
    const product = amountA * amountB;
    const root = bigintIsqrt(product);
    const shares = root > LP_MIN_LIQUIDITY ? root - LP_MIN_LIQUIDITY : 0n;
    return { shares, isFirstDeposit };
  }

  // Subsequent deposit. Defensive clamp on impossible-by-contract zero
  // reserves (e.g., a corrupt fixture) so we never divide by zero.
  if (reserveA === 0n || reserveB === 0n) {
    return { shares: 0n, isFirstDeposit };
  }
  const sharesA = (amountA * supply) / reserveA;
  const sharesB = (amountB * supply) / reserveB;
  const shares = sharesA < sharesB ? sharesA : sharesB;
  return { shares, isFirstDeposit };
}

// ─────────────────────────── remove_liquidity ───────────────────────────

export interface LpRemoveInputs {
  /** User's `shares_to_burn` (u128). */
  shares: bigint;
  /** Pool's current `total_lp_shares` (u128). */
  supply: bigint;
  /** Pool's current `reserve_a` (raw lamports). */
  reserveA: bigint;
  /** Pool's current `reserve_b` (raw lamports). */
  reserveB: bigint;
}

export interface LpRemoveQuote {
  /** Amount of token A the user would receive (raw lamports). */
  amountA: bigint;
  /** Amount of token B the user would receive (raw lamports). */
  amountB: bigint;
}

/**
 * Quote token amounts for `remove_liquidity`. Pure function.
 *
 * Math (mirrors amm.rs::calculate_remove_amounts, floor division):
 *   amountA = shares * reserveA / supply
 *   amountB = shares * reserveB / supply
 *
 * Edge cases:
 *   - shares == 0n → returns {0n, 0n}.
 *   - supply == 0n → contract rejects with InsufficientLiquidity. The SDK
 *     returns {0n, 0n} (never divides) so a caller pre-flighting against a
 *     drained pool gets a sensible quote without a thrown exception.
 */
export function quoteLpRemove(inputs: LpRemoveInputs): LpRemoveQuote {
  const { shares, supply, reserveA, reserveB } = inputs;
  if (supply === 0n || shares === 0n) {
    return { amountA: 0n, amountB: 0n };
  }
  const amountA = (shares * reserveA) / supply;
  const amountB = (shares * reserveB) / supply;
  return { amountA, amountB };
}

// ─────────────────────────── helpers ───────────────────────────

/**
 * Integer square root of a non-negative bigint using Newton's method.
 *
 * Mirrors the contract-side `arlex_lang::math::isqrt(u128)` semantics:
 * floor(sqrt(n)) — never overshoots. Used by the first-deposit shares
 * formula. Returns 0n for inputs <= 0n (the caller is expected to clamp
 * negatives upstream; we are defensive here so a malformed input does not
 * loop forever).
 *
 * Newton's method: x_{k+1} = floor((x_k + n / x_k) / 2). Converges in
 * O(log log n) steps and terminates when the next iterate is >= the
 * current one, which gives floor(sqrt(n)) for non-negative integers.
 */
export function bigintIsqrt(n: bigint): bigint {
  if (n <= 0n) return 0n;
  if (n < 4n) return 1n;
  // Initial guess: 2 ^ ceil(bitLength / 2). For a 128-bit input this is at
  // most ~2^64, well within bigint range.
  let x = n;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
}
