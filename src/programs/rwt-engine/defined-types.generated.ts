// AUTO-GENERATED — DO NOT EDIT
// IDL: rwt-engine v0.1.0
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
export const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"RwtVault","type":{"kind":"struct","fields":[{"name":"total_invested_capital","type":"u128"},{"name":"total_rwt_supply","type":"u64"},{"name":"nav_book_value","type":"u64"},{"name":"capital_accumulator_ata","type":{"array":["u8",32]}},{"name":"rwt_mint","type":{"array":["u8",32]}},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"manager","type":{"array":["u8",32]}},{"name":"pause_authority","type":{"array":["u8",32]}},{"name":"mint_paused","type":"bool"},{"name":"areal_fee_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}},{"name":"RwtDistributionConfig","type":{"kind":"struct","fields":[{"name":"book_value_bps","type":"u16"},{"name":"liquidity_bps","type":"u16"},{"name":"protocol_revenue_bps","type":"u16"},{"name":"liquidity_destination","type":{"array":["u8",32]}},{"name":"protocol_revenue_destination","type":{"array":["u8",32]}},{"name":"bump","type":"u8"}]}}] as any);
