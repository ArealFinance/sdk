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
 * USDC mint per cluster. Localnet reuses the devnet mint by convention so
 * tests and bots can share fixtures across the two environments.
 */
export const USDC_MINTS: Record<ClusterName, PublicKey> = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  localnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

/**
 * RWT mint per cluster.
 *
 * The RWT mint is pinned at compile time inside the Yield Distribution
 * program (see `contracts/yield-distribution/src/constants.rs::RWT_MINT`).
 * Devnet and localnet builds carry the R20 placeholder bytes
 * `"RWT" + 28 * 0x00 + 0x01`, which base58-encode to the address below.
 *
 * Mainnet still uses the same placeholder until the production RWT mint
 * is deployed and the contract is rebuilt. SDK consumers MUST guard
 * mainnet writes with `isPlaceholderRwtMint` until that happens.
 */
export const RWT_MINTS: Record<ClusterName, PublicKey> = {
  // PLACEHOLDER — replaced at mainnet deploy. Same bytes as devnet/localnet
  // until the production RWT mint exists; `isPlaceholderRwtMint` flags this.
  mainnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
  devnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
  localnet: new PublicKey('6YRfYtkZmqWgz8N3MDeqJRc4vSiJ5VGgiMv4ihYzJyY4'),
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
 */
export function isPlaceholderRwtMint(pk: PublicKey): boolean {
  return pk.toBase58() === RWT_PLACEHOLDER_BASE58;
}
