// `native-dex::grow_liquidity` instruction builder.
//
// CP-7 — Pool Rebalancer extends the active bid wall rightward when NAV
// rises past the 1% deviation threshold. Pulls fresh USDC from the Nexus
// accumulator (PDA-signed SPL Transfer) and redistributes existing
// active-zone USDC so the geometric density peak sits at `new_nav_bin`.
// Permanent tail and organic ask are never touched.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/native-dex/src/instructions/grow_liquidity.rs::GrowLiquidity`
// and the codegen `GrowLiquidityAccounts` struct:
//
//   0. rebalancer        (signer, read)         dex_config.rebalancer
//   1. dex_config        (read)                 ["dex_config"]
//   2. pool_state        (mut)                  POOL_TYPE_CONCENTRATED
//   3. bin_array         (mut)                  ["bins", pool_state]
//   4. liquidity_nexus   (mut)                  [LIQUIDITY_NEXUS_SEED]
//                                               PDA-signs the SPL Transfer
//   5. nexus_usdc_ata    (mut, owned by Token)  source for the USDC drain
//   6. pool_vault_b      (mut, owned by Token)  destination (== pool.vault_b)
//   7. rwt_vault         (read)                 RWT Engine NAV source
//   8. token_program     (read)                 SPL Token program
//
// Args (encoded via codegen `encodeGrowLiquidityArgs`):
//   new_nav_bin         i32 LE
//   active_zone_width   u16 LE
//
// Discriminator: codegen `GROW_LIQUIDITY_DISCRIMINATOR` (IDL-derived).

import { PublicKey, TransactionInstruction } from '@solana/web3.js';

import { SPL_TOKEN_PROGRAM_ID } from '../../network/constants.js';
import {
  encodeGrowLiquidityArgs,
} from '../../programs/native-dex/instructions.generated.js';

const I32_MIN = -(2 ** 31);
const I32_MAX = 2 ** 31 - 1;
const U16_MAX = 0xffff;

export interface BuildGrowLiquidityIxArgs {
  /** DEX program ID. */
  dexProgramId: PublicKey;
  /** Rebalancer wallet — Tx signer. Must equal `dex_config.rebalancer`. */
  rebalancer: PublicKey;
  /** `["dex_config"]` singleton — source of `rebalancer` authority pubkey. */
  dexConfig: PublicKey;
  /** Target master pool — must be `POOL_TYPE_CONCENTRATED`. */
  poolState: PublicKey;
  /** Pool's `BinArray` — derived as `["bins", pool_state]`. */
  binArray: PublicKey;
  /** Singleton Nexus PDA — derived as `[LIQUIDITY_NEXUS_SEED]`. */
  liquidityNexus: PublicKey;
  /**
   * Nexus-owned USDC ATA — PDA-signed SPL Transfer source. Validated
   * on-chain for SPL-owner == `liquidity_nexus` and mint == `USDC_MINT`.
   */
  nexusUsdcAta: PublicKey;
  /** Pool's USDC vault (token-B side). Must equal `pool.vault_b`. */
  poolVaultB: PublicKey;
  /** RWT Engine `RwtVault` PDA — read-only, owner-checked on-chain. */
  rwtVault: PublicKey;

  /**
   * Target NAV-derived bin. Must be strictly greater than
   * `pool.last_rebalance_nav_bin` (the `grow_redistribute` math reverts
   * with `NotGrowthDirection` otherwise).
   */
  newNavBin: number;
  /**
   * Width of the new active zone in bins. Currently the contract pins
   * this to `ACTIVE_ZONE_WIDTH` (= 40), but the arg is kept to surface
   * future width adjustments without an IDL break.
   */
  activeZoneWidth: number;
}

/**
 * Build the `native-dex::grow_liquidity` instruction.
 *
 * Pure: no RPC, no PDA derivation. Pass the resolved pubkeys in. The
 * Rebalancer bot off-chain computes `new_nav_bin` via
 * `floor(log(nav) / log(1 + bin_step_bps / 10_000))` — see
 * `_ladder-types::navToBin` for an off-chain mirror.
 *
 * Instruction data layout:
 *   [disc(8) | new_nav_bin(i32 LE) | active_zone_width(u16 LE)] = 14 bytes.
 */
export function buildGrowLiquidityIx(
  args: BuildGrowLiquidityIxArgs,
): TransactionInstruction {
  validateI32('new_nav_bin', args.newNavBin);
  validateU16('active_zone_width', args.activeZoneWidth);

  const data = encodeGrowLiquidityArgs({
    newNavBin: args.newNavBin,
    activeZoneWidth: args.activeZoneWidth,
  });

  return new TransactionInstruction({
    programId: args.dexProgramId,
    keys: [
      { pubkey: args.rebalancer, isSigner: true, isWritable: false },
      { pubkey: args.dexConfig, isSigner: false, isWritable: false },
      { pubkey: args.poolState, isSigner: false, isWritable: true },
      { pubkey: args.binArray, isSigner: false, isWritable: true },
      { pubkey: args.liquidityNexus, isSigner: false, isWritable: true },
      { pubkey: args.nexusUsdcAta, isSigner: false, isWritable: true },
      { pubkey: args.poolVaultB, isSigner: false, isWritable: true },
      { pubkey: args.rwtVault, isSigner: false, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ───────────────────────────── validation ─────────────────────────────────

function validateI32(field: string, value: number): void {
  if (!Number.isInteger(value) || value < I32_MIN || value > I32_MAX) {
    throw new Error(
      `grow_liquidity: ${field} out of range i32 (got ${value})`,
    );
  }
}

function validateU16(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > U16_MAX) {
    throw new Error(
      `grow_liquidity: ${field} out of range u16 (got ${value})`,
    );
  }
}
