// Well-known cross-program addresses used by tx builders and PDA helpers.
//
// Keep these as PublicKey instances (not strings) so callers can pass them
// straight into `TransactionInstruction.keys` without re-wrapping.

import { PublicKey } from '@solana/web3.js';
import type { ClusterName } from './clusters.js';

/** SPL Token v1 program ID. Used by every CPI that touches token accounts. */
export const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

/** SPL Associated Token Account program ID. */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

/** System program ID — `11111111111111111111111111111111`. */
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

/**
 * USDC mint per cluster.
 *
 * Mainnet is the canonical Circle USDC. Devnet uses the official devnet
 * faucet USDC. Localnet points at the Fornex-hosted test-validator's
 * runtime USDC test mint — a random keypair regenerated whenever
 * `scripts/deploy-fornex.sh` resets validator state (see Phase 2 spec).
 *
 * When the VPS validator is re-bootstrapped the mint pubkey changes. The
 * canonical value lives in `data/e2e-bootstrap.json::mints.usdc_test_mint`
 * (pulled from the VPS by deploy-fornex.sh step 8a.1). Run
 * `scripts/sync-sdk-localnet-mints.sh` to re-pin this constant after a
 * VPS reset; deploy-fornex.sh prints a warning when the SDK and the VPS
 * artifact diverge.
 */
export const USDC_MINTS: Record<ClusterName, PublicKey> = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  localnet: new PublicKey('T5ZgdZfMqjcFFZwK1Wg9YYQFiziCZAXJTinFuLJr2GK'),
};

/**
 * RWT mint per cluster.
 *
 * Pinned at compile time in the Yield Distribution program (see
 * `contracts/yield-distribution/src/constants.rs::RWT_MINT`).
 *
 * - `mainnet` / `devnet` carry the R20 placeholder bytes
 *   `"RWT" + 28 * 0x00 + 0x01` (base58 below). Not yet a real on-chain
 *   mint; mainnet writes MUST be guarded with `isPlaceholderRwtMint`
 *   until the production mint is deployed and the contract rebuilt.
 * - `localnet` is the Fornex VPS test-validator's RUNTIME RWT mint, a
 *   random keypair regenerated whenever `scripts/deploy-fornex.sh`
 *   resets validator state (Phase 2 spec; bootstrap-init.ts phase-c
 *   retries `Keypair.generate()` until canonical `rwt < usdc` byte
 *   ordering holds). The migrate-mints pipeline rewrites
 *   `yield-distribution/src/constants.rs` to bake these bytes into the
 *   .so before the VPS deploy, so the on-chain `RWT_MINT` matches.
 *
 * Re-pin via `scripts/sync-sdk-localnet-mints.sh` after each VPS reset;
 * deploy-fornex.sh warns when this constant drifts from
 * `data/e2e-bootstrap.json::mints.rwt_mint`.
 */
export const RWT_MINTS: Record<ClusterName, PublicKey> = {
  mainnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
  devnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
  localnet: new PublicKey('RSuvkud2x4aj23fvhhF234E3BF3KpKeNaFyRfn28oaY'),
};

/**
 * USDY mint per cluster.
 *
 * PLACEHOLDER — the production Ondo USDY mint has not yet been wired to
 * Areal across any cluster. The bytes below carry the ASCII prefix
 * `"USDY"` followed by zero-padding (mirroring the RWT placeholder
 * pattern) so that a master-pool guard can match against them by
 * orientation while still being distinguishable from any real mint
 * address. Replace the per-cluster bytes when the mint is announced and
 * delete this comment in the same PR.
 *
 * Used today only by `markets/master-pool.ts::isMasterPool` as a UI-only
 * guard. SDK consumers MUST NOT submit transactions that touch this mint
 * on mainnet — there is no on-chain mint behind it.
 */
