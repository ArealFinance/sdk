#!/usr/bin/env node
/**
 * Verify sdk/idl/*.json matches `arlex idl` output of contracts/.
 * Fails CI if drift is detected so a stale on-disk IDL can't ship a
 * codegen built against an old contract shape.
 *
 * Usage: ARLEX_CLI=/path/to/arlex npm run idl:verify
 *        (defaults to `arlex` on PATH)
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, '..');
const contractsRoot = resolve(sdkRoot, '../contracts');
const arlexCli = process.env.ARLEX_CLI || 'arlex';

const programs = [
  'futarchy',
  'native-dex',
  'ownership-token',
  'rwt-engine',
  'yield-distribution',
];

let drift = false;
for (const prog of programs) {
  const contractDir = `${contractsRoot}/${prog}`;
  if (!existsSync(contractDir)) {
    console.warn(`[idl-verify] ${prog}: contract dir not found at ${contractDir}, skipping`);
    continue;
  }
  let fresh;
  try {
    fresh = execSync(`${arlexCli} idl`, {
      cwd: contractDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    console.error(`[idl-verify] ${prog}: arlex idl failed: ${e.message}`);
    drift = true;
    continue;
  }
  // `arlex idl` prints status lines to stdout before/around the JSON; extract
  // just the JSON object by finding the first `{` and matching to its
  // closing `}` at depth 0.
  const start = fresh.indexOf('{');
  if (start < 0) {
    console.error(`[idl-verify] ${prog}: no JSON in arlex idl output`);
    drift = true;
    continue;
  }
  let depth = 0;
  let end = -1;
  for (let i = start; i < fresh.length; i++) {
    const c = fresh[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) {
    console.error(`[idl-verify] ${prog}: unterminated JSON in arlex idl output`);
    drift = true;
    continue;
  }
  const freshJson = fresh.slice(start, end);
  const stale = readFileSync(`${sdkRoot}/idl/${prog}.json`, 'utf8');
  // Normalize via JSON.parse → JSON.stringify so whitespace/key-order
  // differences don't trigger false drift.
  const a = JSON.stringify(JSON.parse(freshJson));
  const b = JSON.stringify(JSON.parse(stale));
  if (a !== b) {
    console.error(`[idl-verify] DRIFT in ${prog}.json`);
    console.error(`  Fix: cd contracts/${prog} && ${arlexCli} idl > sdk/idl/${prog}.json && cd sdk && npm run codegen`);
    drift = true;
  } else {
    console.log(`[idl-verify] ${prog}: OK`);
  }
}

if (drift) process.exit(1);
console.log('[idl-verify] All IDLs match contract sources');
