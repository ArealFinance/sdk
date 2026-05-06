// Compute Anchor-compatible 8-byte instruction discriminators on demand.
//
// The codegen output (`instructions.generated.ts`) contains pre-baked
// discriminators for every IDL-declared instruction. Some Areal CPI wrapper
// instructions (`claim_yield`, `compound_yield`, `claim_yd_for_treasury`)
// are not declared in their host program's IDL — they exist only as
// CPI entrypoints called by the YD claim crank. For those we mirror the
// bot's approach and compute `sha256("global:<name>")[..8]` once per name.

import { createHash } from 'node:crypto';

const cache = new Map<string, Buffer>();

/**
 * Return the 8-byte Anchor instruction discriminator for `<global:name>`.
 * Cached per name — the digest is pure and identical across calls.
 */
export function ixDiscriminator(name: string): Buffer {
  let buf = cache.get(name);
  if (!buf) {
    buf = createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
    cache.set(name, buf);
  }
  return buf;
}

/**
 * Encode the YD claim args body shared across all 3 wrapper instructions:
 *   [cumulative_amount(u64 LE) | proof_len(u32 LE) | proof_bytes(32*N)]
 *
 * Each wrapper prepends its own discriminator before this body.
 */
export function encodeClaimArgsBody(
  cumulativeAmount: bigint,
  proofNodes: Buffer[],
): Buffer {
  const buf = Buffer.alloc(8 + 4 + 32 * proofNodes.length);
  buf.writeBigUInt64LE(cumulativeAmount, 0);
  buf.writeUInt32LE(proofNodes.length, 8);
  let off = 12;
  for (const node of proofNodes) {
    if (node.length !== 32) {
      throw new Error(`proof node has length ${node.length}, expected 32`);
    }
    node.copy(buf, off);
    off += 32;
  }
  return buf;
}
