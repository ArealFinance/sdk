// Reachability probe for a local Solana validator.
//
// Used by smoke E2E tests to skip on-chain assertions when no validator is
// running — `solana-test-validator` may not be available in CI or short
// developer loops, and the smoke tests should still degrade to "structural
// checks only" rather than failing.

import { Connection } from '@solana/web3.js';

import { CLUSTER_URLS } from '../../../src/network/clusters.js';

/**
 * Return `true` if a Solana RPC at `rpcUrl` answers `getHealth` within
 * `timeoutMs`. Default URL is the localnet validator and default timeout
 * is 1 second — fast enough not to slow down developer loops.
 */
export async function isValidatorReachable(
  rpcUrl: string = CLUSTER_URLS.localnet,
  timeoutMs = 1000,
): Promise<boolean> {
  try {
    const conn = new Connection(rpcUrl, 'confirmed');
    const result = await Promise.race([
      conn.getVersion().catch(() => null),
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return result !== null;
  } catch {
    return false;
  }
}
