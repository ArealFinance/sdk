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
  BACKEND_API_BASE_URLS,
  HISTORY_API_BASE_URLS,
  REALTIME_WS_URLS,
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

  // Localnet (Fornex VPS) carries a REAL on-chain RWT mint regenerated
  // by every deploy-fornex.sh validator reset and pinned into the YD
  // contract via the migrate-mints pipeline. The placeholder guard is
  // intentionally orthogonal to localnet so RWT writes against the VPS
  // validator are not blocked.
  it('returns false for the localnet RWT mint (real Fornex VPS mint)', () => {
    expect(isPlaceholderRwtMint(RWT_MINTS.localnet)).toBe(false);
  });

  // Mainnet still carries the placeholder bytes until the production
  // RWT mint is deployed and the YD contract is rebuilt with the new
  // pin. Callers MUST treat a `true` here as "don't submit RWT writes
  // on mainnet yet".
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

describe('BACKEND_API_BASE_URLS', () => {
  it('exposes exactly mainnet | devnet | localnet keys', () => {
    expect(Object.keys(BACKEND_API_BASE_URLS).sort()).toEqual([
      'devnet',
      'localnet',
      'mainnet',
    ]);
  });

  it('mainnet/devnet point at https://api.areal.finance', () => {
    expect(BACKEND_API_BASE_URLS.mainnet).toBe('https://api.areal.finance');
    expect(BACKEND_API_BASE_URLS.devnet).toBe('https://api.areal.finance');
  });

  it('localnet points at the dev backend (port 3010)', () => {
    expect(BACKEND_API_BASE_URLS.localnet).toBe('http://localhost:3010');
  });
});

describe('HISTORY_API_BASE_URLS (deprecated alias)', () => {
  it('is the same reference as BACKEND_API_BASE_URLS (alias, not a copy)', () => {
    expect(HISTORY_API_BASE_URLS).toBe(BACKEND_API_BASE_URLS);
  });

  it('every cluster URL matches the canonical constant', () => {
    for (const cluster of ['mainnet', 'devnet', 'localnet'] as const) {
      expect(HISTORY_API_BASE_URLS[cluster]).toBe(BACKEND_API_BASE_URLS[cluster]);
    }
  });
});

describe('REALTIME_WS_URLS', () => {
  it('exposes exactly mainnet | devnet | localnet keys', () => {
    expect(Object.keys(REALTIME_WS_URLS).sort()).toEqual([
      'devnet',
      'localnet',
      'mainnet',
    ]);
  });

  it('mainnet/devnet use wss:// (TLS) and target the /realtime namespace', () => {
    expect(REALTIME_WS_URLS.mainnet.startsWith('wss://')).toBe(true);
    expect(REALTIME_WS_URLS.devnet.startsWith('wss://')).toBe(true);
    expect(REALTIME_WS_URLS.mainnet.endsWith('/realtime')).toBe(true);
    expect(REALTIME_WS_URLS.devnet.endsWith('/realtime')).toBe(true);
  });

  it('localnet uses bare ws:// against the dev backend (port 3010)', () => {
    expect(REALTIME_WS_URLS.localnet).toBe('ws://localhost:3010/realtime');
  });
});
