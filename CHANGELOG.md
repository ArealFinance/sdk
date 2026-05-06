# Changelog

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
