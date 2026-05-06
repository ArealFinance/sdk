// RWT Engine program PDAs. RWT is global — both PDAs are singletons.

import { PublicKey } from '@solana/web3.js';

/** `["rwt_vault"]` singleton — backing collateral vault. */
export function findRwtVaultPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('rwt_vault')], programId);
}

/** `["dist_config_rwt"]` singleton — RWT distribution split config. */
export function findRwtDistConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('dist_config_rwt')],
    programId,
  );
}
