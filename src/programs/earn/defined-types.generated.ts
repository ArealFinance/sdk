// AUTO-GENERATED — DO NOT EDIT
// IDL: earn v0.1.0
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
export const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"EarnConfig","type":{"kind":"struct","fields":[{"name":"total_invested_capital","type":"u128"},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"pause_authority","type":{"array":["u8",32]}},{"name":"is_paused","type":"bool"},{"name":"mint_fee_bps","type":"u16"},{"name":"basket_vault","type":{"array":["u8",32]}},{"name":"dao_fee_destination","type":{"array":["u8",32]}},{"name":"rwt_mint","type":{"array":["u8",32]}},{"name":"usdc_mint","type":{"array":["u8",32]}},{"name":"min_mint_amount","type":"u64"},{"name":"bump","type":"u8"}]}}] as any);
