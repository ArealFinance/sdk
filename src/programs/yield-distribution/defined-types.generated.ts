// AUTO-GENERATED — DO NOT EDIT
// IDL: yield-distribution v0.1.0
// Generator: @arlex/client codegen v1

import {
  PublicKey,
  type Bytes32,
  type WireFieldMap,
  type IdlField,
  type TypeRegistry,
  buildTypeRegistry,
} from '@arlex/client/codegen-runtime';

/** Type registry shared across all parsers and encoders in this program. */
export const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"DistributionConfig","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"publish_authority","type":{"array":["u8",32]}},{"name":"protocol_fee_bps","type":"u16"},{"name":"min_distribution_amount","type":"u64"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"MerkleDistributor","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"reward_vault","type":{"array":["u8",32]}},{"name":"accumulator","type":{"array":["u8",32]}},{"name":"merkle_root","type":{"array":["u8",32]}},{"name":"max_total_claim","type":"u64"},{"name":"total_claimed","type":"u64"},{"name":"total_funded","type":"u64"},{"name":"locked_vested","type":"u64"},{"name":"last_fund_ts","type":"i64"},{"name":"vesting_period_secs","type":"i64"},{"name":"epoch","type":"u64"},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"Accumulator","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"ClaimStatus","type":{"kind":"struct","fields":[{"name":"claimant","type":{"array":["u8",32]}},{"name":"distributor","type":{"array":["u8",32]}},{"name":"claimed_amount","type":"u64"},{"name":"bump","type":"u8"}]}},{"name":"LiquidityHolding","type":{"kind":"struct","fields":[{"name":"bump","type":"u8"},{"name":"initialized","type":"bool"},{"name":"total_received","type":"u64"},{"name":"total_withdrawn","type":"u64"},{"name":"last_funded_slot","type":"u64"},{"name":"last_withdrawn_slot","type":"u64"},{"name":"last_withdrawn_amount","type":"u64"},{"name":"_reserved","type":{"array":["u8",16]}}]}}] as any);
