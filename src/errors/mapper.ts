// Aggregated error mapper across the 5 Areal programs.
//
// Given a Solana RPC error or a raw error code + the program ID that
// produced it, returns a structured `MappedAnchorError` with the program
// label, numeric code, error name and human-readable message. Returns
// `null` when:
//   - the input has no recognizable program error code (network error,
//     simulation error before any program ran, etc.)
//   - the program ID is not one of the 5 Areal programs
//   - the program ID is recognized but the code is not in its IDL

import type { PublicKey } from '@solana/web3.js';
import { extractErrorCode, type IdlError } from '@arlex/client';

// Cluster-aware registry: the lookup table below is built by walking ALL
// clusters in `PROGRAM_IDS_BY_CLUSTER` so a devnet program-ID in an incoming
// error resolves to the same IDL error array as the mainnet one. Each
// program's `*Errors` table is shared across clusters — only the program-ID
// changes per-cluster.
import {
  PROGRAM_IDS_BY_CLUSTER,
  type ProgramName,
} from '../network/program-ids.js';
import type { ClusterName } from '../network/clusters.js';
import {
  FutarchyErrors,
  NativeDexErrors,
  OwnershipTokenErrors,
  RwtEngineErrors,
  YieldDistributionErrors,
} from './error-codes.js';

/** Result of a successful error decode. */
export interface MappedAnchorError {
  /** Logical program name (`'nativeDex'`, `'rwtEngine'`, ...). */
  program: ProgramName;
  /** Numeric error code as emitted on-chain. */
  code: number;
  /** Anchor-style error name (e.g., `Unauthorized`). */
  name: string;
  /** IDL-supplied human-readable message. */
  message: string;
}

/**
 * Lookup table: program ID (base58) → IDL error array.
 *
 * Built once at module load by iterating over every cluster in
 * `PROGRAM_IDS_BY_CLUSTER` so mainnet AND devnet (and localnet) program IDs
 * all resolve to the same per-program error table. Programs whose IDL
 * declares zero errors are still registered with an empty array so the
 * mapper can distinguish "unknown program" from "known program, unknown
 * code".
 */
const PROGRAM_ERROR_REGISTRY: ReadonlyMap<
  string,
  { name: ProgramName; errors: IdlError[] }
> = (() => {
  const entries: Array<[string, { name: ProgramName; errors: IdlError[] }]> = [];
  for (const cluster of Object.keys(PROGRAM_IDS_BY_CLUSTER) as ClusterName[]) {
    const ids = PROGRAM_IDS_BY_CLUSTER[cluster];
    entries.push(
      [ids.nativeDex.toBase58(), { name: 'nativeDex' as ProgramName, errors: NativeDexErrors }],
      [
        ids.ownershipToken.toBase58(),
        { name: 'ownershipToken' as ProgramName, errors: OwnershipTokenErrors },
      ],
      [ids.rwtEngine.toBase58(), { name: 'rwtEngine' as ProgramName, errors: RwtEngineErrors }],
      [
        ids.yieldDistribution.toBase58(),
        { name: 'yieldDistribution' as ProgramName, errors: YieldDistributionErrors },
      ],
      [ids.futarchy.toBase58(), { name: 'futarchy' as ProgramName, errors: FutarchyErrors }],
    );
  }
  // Map() naturally dedupes by key — clusters that share pubkeys (e.g.
  // mainnet/localnet) collapse into a single entry, last-write-wins.
  return new Map(entries);
})();

/**
 * Decode an error against the program that emitted it.
 *
 * `err` may be:
 *   - a raw numeric code (the on-chain `Custom(...)` value), OR
 *   - any object — the function delegates to `@arlex/client`'s
 *     `extractErrorCode` to pull the code out
 *
 * Returns `null` when the input doesn't carry a recognizable code, when
 * `programId` is not one of the 5 Areal programs, or when the code is not
 * declared in the program's IDL.
 */
export function mapAnchorError(
  err: unknown,
  programId: PublicKey,
): MappedAnchorError | null {
  const code = typeof err === 'number' ? err : extractErrorCode(err);
  if (code === null) return null;

  const entry = PROGRAM_ERROR_REGISTRY.get(programId.toBase58());
  if (!entry) return null;

  const idlError = entry.errors.find(e => e.code === code);
  if (!idlError) return null;

  return {
    program: entry.name,
    code,
    name: idlError.name,
    message: idlError.msg,
  };
}
