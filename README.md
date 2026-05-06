# @areal/sdk

Product-specific TypeScript SDK for the Areal Finance protocol.
Wraps `@arlex/client` with typed bindings for the 5 on-chain programs:
native-dex, ownership-token, rwt-engine, yield-distribution, futarchy.

## Status

Pre-publish (v0.1.0). Consumed via `file:../vendor/arlex-client-X.X.X.tgz` from the meta-repo.
Will publish to npmjs after Phase 6 GREEN of `plan/integration-plan.md`.

## Install (within meta-repo)

This package is a git submodule under `areal.newera/sdk`. Clone meta with submodules:

```
git clone --recurse-submodules https://github.com/ArealFinance/areal.git
cd areal/sdk
npm install
npm test
```

The `@arlex/client` peer dep resolves via `file:../vendor/arlex-client-X.X.X.tgz` —
absolute path math depends on `sdk/` being a sibling of `vendor/` in the meta-repo.

## Subpath exports

```ts
import { findLiquidityNexusPda } from '@areal/sdk/pda';
import { LiquidityNexus } from '@areal/sdk/native-dex';
import { CLUSTER_URLS, PROGRAM_IDS } from '@areal/sdk/network';
import { mapAnchorError } from '@areal/sdk/errors';
```

Or aggregator import from root `@areal/sdk` for cross-program usage.

## Layout

- `src/programs/<program>/` — codegen output per program (Accounts, Instructions, Errors, types, idl re-export)
- `src/pda/` — PDA derivation helpers (consolidated from dashboard + bots)
- `src/tx/` — high-level transaction builders (consolidated from bots)
- `src/network/` — program IDs, cluster URLs, well-known addresses
- `src/errors/` — aggregated error code mapper
- `idl/` — 5 Anchor-compatible IDL JSON files
- `overrides/` — pubkey-overrides JSON for codegen

## Codegen

Generated files are checked in (live in `src/programs/<program>/`).
To regenerate after IDL changes:

```
npm run codegen
```

Wrapper script lives in `scripts/codegen.mjs` — invokes `arlex-cli generate-types`
for each IDL with the corresponding override file.
