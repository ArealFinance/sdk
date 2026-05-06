# Pubkey overrides

The default heuristic in `arlex-cli generate-types` classifies `[u8; 32]` fields
as `Bytes32` unless the field name suffix matches a known pubkey pattern
(`_authority`, `_mint`, `_payer`, etc.). The fields in `pubkey-overrides.json`
don't match those suffixes but ARE `PublicKey` per the contract code (or, in
the case of `OtConfig.name`, are explicitly raw bytes).

This master file is consumed by `scripts/codegen.mjs`, which slices it
per-program at codegen time and writes a transient sidecar JSON next to the
output dir for `arlex-cli --pubkey-overrides`.

## Format

```json
{
  "<program>": {
    "<TypeName>": {
      "<field_name>": "publicKey" | "bytes32"
    }
  }
}
```

Field names use IDL snake_case (lookup falls back to camelCase via the
codegen's `normalize()` helper, but IDL form is canonical).

## Provenance

The 12 overrides come from inspecting the 5 dashboard IDLs for `[u8; 32]`
fields whose names lack a `_pubkey`/`_authority`/`_mint`/etc. hint but which
reference on-chain accounts in the contract code (Phase 2 NOTE-1).

The single `bytes32` override (`OtConfig.name`) is a raw 32-byte name string,
not a pubkey — pinned explicitly so a future codegen heuristic change cannot
silently reclassify it.
