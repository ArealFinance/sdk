# Changelog

## 0.8.0 — 2026-05-08

- **feat(events)**: add `@areal/sdk/events` subpath exposing decoders for
  all 60 Areal program events (yield-distribution=13, native-dex=20,
  ownership-token=8, rwt-engine=11, futarchy=8). Events are decoded
  dynamically from per-program IDL field literals (no codegen
  changes — codegen still does not emit event bindings as of Phase 12.1).
  Per-program registries `YIELD_DISTRIBUTION_EVENTS`, `NATIVE_DEX_EVENTS`,
  `OWNERSHIP_TOKEN_EVENTS`, `RWT_ENGINE_EVENTS`, `FUTARCHY_EVENTS` provide
  `byName` and `byDiscriminator` lookups; the unified `decodeEvent` and
  `decodeTransactionEvents` dispatchers pick the right registry by program
  ID and walk the `invoke`/`success` log stack to attribute events to the
  emitting program even across nested CPIs. Decoders never throw —
  unknown discriminators, malformed base64, foreign program IDs, and
  truncated payloads all return `null` for safe consumption inside
  high-volume indexers. Top-N events used by the Phase 6 portfolio claim
  flow + indexer ship typed wrappers (`RewardsClaimed`, `RootPublished`,
  `DistributorFunded`, `StreamConverted`, `SwapExecuted`,
  `LiquidityAdded`, `LiquidityRemoved`, `ZapLiquidityExecuted`,
  `OtMinted`, `RevenueDistributed`, `RwtMinted`); the remaining 49 events
  decode to `Record<string, unknown>` with camelCase keys and `[u8;32]`
  fields wrapped as `PublicKey`. Typed wrappers for the long tail are
  deferred until a consumer demands them — generic codegen-emitted event
  bindings tracked as a separate framework PR against `@arlex/client`.

## 0.7.0 — 2026-05-07

- **feat(tx/native-dex)**: add four user-signed LP tx-builders for
  Phase 11 — `buildAddLiquidityIx` / `buildAddLiquidityTx`,
  `buildZapLiquidityIx` / `buildZapLiquidityTx`,
  `buildRemoveLiquidityIx` / `buildRemoveLiquidityTx`, and
  `buildClaimLpFeesIx` / `buildClaimLpFeesTx`. Each pure builder emits
  the contract handler's exact account list (11 / 12 / 8 / 8 keys
  respectively) with wire encoding delegated to the codegen
  `encode*Args` helpers — no hand-rolled discriminators or arg buffers.
  Convenience `buildXxxTx` helpers apply the mainnet RWT placeholder
  guard (Add/Zap only — Remove/Claim must always work to let LPs exit),
  optionally prepend `createAssociatedTokenAccountIdempotent` ix(s) when
  provider/recipient ATAs are missing, and append the optional OT
  treasury fee destination on `zap_liquidity` when the pool's
  `has_ot_treasury` flag implies it. SDK rejects boundary-violating
  amounts (`amount_a == 0`, `> u64::MAX`, `min_shares > u128::MAX`,
  `shares_to_burn == 0`) at the call site mirroring the contract's
  `ZeroAmount` / `InsufficientLpShares` checks. Concentrated-pool
  BinArray remaining_accounts on `remove_liquidity` are deferred to a
  future phase (Phase 11 scope = constant-product pools only).

- **feat(programs/native-dex)**: add `applySlippageU128` companion to
  `applySlippage` for use against LP-share quotes (`add_liquidity` /
  `zap_liquidity` `min_shares` is u128, not u64). Same arithmetic;
  skips the u64 boundary check and widens the slippage range to
  `[0, 10000]` bps so callers can opt in to `min_shares == 0` for
  first-deposit semantics.

- **feat(markets)**: add `isMasterPool` UI-only guard — orientation- and
  cluster-agnostic match for the two canonical master pools (RWT/USDC,
  RWT/USDY). The contract has no concept of master pools today; SDK
  consumers MUST NOT rely on this helper as a security boundary
  (R-PHASE-11-1).

- **feat(network)**: add `USDY_MINTS` placeholder table (per-cluster
  bytes mirroring the RWT placeholder pattern). The production Ondo
  USDY mint is not yet wired to any cluster; the bytes carry the ASCII
  prefix `"USDY"` so the master-pool guard can match them while
  remaining trivially distinguishable from any real mint.

## 0.6.0 — 2026-05-07

- **feat(tx/rwt-engine)**: add `buildMintRwtIx` and `buildMintRwtTx` for
  the user-facing `rwt-engine::mint_rwt` flow (Phase 10). The pure
  builder emits the 8-account ix in `mint_rwt::handler` order
  (NO system_program — the contract does not allocate accounts on this
  path), with wire encoding delegated to codegen `encodeMintRwtArgs`.
  The convenience helper applies the mainnet RWT placeholder guard,
  optionally prepends a `createAssociatedTokenAccountIdempotent` ix when
  the user's RWT ATA does not yet exist, and returns a legacy
  `Transaction`. SDK rejects `min_rwt_out == 0` at the boundary mirroring
  the contract's `ZeroSlippage` check.

- **feat(programs/rwt-engine)**: add `quoteMintRwt` pure helper mirroring
  `contracts/rwt-engine/src/{instructions/mint_rwt.rs,nav.rs}`. Returns
  a discriminated union with the same error tags as `RwtError`
  (`MintPaused`, `ZeroAmount`, `BelowMinMint`, `ZeroRwtOutput`,
  `MathOverflow`) and a `MintQuoteResult` carrying `rwtOut`, `netDeposit`,
  fee breakdown (with the on-chain remainder pattern — vault gets the
  odd-cent rounding), the NAV used to price the mint, and the post-mint
  vault projection (`capitalAfter`/`supplyAfter`/`navAfter`) for UI
  display. NAV calculation mirrors the contract's clamp-to-1 guard for
  capital/supply truncation. All math runs in `bigint` — no intermediate
  `Number` coercion. Re-exports `applySlippage` as `applyMintSlippage`.

## 0.5.0 — 2026-05-07

- **feat(markets)**: add `@areal/sdk/markets` subpath — composite reader
  for the markets list + detail pages. Exposes `getMarketsSnapshot`
  (token rows with USDC pricing + RWT NAV, pool rows with USDC TVL),
  `enumeratePools` (`getProgramAccounts` + 252-byte / discriminator
  filter mirroring `enumerateOtConfigs`), `chainPriceToUsdc` (resolves
  prices via direct-USDC pool first, then `token → RWT → USDC` chain),
  `poolTvlUsdc` (TVL with `'exact'` / `'mirrored'` precision hint), and
  `computeDepth` (10-bucket depth ladder per side via the existing pure
  `quoteSwap`). Top-level reads run through `Promise.allSettled` so a
  missing program degrades gracefully; `slot` is captured AFTER all
  reads to preserve the WS-staleness ordering contract used by the
  portfolio reader. Concentrated pools yield empty depth ladders (no
  BinArray walk available off-chain). Subpath-only export — NOT added
  to the flat `@areal/sdk` aggregator.

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
