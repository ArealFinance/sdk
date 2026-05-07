// Unit tests for `sdk/src/network/constants.ts` — RWT_MINTS table and
// the `isPlaceholderRwtMint` guard helper.
//
// The RWT mint is pinned at compile time inside the Yield Distribution
// program (`contracts/yield-distribution/src/constants.rs::RWT_MINT`). On
// devnet/localnet that pin is the R20 placeholder bytes `"RWT" + 28*0x00
// + 0x01`. Mainnet keeps the same bytes until the production mint is
// deployed; until then `isPlaceholderRwtMint(mainnet)` MUST return true so
// callers don't accidentally submit claims against a non-existent mint.

import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';

import {
  RWT_MINTS,
  USDC_MINTS,
  isPlaceholderRwtMint,
} from '../../src/network/constants.js';

describe('RWT_MINTS', () => {
  it('exposes exactly mainnet | devnet | localnet keys', () => {
    expect(Object.keys(RWT_MINTS).sort()).toEqual([
      'devnet',
      'localnet',
      'mainnet',
    ]);
  });

  it('every value is a PublicKey instance', () => {
    for (const cluster of ['mainnet', 'devnet', 'localnet'] as const) {
      expect(RWT_MINTS[cluster]).toBeInstanceOf(PublicKey);
    }
  });

  it('mirrors the USDC_MINTS table shape (same key set)', () => {
    expect(Object.keys(RWT_MINTS).sort()).toEqual(
      Object.keys(USDC_MINTS).sort(),
    );
  });
});

describe('isPlaceholderRwtMint', () => {
  it('returns true for the devnet RWT mint (placeholder bytes)', () => {
    expect(isPlaceholderRwtMint(RWT_MINTS.devnet)).toBe(true);
  });

  it('returns true for the localnet RWT mint (same placeholder)', () => {
    expect(isPlaceholderRwtMint(RWT_MINTS.localnet)).toBe(true);
  });

  // EXPECTATION: mainnet still carries the same placeholder bytes as
  // devnet/localnet until the production RWT mint is deployed and the
  // YD contract is rebuilt with the new pin. Callers MUST treat a
  // `true` here as "don't submit RWT writes on mainnet yet".
  it('returns true for mainnet today (RWT not yet deployed)', () => {
    expect(isPlaceholderRwtMint(RWT_MINTS.mainnet)).toBe(true);
  });

  it('returns false for an unrelated mint (e.g. USDC mainnet)', () => {
    expect(isPlaceholderRwtMint(USDC_MINTS.mainnet)).toBe(false);
  });

  it('returns false for an arbitrary fresh PublicKey', () => {
    const random = new PublicKey(
      'So11111111111111111111111111111111111111112', // wSOL
    );
    expect(isPlaceholderRwtMint(random)).toBe(false);
  });
});
