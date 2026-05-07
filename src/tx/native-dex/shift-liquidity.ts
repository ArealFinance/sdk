// `native_dex::shift_liquidity` instruction builder.
//
// The pool-rebalancer bot calls this to redistribute concentrated-pool bin
// liquidity around a new NAV-derived center. No tokens enter or leave vaults —
// purely an internal pyramid redistribution. See Layer 9 §4.6 /
// `contracts/native-dex/src/instructions/shift_liquidity.rs`.
//
// Account order (shift_liquidity.rs:16):
//   0. rebalancer  (signer, read)
//   1. dex_config  (read,  `["dex_config"]`)
//   2. pool_state  (mut)
//   3. bin_array   (mut,   `["bins", pool_state]`)
//
// Args (D14, total 14 bytes after disc):
//   nav_bin           i32 LE
//   target_bin_count  u16 LE
//
// Discriminator: codegen `SHIFT_LIQUIDITY_DISCRIMINATOR` from the IDL.

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { SHIFT_LIQUIDITY_DISCRIMINATOR } from '../../programs/native-dex/instructions.generated.js';

const I32_MIN = -(2 ** 31);
const I32_MAX = 2 ** 31 - 1;
const U16_MAX = 0xffff;

export interface BuildShiftLiquidityArgs {
  dexProgramId: PublicKey;
  rebalancer: PublicKey;
  dexConfig: PublicKey;   // `["dex_config"]`
  poolState: PublicKey;
  binArray: PublicKey;    // `["bins", pool_state]`

  /** Target NAV-derived active bin id (signed i32 — bins index from 0). */
  navBin: number;
  /** Width of the new pyramid (number of bins to repopulate). */
  targetBinCount: number;
}

/**
 * Build `native_dex::shift_liquidity` instruction.
 *
 * Instruction data layout:
 *   [disc(8) | nav_bin(i32 LE) | target_bin_count(u16 LE)] = 14 bytes total.
 */
export function buildShiftLiquidityIx(
  args: BuildShiftLiquidityArgs,
): TransactionInstruction {
  if (!Number.isInteger(args.navBin) || args.navBin < I32_MIN || args.navBin > I32_MAX) {
    throw new Error(`shift_liquidity: nav_bin out of range i32 (got ${args.navBin})`);
  }
  if (
    !Number.isInteger(args.targetBinCount) ||
    args.targetBinCount < 0 ||
    args.targetBinCount > U16_MAX
  ) {
    throw new Error(
      `shift_liquidity: target_bin_count out of range u16 (got ${args.targetBinCount})`,
    );
  }

  const data = Buffer.alloc(8 + 4 + 2);
  Buffer.from(SHIFT_LIQUIDITY_DISCRIMINATOR).copy(data, 0);
  data.writeInt32LE(args.navBin, 8);
  data.writeUInt16LE(args.targetBinCount, 12);

  return new TransactionInstruction({
    programId: args.dexProgramId,
    keys: [
      { pubkey: args.rebalancer, isSigner: true, isWritable: false },
      { pubkey: args.dexConfig, isSigner: false, isWritable: false },
      { pubkey: args.poolState, isSigner: false, isWritable: true },
      { pubkey: args.binArray, isSigner: false, isWritable: true },
    ],
    data,
  });
}
