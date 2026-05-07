// Localnet smoke test for `getHolderPortfolio`.
//
// This is opt-in: when no validator is reachable on the default localnet
// URL we degrade to "skipped" rather than fail, matching the policy in
// `helpers/validator.ts`. The structural assertions below run only when a
// validator is up.
//
// Single scenario: a brand-new keypair has no portfolio activity, so every
// row's balance must be 0n and the snapshot's `holder` must round-trip the
// keypair's PublicKey. The OT program may not be deployed on localnet —
// rows may simply be empty, which is also a valid passing outcome.

import { beforeAll, describe, expect, it } from 'vitest';
import { Connection, Keypair } from '@solana/web3.js';

import { isValidatorReachable } from './helpers/validator.js';
import { getHolderPortfolio } from '../../src/portfolio/snapshot.js';
import { CLUSTER_URLS } from '../../src/network/clusters.js';
import {
  OWNERSHIP_TOKEN_PROGRAM_ID,
  YIELD_DISTRIBUTION_PROGRAM_ID,
} from '../../src/network/program-ids.js';

let validatorUp = false;
beforeAll(async () => {
  validatorUp = await isValidatorReachable();
  if (!validatorUp) {
    // eslint-disable-next-line no-console
    console.warn(
      `[portfolio-read E2E] localnet validator at ${CLUSTER_URLS.localnet} not reachable — skipping on-chain assertions`,
    );
  }
});

describe('getHolderPortfolio — localnet smoke', () => {
  it.runIf(validatorUp)('fresh keypair → empty/zero portfolio', async () => {
    const conn = new Connection(CLUSTER_URLS.localnet, 'confirmed');
    const holder = Keypair.generate().publicKey;

    const snap = await getHolderPortfolio(conn, holder, {
      ownershipTokenProgramId: OWNERSHIP_TOKEN_PROGRAM_ID,
      yieldDistributionProgramId: YIELD_DISTRIBUTION_PROGRAM_ID,
      // No proof store — cumulativeAmount/claimableNow expected to be null.
    });

    expect(snap.holder.equals(holder)).toBe(true);
    expect(snap.slot).toBeGreaterThan(0);
    expect(typeof snap.fetchedAt).toBe('number');

    // Whether the OT program is deployed or not, every row must reflect a
    // brand-new wallet: no balance, no claim history.
    for (const row of snap.rows) {
      expect(row.balance).toBe(0n);
      expect(row.claimedAmount).toBe(0n);
    }
  });

  it.skipIf(validatorUp)('skipped because validator unreachable', () => {
    expect(true).toBe(true);
  });
});
