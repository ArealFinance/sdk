import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/programs/native-dex/index.ts',
    'src/programs/ownership-token/index.ts',
    'src/programs/rwt-engine/index.ts',
    'src/programs/yield-distribution/index.ts',
    'src/programs/futarchy/index.ts',
    'src/pda/index.ts',
    'src/tx/index.ts',
    'src/network/index.ts',
    'src/errors/index.ts',
    'src/portfolio/index.ts',
    'src/markets/index.ts',
    'src/events/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  external: ['@arlex/client', '@solana/web3.js', '@solana/spl-token'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.cjs',
  }),
});
