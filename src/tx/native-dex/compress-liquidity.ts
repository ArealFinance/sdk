// `native-dex::compress_liquidity` instruction builder.
//
// CP-7 — Pool Rebalancer recenters the active bid wall on a LOWER NAV
// after a governance writedown (`rwt_engine::adjust_capital`).
// Capital-neutral: no token inflow, no Nexus accounts, no token vaults.
// RWT above the new NAV (the "frozen ask wall") is preserved for NAV
// recovery via future yield.
//
// Account order — POSITION-SENSITIVE — mirrors
// `contracts/native-dex/src/instructions/compress_liquidity.rs::CompressLiquidity`
// and the codegen `CompressLiquidityAccounts` struct:
//
//   0. rebalancer        (signer, read)    dex_config.rebalancer
//   1. dex_config        (read)            ["dex_config"]
//   2. pool_state        (mut)             POOL_TYPE_CONCENTRATED
//   3. bin_array         (mut)             ["bins", pool_state]
//   4. rwt_vault         (read)            RWT Engine NAV source
//
// Args (encoded via codegen `encodeCompressLiquidityArgs`):
//   new_nav_bin         i32 LE
//   active_zone_width   u16 LE
//
// Discriminator: codegen `COMPRESS_LIQUIDITY_DISCRIMINATOR` (IDL-derived).

import { PublicKey, TransactionInstruction } from '@solana/web3.js';

import {
  encodeCompressLiquidityArgs,
} from '../../programs/native-dex/instructions.generated.js';

const I32_MIN = -(2 ** 31);
const I32_MAX = 2 ** 31 - 1;
const U16_MAX = 0xffff;

export interface BuildCompressLiquidityIxArgs {
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
  /** RWT Engine `RwtVault` PDA — read-only, owner-checked on-chain. */
  rwtVault: PublicKey;

  /**
   * Target NAV-derived bin. Must be strictly LESS than
   * `pool.last_rebalance_nav_bin` (the `compress_redistribute` math reverts
   * with `NotCompressionDirection` otherwise).
   */
  newNavBin: number;
  /**
   * Width of the new active zone in bins. Currently the contract pins
   * this to `ACTIVE_ZONE_WIDTH` (= 40); kept as an arg for forward
   * compatibility.
   */
  activeZoneWidth: number;
}

/**
 * Build the `native-dex::compress_liquidity` instruction.
 *
 * Pure: no RPC, no PDA derivation. Capital-neutral — no SPL Transfer is
 * issued; the math purely redistributes existing pool USDC around the
 * new (lower) NAV bin. RWT above the new NAV is preserved as the
 * "frozen ask wall" awaiting NAV recovery.
 *
 * Instruction data layout:
 *   [disc(8) | new_nav_bin(i32 LE) | active_zone_width(u16 LE)] = 14 bytes.
 */
export function buildCompressLiquidityIx(
  args: BuildCompressLiquidityIxArgs,
): TransactionInstruction {
  validateI32('new_nav_bin', args.newNavBin);
  validateU16('active_zone_width', args.activeZoneWidth);

  const data = encodeCompressLiquidityArgs({
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
      { pubkey: args.rwtVault, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ───────────────────────────── validation ─────────────────────────────────

function validateI32(field: string, value: number): void {
  if (!Number.isInteger(value) || value < I32_MIN || value > I32_MAX) {
    throw new Error(
      `compress_liquidity: ${field} out of range i32 (got ${value})`,
    );
  }
}

function validateU16(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > U16_MAX) {
    throw new Error(
      `compress_liquidity: ${field} out of range u16 (got ${value})`,
    );
  }
}
