// Hand-written constants for native-dex.
//
// These mirror values from `contracts/native-dex/src/constants.rs` that are
// useful to expose as typed public API surface — primarily kill-switch
// sentinels callers may want to pass to admin instructions.

import { PublicKey } from '@solana/web3.js';

/**
 * Rebalancer kill-switch sentinel (zero pubkey).
 *
 * Per CP-12.5, setting `DexConfig.rebalancer` to this value freezes
 * `grow_liquidity` and `compress_liquidity` — no signer can produce a
 * signature for [0u8;32]. Symmetric with the Nexus manager kill-switch.
 * `update_dex_config` permits this value by design (incident-response lever).
 *
 * Source of truth:
 * `contracts/native-dex/src/constants.rs::REBALANCER_KILL_SWITCH`.
 */
export const REBALANCER_KILL_SWITCH: PublicKey = new PublicKey(new Uint8Array(32));

/**
 * Nexus manager kill-switch sentinel (zero pubkey).
 *
 * Per D22, when `LiquidityNexus.manager` equals this value, every
 * manager-gated ix (`nexus_swap`, `nexus_add_liquidity`,
 * `nexus_remove_liquidity`) reverts with `NexusManagerDisabled` via the
 * `assert_manager` helper, regardless of which wallet signed.
 * `update_nexus_manager` intentionally allows setting the manager to this
 * value — that is the on-chain kill-switch.
 *
 * Source of truth:
 * `contracts/native-dex/src/constants.rs::NEXUS_MANAGER_KILL_SWITCH`.
 */
export const NEXUS_MANAGER_KILL_SWITCH: PublicKey = new PublicKey(new Uint8Array(32));
