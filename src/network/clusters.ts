// Solana cluster RPC URLs. Local validator default mirrors `solana-test-validator`.

export type ClusterName = 'localnet' | 'devnet' | 'mainnet';

/**
 * Default RPC endpoints per cluster. Override with environment-specific URLs
 * (Helius, QuickNode, etc.) at the call site — these constants are only
 * sensible defaults for development and one-off scripts.
 */
export const CLUSTER_URLS: Record<ClusterName, string> = {
  localnet: 'http://127.0.0.1:8899',
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};
