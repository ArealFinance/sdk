// Unit tests for `sdk/src/markets/master-pool.ts`.
//
// `isMasterPool` is the UI-only guard for "is this pair one of the two
// canonical master pools (RWT/USDC, RWT/USDY)?" — orientation-agnostic
// and cluster-aware. The contract has no concept of master pools, so
// these tests are pure pubkey-comparison and do not need fixtures
// beyond the mint tables.

import { describe, expect, it } from 'vitest';
import { Keypair } from '@solana/web3.js';

import { isMasterPool } from '../../src/markets/master-pool.js';
import { RWT_MINTS, USDC_MINTS, USDY_MINTS } from '../../src/network/constants.js';

describe('isMasterPool', () => {
  it('RWT/USDC (A=RWT, B=USDC) → true', () => {
    expect(isMasterPool(RWT_MINTS.localnet, USDC_MINTS.localnet, 'localnet')).toBe(
      true,
    );
  });

  it('RWT/USDC (A=USDC, B=RWT) → true (orientation-agnostic)', () => {
    expect(isMasterPool(USDC_MINTS.localnet, RWT_MINTS.localnet, 'localnet')).toBe(
      true,
    );
  });

  it('RWT/USDY → true', () => {
    expect(isMasterPool(RWT_MINTS.localnet, USDY_MINTS.localnet, 'localnet')).toBe(
      true,
    );
  });

  it('RWT/USDY (reversed) → true', () => {
    expect(isMasterPool(USDY_MINTS.localnet, RWT_MINTS.localnet, 'localnet')).toBe(
      true,
    );
  });

  it('USDC/USDY → false (no RWT side)', () => {
    expect(
      isMasterPool(USDC_MINTS.localnet, USDY_MINTS.localnet, 'localnet'),
    ).toBe(false);
  });

  it('arbitrary pair → false', () => {
    const a = Keypair.generate().publicKey;
    const b = Keypair.generate().publicKey;
    expect(isMasterPool(a, b, 'localnet')).toBe(false);
  });

  it('RWT vs unrelated token → false', () => {
    const random = Keypair.generate().publicKey;
    expect(isMasterPool(RWT_MINTS.localnet, random, 'localnet')).toBe(false);
  });

  it('matches per-cluster RWT mint (mainnet)', () => {
    expect(isMasterPool(RWT_MINTS.mainnet, USDC_MINTS.mainnet, 'mainnet')).toBe(
      true,
    );
  });

  it('matches per-cluster RWT mint (devnet)', () => {
    expect(isMasterPool(RWT_MINTS.devnet, USDC_MINTS.devnet, 'devnet')).toBe(
      true,
    );
  });
});
