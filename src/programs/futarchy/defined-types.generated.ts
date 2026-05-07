// AUTO-GENERATED — DO NOT EDIT
// IDL: futarchy v0.1.0
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
export const TYPE_REGISTRY: TypeRegistry = buildTypeRegistry([] as any, [{"name":"FutarchyConfig","type":{"kind":"struct","fields":[{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"authority","type":{"array":["u8",32]}},{"name":"pending_authority","type":{"array":["u8",32]}},{"name":"has_pending","type":"bool"},{"name":"next_proposal_id","type":"u64"},{"name":"is_active","type":"bool"},{"name":"bump","type":"u8"}]}},{"name":"Proposal","type":{"kind":"struct","fields":[{"name":"proposal_id","type":"u64"},{"name":"ot_mint","type":{"array":["u8",32]}},{"name":"proposer","type":{"array":["u8",32]}},{"name":"proposal_type","type":"u8"},{"name":"amount","type":"u64"},{"name":"destination","type":{"array":["u8",32]}},{"name":"token_mint","type":{"array":["u8",32]}},{"name":"params_hash","type":{"array":["u8",32]}},{"name":"status","type":"u8"},{"name":"created_ts","type":"i64"},{"name":"executed_ts","type":"i64"},{"name":"bump","type":"u8"}]}}] as any);
