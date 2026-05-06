// Re-export per-program `ProgramErrorCode` enums and `ProgramErrors` IDL
// definition arrays under namespaced aliases. The mapper looks them up by
// program ID; consumers can also import the per-program enum directly to
// pattern-match on a specific error code.

import { ProgramErrors as NativeDexErrors } from '../programs/native-dex/errors.generated.js';
import { ProgramErrors as OwnershipTokenErrors } from '../programs/ownership-token/errors.generated.js';
import { ProgramErrors as RwtEngineErrors } from '../programs/rwt-engine/errors.generated.js';
import { ProgramErrors as YieldDistributionErrors } from '../programs/yield-distribution/errors.generated.js';
import { ProgramErrors as FutarchyErrors } from '../programs/futarchy/errors.generated.js';

export {
  NativeDexErrors,
  OwnershipTokenErrors,
  RwtEngineErrors,
  YieldDistributionErrors,
  FutarchyErrors,
};

// Per-program enum re-exports. Renamed to avoid the `ProgramErrorCode`
// collision across modules.
export { ProgramErrorCode as NativeDexErrorCode } from '../programs/native-dex/errors.generated.js';
export { ProgramErrorCode as OwnershipTokenErrorCode } from '../programs/ownership-token/errors.generated.js';
export { ProgramErrorCode as RwtEngineErrorCode } from '../programs/rwt-engine/errors.generated.js';
export { ProgramErrorCode as YieldDistributionErrorCode } from '../programs/yield-distribution/errors.generated.js';
export { ProgramErrorCode as FutarchyErrorCode } from '../programs/futarchy/errors.generated.js';