export const USDY_MINTS: Record<ClusterName, PublicKey> = {
  // PLACEHOLDER — same bytes across all clusters until the production
  // USDY mint is announced. Decodes from the ASCII prefix `"USDY"` plus
  // 27 zero bytes plus a 0x01 tail.
  mainnet: new PublicKey('6k5JAvDt4bWSRrow6izQckf6skDRSJdJxtZgUWGDeJun'),
  devnet: new PublicKey('6k5JAvDt4bWSRrow6izQckf6skDRSJdJxtZgUWGDeJun'),
  localnet: new PublicKey('6k5JAvDt4bWSRrow6izQckf6skDRSJdJxtZgUWGDeJun'),
};

/**
 * Base URL of the Areal backend REST API per cluster — used by both
 * `@areal/sdk/history` (`/transactions/*`, `/portfolio/*`) and
 * `@areal/sdk/markets-rest` (`/markets/*`). A single backend deployment
 * serves all REST subpaths today.
 *
 * The backend is cluster-aware via its own configuration: a single
 * deployment serves both mainnet and devnet reads (the indexer keys data
 * by chain), so devnet and mainnet point at the same hostname today. If
 * cluster-specific deployments are introduced later, only this table
 * needs to change — no SDK consumer code references the URL directly.
 *
 * Localnet points at the developer's Nest backend (`PORT=3010`).
 */
export const BACKEND_API_BASE_URLS: Record<ClusterName, string> = {
  mainnet: 'https://api.areal.finance',
  devnet: 'https://api.areal.finance',
  localnet: 'http://localhost:3010',
};

/**
 * @deprecated Use `BACKEND_API_BASE_URLS`. Removed in next major bump.
 *
 * Phase 12.2.1 originally introduced this constant for `@areal/sdk/history`
 * only; Phase 12.3.2 added `@areal/sdk/markets-rest` reusing the same
 * URLs, making the `HISTORY_` prefix misleading. Kept as an alias for
 * semver-minor backward compatibility.
 */
export const HISTORY_API_BASE_URLS = BACKEND_API_BASE_URLS;

/**
 * WebSocket URL of the Areal realtime gateway (Phase 12.3.1, namespace
 * `/realtime`) per cluster. Sibling to `BACKEND_API_BASE_URLS` and pinned
 * to the same hostname today (single backend deployment serves both REST
 * and WS surfaces).
 *
 * Mainnet/devnet use `wss://` (TLS-terminated by Cloudflared); localnet
 * uses bare `ws://` against the developer's Nest backend (`PORT=3010`).
 *
 * Note: the `/realtime` suffix is the Socket.IO **namespace**, not a path
 * on the HTTP server. Socket.IO's connect handshake mounts on the host's
 * default WS path (`/socket.io/`) and the namespace is selected from this
 * URL fragment by the client.
 */
export const REALTIME_WS_URLS: Record<ClusterName, string> = {
  mainnet: 'wss://api.areal.finance/realtime',
  devnet: 'wss://api.areal.finance/realtime',
  localnet: 'ws://localhost:3010/realtime',
};

/**
 * Base58 of the on-chain `RWT_MINT` R20 placeholder bytes. Anything that
 * matches this address is the devnet/localnet placeholder, NOT a real
 * mainnet RWT mint — see `isPlaceholderRwtMint`.
 */
const RWT_PLACEHOLDER_BASE58 = '6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4';

/**
 * Returns true when `pk` matches the R20 placeholder bytes pinned in the
 * Yield Distribution program. SDK consumers SHOULD check this before
 * submitting any RWT-touching transaction on mainnet — submitting a claim
 * against the placeholder mint will revert on-chain (the contract verifies
 * `claimant_token.mint == RWT_MINT`).
 *
 * Localnet (Fornex VPS) no longer carries the placeholder bytes: its RWT
 * mint is a real on-chain mint regenerated by every Phase 2
 * `deploy-fornex.sh` reset, and the migrate-mints pipeline rewrites the
 * YD contract's `RWT_MINT` pin to match. So this guard returns `false`
 * for `RWT_MINTS.localnet` by design — localnet RWT writes are intentional
 * and supported. The guard's sole purpose is to block mainnet/devnet
 * writes against the still-unfilled placeholder slot.
 */
export function isPlaceholderRwtMint(pk: PublicKey): boolean {
  return pk.toBase58() === RWT_PLACEHOLDER_BASE58;
}
