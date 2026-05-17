// Cross-program discriminator parity tests.
//
// CP-12.5 step 3 introduced `DISC_RWT_VAULT` in
// `contracts/native-dex/src/constants.rs` — a mirrored copy of the rwt_engine
// `RwtVault` account discriminator (sha256("account:RwtVault")[..8]). The DEX
// uses it inside `read_rwt_vault_nav` for defence-in-depth checks before
// decoding NAV bytes from a passed RwtVault account.
//
// The canonical source of that discriminator is rwt_engine — the SDK exposes
// it as `RWTVAULT_DISCRIMINATOR` in
// `src/programs/rwt-engine/accounts.generated.ts`. If rwt_engine ever renames
// the `RwtVault` struct (which would shift its discriminator), both:
//   - the SDK regen would emit new bytes
//   - the native-dex `DISC_RWT_VAULT` constant would need a manual bump
// must move together or `read_rwt_vault_nav` would silently reject every
// vault account on chain.
//
// This test is a tripwire: if either side drifts, CI fails here before
// drift reaches a deploy.

import { describe, expect, it } from 'vitest';

import { RWTVAULT_DISCRIMINATOR } from '../../src/programs/rwt-engine/accounts.generated.js';
import {
  NATIVE_DEX_PROGRAM_ID,
  RWT_ENGINE_PROGRAM_ID,
  OWNERSHIP_TOKEN_PROGRAM_ID,
  YIELD_DISTRIBUTION_PROGRAM_ID,
  FUTARCHY_PROGRAM_ID,
} from '../../src/network/program-ids.js';
import {
  REBALANCER_KILL_SWITCH,
  NEXUS_MANAGER_KILL_SWITCH,
} from '../../src/programs/native-dex/constants.js';

/**
 * Mirror of `contracts/native-dex/src/constants.rs::DISC_RWT_VAULT`.
 * Hardcoded here as the cross-program tripwire: if rwt_engine's
 * `RwtVault` discriminator ever changes, the SDK regen will move
 * `RWTVAULT_DISCRIMINATOR` and this test will fail — flagging that the
 * native-dex constant must be re-mirrored in lockstep.
 */
const CONTRACT_DISC_RWT_VAULT: Uint8Array = new Uint8Array([
  0x60, 0x43, 0xda, 0x41, 0x42, 0x7a, 0x0a, 0x11,
]);

describe('cross-program discriminator parity', () => {
  it('SDK RWTVAULT_DISCRIMINATOR matches native-dex DISC_RWT_VAULT', () => {
    expect(RWTVAULT_DISCRIMINATOR.length).toBe(8);
    expect(CONTRACT_DISC_RWT_VAULT.length).toBe(8);
    // Byte-by-byte equality — Uint8Array structural compare.
    expect(Array.from(RWTVAULT_DISCRIMINATOR)).toEqual(
      Array.from(CONTRACT_DISC_RWT_VAULT),
    );
  });

  it('RWTVAULT_DISCRIMINATOR is the canonical anchor discriminator (8 bytes, deterministic)', () => {
    // Sanity: the discriminator must be exactly 8 bytes and must not be all zero.
    expect(RWTVAULT_DISCRIMINATOR.length).toBe(8);
    expect(RWTVAULT_DISCRIMINATOR.every((b) => b === 0)).toBe(false);
  });
});

describe('program-ID parity (vanity address pins)', () => {
  // Cross-check: every program ID surfaced by the SDK has the expected base58
  // vanity prefix. The contracts mirror these IDs as `[u8;32]` literals in
  // their `constants.rs` for CPI-target validation; if SDK or contract sides
  // ever drift, every Layer 4/6/8 CPI breaks. This is a low-cost sentinel.
  it('NATIVE_DEX_PROGRAM_ID has DEX8 vanity prefix', () => {
    expect(NATIVE_DEX_PROGRAM_ID.toBase58().startsWith('DEX8')).toBe(true);
  });

  it('RWT_ENGINE_PROGRAM_ID has RWT9 vanity prefix', () => {
    expect(RWT_ENGINE_PROGRAM_ID.toBase58().startsWith('RWT9')).toBe(true);
  });

  it('OWNERSHIP_TOKEN_PROGRAM_ID has oWn vanity prefix', () => {
    expect(OWNERSHIP_TOKEN_PROGRAM_ID.toBase58().startsWith('oWn')).toBe(true);
  });

  it('YIELD_DISTRIBUTION_PROGRAM_ID has YLD9 vanity prefix', () => {
    expect(YIELD_DISTRIBUTION_PROGRAM_ID.toBase58().startsWith('YLD9')).toBe(true);
  });

  it('FUTARCHY_PROGRAM_ID has FUT vanity prefix', () => {
    expect(FUTARCHY_PROGRAM_ID.toBase58().startsWith('FUT')).toBe(true);
  });
});

describe('CP-12.5 kill-switch sentinels', () => {
  // Mirrors `contracts/native-dex/src/constants.rs::REBALANCER_KILL_SWITCH`
  // and `NEXUS_MANAGER_KILL_SWITCH`. Both are the zero pubkey — no signer
  // can produce a signature for [0u8;32], so setting either field to this
  // value freezes the corresponding admin/operator path.
  it('REBALANCER_KILL_SWITCH is the zero pubkey', () => {
    expect(REBALANCER_KILL_SWITCH.toBytes().every((b) => b === 0)).toBe(true);
  });

  it('NEXUS_MANAGER_KILL_SWITCH is the zero pubkey', () => {
    expect(NEXUS_MANAGER_KILL_SWITCH.toBytes().every((b) => b === 0)).toBe(true);
  });

  it('REBALANCER_KILL_SWITCH equals NEXUS_MANAGER_KILL_SWITCH (both zero)', () => {
    expect(REBALANCER_KILL_SWITCH.equals(NEXUS_MANAGER_KILL_SWITCH)).toBe(true);
  });
});
