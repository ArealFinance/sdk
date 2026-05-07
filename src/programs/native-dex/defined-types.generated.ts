// AUTO-GENERATED — DO NOT EDIT
// IDL: native-dex v0.1.0
// Generator: @arlex/client codegen v1

import {
  PublicKey,
  type Bytes32,
  type WireFieldMap,
  type IdlField,
  type TypeRegistry,
  buildTypeRegistry,
} from '@arlex/client/codegen-runtime';

/** Defined struct from IDL: Bin */
export interface Bin {
  liquidityA: bigint;
  liquidityB: bigint;
}

export const WIRE_BIN_FIELDS: WireFieldMap = {
  "liquidity_a": "liquidityA",
  "liquidity_b": "liquidityB",
};

/** Raw IDL field shape for Bin — used by the runtime serializer. */
export const IDL_BIN_FIELDS: IdlField[] = [
  {
    "name": "liquidity_a",
    "type": "u64"
  },
  {
    "name": "liquidity_b",
    "type": "u64"
  }
];

/** Type registry shared across all parsers and encoders in this program. */
export const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([{"name":"FeeBreakdown","type":{"kind":"struct","fields":[{"name":"fee_total","type":"u64"},{"name":"fee_lp","type":"u64"},{"name":"fee_protocol","type":"u64"},{"name":"ot_treasury_fee","type":"u64"}]}},{"name":"Bin","type":{"kind":"struct","fields":[{"name":"liquidity_a","type":"u64"},{"name":"liquidity_b","type":"u64"}]}}] as any, [{"name":"DexConfig","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"pause_authority","type":{"array":["u8",32]}},{"name":"base_fee_bps","type":"u16"},{"name":"lp_fee_share_bps","type":"u16"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"rebalancer","type":{"array":["u8",32]}},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"PoolState","type":{"kind":"struct","fields":[{"name":"pool_type","type":"u8"},{"name":"token_a_mint","type":{"array":["u8",32]}},{"name":"token_b_mint","type":{"array":["u8",32]}},{"name":"vault_a","type":{"array":["u8",32]}},{"name":"vault_b","type":{"array":["u8",32]}},{"name":"reserve_a","type":"u64"},{"name":"reserve_b","type":"u64"},{"name":"total_lp_shares","type":"u128"},{"name":"fee_bps","type":"u16"},{"name":"is_active","type":"bool"},{"name":"total_fees_accumulated","type":"u64"},{"name":"bin_step_bps","type":"u16"},{"name":"active_bin_id","type":"i32"},{"name":"ot_treasury_fee_destination","type":{"array":["u8",32]}},{"name":"has_ot_treasury","type":"bool"},{"name":"bump","type":"u8"},{"name":"cumulative_fees_per_share_a","type":"u128"},{"name":"cumulative_fees_per_share_b","type":"u128"}]}},{"name":"PoolCreators","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"creators","type":{"array":[{"array":["u8",32]},10]}},{"name":"active_count","type":"u8"},{"name":"bump","type":"u8"}]}},{"name":"LpPosition","type":{"kind":"struct","fields":[{"name":"pool","type":{"array":["u8",32]}},{"name":"owner","type":{"array":["u8",32]}},{"name":"shares","type":"u128"},{"name":"last_update_ts","type":"i64"},{"name":"bump","type":"u8"},{"name":"fees_claimed_per_share_a","type":"u128"},{"name":"fees_claimed_per_share_b","type":"u128"}]}},{"name":"BinArray","type":{"kind":"struct","fields":[{"name":"pool","type":{"array":["u8",32]}},{"name":"bins","type":{"array":[{"defined":"Bin"},70]}},{"name":"lower_bin_id","type":"i32"},{"name":"bin_step_bps","type":"u16"},{"name":"active_bin_id","type":"i32"},{"name":"bump","type":"u8"}]}},{"name":"LiquidityNexus","type":{"kind":"struct","fields":[{"name":"manager","type":{"array":["u8",32]}},{"name":"total_deposited_usdc","type":"u64"},{"name":"total_deposited_rwt","type":"u64"},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}}] as any);
