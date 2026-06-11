// AUTO-GENERATED — DO NOT EDIT
// IDL: staking v0.1.2
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
export const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"StakingConfig","type":{"kind":"struct","fields":[{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"rwt_mint","type":{"array":["u8",32]}},{"name":"strwt_mint","type":{"array":["u8",32]}},{"name":"reward_depositor","type":{"array":["u8",32]}},{"name":"pool_vault","type":{"array":["u8",32]}},{"name":"total_rwt_active","type":"u64"},{"name":"total_rwt_reserved","type":"u64"},{"name":"cooldown_seconds","type":"i64"},{"name":"min_stake_amount","type":"u64"},{"name":"bump","type":"u8"}]}},{"name":"UnstakeTicket","type":{"kind":"struct","fields":[{"name":"owner","type":{"array":["u8",32]}},{"name":"amount_rwt","type":"u64"},{"name":"unlock_ts","type":"i64"},{"name":"nonce","type":"u64"},{"name":"bump","type":"u8"}]}}] as any);
