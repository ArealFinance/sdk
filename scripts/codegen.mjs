#!/usr/bin/env node
// Wrapper around `arlex-cli generate-types` for all 5 Areal IDLs.
//
// Reads the master overrides at overrides/pubkey-overrides.json, slices the
// per-program section into a transient sidecar JSON next to the output dir,
// and invokes the CLI for each program with `--pubkey-overrides`.
//
// Generated files (Accounts.ts, Instructions.ts, Errors.ts, idl.ts, etc.)
// land in src/programs/<program>/ and are checked in.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, '..');
const programs = ['futarchy', 'native-dex', 'ownership-token', 'rwt-engine', 'yield-distribution'];

const overridesPath = join(sdkRoot, 'overrides', 'pubkey-overrides.json');
const overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));

const cliBin = resolve(sdkRoot, 'node_modules', '.bin', 'arlex-cli');
if (!existsSync(cliBin)) {
  console.error(`[codegen] arlex-cli not found at ${cliBin}`);
  console.error('Run `npm install` first to install @arlex/client devDep.');
  process.exit(1);
}

let failed = 0;
for (const program of programs) {
  const idlPath = join(sdkRoot, 'idl', `${program}.json`);
  const outDir = join(sdkRoot, 'src', 'programs', program);
  mkdirSync(outDir, { recursive: true });

  const programOverrides = overrides[program] || {};
  let overridesArg = '';
  let tmpOverrides = null;
  if (Object.keys(programOverrides).length > 0) {
    tmpOverrides = join(outDir, '.overrides.tmp.json');
    writeFileSync(tmpOverrides, JSON.stringify(programOverrides, null, 2));
    overridesArg = `--pubkey-overrides ${tmpOverrides}`;
  }

  const cmd = `${cliBin} generate-types ${idlPath} --out ${outDir} ${overridesArg}`.trim();
  console.log(`[codegen] ${program}`);
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: sdkRoot });
  } catch (e) {
    failed++;
    console.error(`[codegen] FAILED for ${program}: ${e.message}`);
  } finally {
    if (tmpOverrides) {
      try { unlinkSync(tmpOverrides); } catch {}
    }
  }
}

if (failed > 0) {
  console.error(`[codegen] ${failed}/${programs.length} programs failed`);
  process.exit(1);
}

console.log('[codegen] done');
