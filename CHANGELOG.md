# Changelog

## 0.4.0 — 2026-05-07

- **feat(tx/native-dex)**: add `buildSwapIx` and `buildSwapTx` for the
  user-facing `native-dex::swap` flow (Phase 8). The pure builder emits
  the 9-account ix in `swap_internal` order, optionally appending
  `ot_treasury_fee_destination` at remaining_accounts[0] when the pool
  has an OT treasury, with wire encoding delegated to codegen
  `encodeSwapArgs`. The convenience helper applies the mainnet RWT
  placeholder guard, optionally prepends a
  `createAssociatedTokenAccountIdempotent` ix when the user's output ATA
  does not yet exist, and returns a legacy `Transaction`. Distinct from
  the Layer 9 manager-only `nexus_swap` builder.

- **feat(programs/native-dex)**: add `quoteSwap` pure helper mirroring
  `contracts/native-dex/src/{instructions/swap.rs::swap_internal,amm.rs}`
  for StandardCurve pools. Returns a discriminated union with the same
  error tags as `DexError` (`PoolPaused`, `PoolNotActive`, `ZeroAmount`,
  `EmptyReserves`, `ZeroOutput`, `MathOverflow`) and a `QuoteResult`
  carrying `amountOut`, `netInput`, fee breakdown (with the on-chain
  1-lamport dust floor and protocol-takes-remainder rounding), signed
  `priceImpactBps`, and pre/post reserves. All math runs in `bigint` —
  no intermediate `Number` coercion. Add `applySlippage` helper bounded
  to `[0, 5000]` bps.

## 0.3.0 — 2026-05-07

- **feat(tx/yield-distribution)**: add `buildClaimDistributionIx` and
  `buildClaimTx` for the holder-facing claim flow. The pure builder
  emits the 10-account `yield_distribution::claim` instruction with wire
  encoding delegated to codegen `encodeClaimArgs` (single source of
  truth for the snake/camel remap and nested `vec<[u8; 32]>` layout).
  The convenience helper decodes hex proof nodes, derives YD config /
  distributor / claim_status / claimant ATA PDAs, optionally prepends a
  create-ATA-idempotent ix when the holder's RWT ATA does not yet exist,
  and returns a legacy `Transaction`. Both reject `proof.length > 20`
  (`MAX_PROOF_LEN`) and any node that is not exactly 32 bytes.

- **feat(network)**: add `RWT_MINTS` cluster table mirroring
  `USDC_MINTS`, plus `isPlaceholderRwtMint` guard. Devnet/localnet pin
  the R20 placeholder bytes (`"RWT" + 28*0x00 + 0x01`) baked into the
  on-chain Yield Distribution program. Mainnet uses the same placeholder
  until the production RWT mint is deployed; consumers MUST refuse to
  submit RWT writes on mainnet while the guard returns true.

- **deps**: add `@solana/spl-token ^0.4.14` runtime dependency for
  `createAssociatedTokenAccountIdempotentInstruction`. Externalised in
  `tsup.config.ts` so consumer bundlers do not duplicate it.

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
