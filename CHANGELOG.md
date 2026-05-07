# Changelog

## 0.2.0 — 2026-05-07

- **feat(portfolio)**: add portfolio composite reads (`getHolderPortfolio`,
  `enumerateOtConfigs`, `fetchMerkleProof`). Adds `bs58` runtime
  dependency. Subpath: `@areal/sdk/portfolio`.

  The composite reader enumerates every OT, then per-OT fetches the
  holder's ATA balance, the MerkleDistributor existence, the on-chain
  ClaimStatus and (optionally) the latest Merkle proof from a
  proof-store. `claimableNow` is clamped to `>= 0n`; `slot` is captured
  AFTER all reads so a later WS event can be used as an upper bound for
  staleness.

## 0.1.2 — 2026-05-06

- **fix(packaging)**: stop relying on the ambient `Buffer` global. Every
  source file that uses `Buffer` now does an explicit
  `import { Buffer } from 'buffer'`. Without this, a downstream Vite
  consumer using `vite-plugin-node-polyfills` (e.g. the dashboard) would
  inject `import 'vite-plugin-node-polyfills/shims/buffer'` into the SDK's
  `dist/*.mjs` at build time, producing:

      Rollup failed to resolve import 'vite-plugin-node-polyfills/shims/buffer'
      from sdk/dist/pda/index.mjs

  The polyfill's `@rollup/plugin-inject` step rewrote bare `Buffer`
  references inside the SDK; with an explicit import in scope the rewrite
  no longer fires, and `'buffer'` resolves either to the consumer's
  polyfill or the Node built-in. No runtime API change.

  Files touched: 11 hand-written (`src/pda/*.ts`, `src/tx/**/*.ts`,
  `src/tx/_internal/discriminator.ts`) + 10 auto-generated
  (`src/programs/*/instructions.generated.ts`,
  `src/programs/*/accounts.generated.ts`). The codegen template in
  `@arlex/client` should be updated to emit the same import so the
  next codegen run does not regress this fix.

## 0.1.1 — 2026-05-06

- **fix(packaging)**: align tsup output extensions with package.json exports map.
  `dist/` now emits `.mjs` for ESM and `.cjs` for CJS (was `.js` for ESM, `.cjs` for CJS),
  matching the `import`/`require` conditions in `exports`.

  Without this, subpath imports like `import { findX } from '@areal/sdk/pda'`
  failed with `ERR_MODULE_NOT_FOUND`. No runtime API change.

  Also updated `main` in `package.json` from `./dist/index.js` to `./dist/index.cjs`
  and the `require` conditions in `exports` from `./dist/<sub>/index.js` to
  `./dist/<sub>/index.cjs` so the CJS entry points resolve to the actual emitted files.

## 0.1.0 — 2026-05-06

- Initial Phase 3 release: per-program subpath exports, 21 PDA helpers,
  6 tx builders, codegen output for 5 Areal programs, 65 tests.
