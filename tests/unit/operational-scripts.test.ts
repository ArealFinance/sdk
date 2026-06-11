import { afterEach, describe, expect, it } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(here, '..', '..');
const repoRoot = resolve(sdkRoot, '..');
const scratchDirs: string[] = [];

afterEach(() => {
  for (const dir of scratchDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeScratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratchDirs.push(dir);
  return dir;
}

function runNodeScript(script: string, opts: { cwd: string; env?: Record<string, string> }) {
  return spawnSync(process.execPath, [script], {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    encoding: 'utf8',
  });
}

function writeExecutable(path: string, source: string): void {
  writeFileSync(path, source, 'utf8');
  chmodSync(path, 0o755);
}

function writeFakeArlexCli(path: string): void {
  writeExecutable(
    path,
    `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const command = process.argv[2];
if (command === '--help' || command === '-h') {
  console.log('Usage: arlex [options] [command]');
  console.log('Commands:');
  console.log('  idl  Generate IDL JSON from the current contract');
  process.exit(0);
}
if (command !== 'idl') {
  console.error(\`error: unknown command '\${command ?? ''}'\`);
  process.exit(1);
}

const program = basename(process.cwd());
const sdkRoot = process.env.SDK_ROOT;
const idl = JSON.parse(readFileSync(resolve(sdkRoot, 'idl', \`\${program}.json\`), 'utf8'));
if (process.env.DRIFT_PROGRAM === program) {
  idl.name = \`\${idl.name}-drift\`;
}
console.log('status: generated');
console.log(JSON.stringify(idl));
`,
  );
}

function writeSdkOnlyArlexCli(path: string): void {
  writeExecutable(
    path,
    `#!/usr/bin/env node
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log('Usage: arlex-cli [options] [command]');
  console.log('Tooling for the @arlex/client TypeScript SDK');
  console.log('Commands:');
  console.log('  generate-types [options] <idl>  Generate TypeScript bindings');
  process.exit(0);
}
console.error('error: unknown command');
process.exit(1);
`,
  );
}

function runIdlVerify(env: Record<string, string>) {
  return runNodeScript('scripts/idl-verify.mjs', {
    cwd: sdkRoot,
    env,
  });
}

function writeReleaseFixture(root: string, values: {
  earnBootstrap: string;
  stakingBootstrap: string;
  stakingEarnRwtMint: string;
}): void {
  mkdirSync(join(root, 'contracts/earn/src'), { recursive: true });
  mkdirSync(join(root, 'contracts/staking/src'), { recursive: true });

  writeFileSync(
    join(root, 'contracts/earn/src/constants.rs'),
    `#[cfg(feature = "devnet")]
pub const BOOTSTRAP_AUTHORITY: [u8; 32] = [9u8; 32];
#[cfg(not(feature = "devnet"))]
pub const BOOTSTRAP_AUTHORITY: [u8; 32] = ${values.earnBootstrap};
`,
    'utf8',
  );

  writeFileSync(
    join(root, 'contracts/staking/src/constants.rs'),
    `#[cfg(feature = "devnet")]
pub const BOOTSTRAP_AUTHORITY: [u8; 32] = [9u8; 32];
#[cfg(not(feature = "devnet"))]
pub const BOOTSTRAP_AUTHORITY: [u8; 32] = ${values.stakingBootstrap};

#[cfg(feature = "devnet")]
pub const EARN_RWT_MINT: [u8; 32] = [8u8; 32];
#[cfg(not(feature = "devnet"))]
pub const EARN_RWT_MINT: [u8; 32] = ${values.stakingEarnRwtMint};
`,
    'utf8',
  );
}

function runReleaseCheck(root: string) {
  return runNodeScript(resolve(repoRoot, 'scripts/check-earn-staking-release-readiness.mjs'), {
    cwd: repoRoot,
    env: { EARN_STAKING_RELEASE_ROOT: root, NODE_ENV: 'test' },
  });
}

function runReleaseCheckWithoutTestEnv(root: string) {
  return runNodeScript(resolve(repoRoot, 'scripts/check-earn-staking-release-readiness.mjs'), {
    cwd: repoRoot,
    env: { EARN_STAKING_RELEASE_ROOT: root, NODE_ENV: '' },
  });
}

describe('idl-verify operational script', () => {
  it('accepts a relative ARLEX_CLI path and verifies matching IDL output', () => {
    const dir = makeScratch('areal-idl-ok-');
    const cliPath = join(dir, 'fake-arlex.mjs');
    writeFakeArlexCli(cliPath);

    const result = runIdlVerify({
      ARLEX_CLI: relative(sdkRoot, cliPath),
      SDK_ROOT: sdkRoot,
    });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[idl-verify] All IDLs match contract sources');
  });

  it('rejects the SDK arlex-cli because generate-types <idl> is not an idl command', () => {
    const dir = makeScratch('areal-idl-sdk-cli-');
    const cliPath = join(dir, 'arlex-cli');
    writeSdkOnlyArlexCli(cliPath);

    const result = runIdlVerify({ ARLEX_CLI: cliPath });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not expose an `idl` command');
  });

  it('fails on checked-in IDL drift from the contract CLI output', () => {
    const dir = makeScratch('areal-idl-drift-');
    const cliPath = join(dir, 'arlex');
    writeFakeArlexCli(cliPath);

    const result = runIdlVerify({
      ARLEX_CLI: cliPath,
      SDK_ROOT: sdkRoot,
      DRIFT_PROGRAM: 'earn',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[idl-verify] DRIFT in earn.json');
  });
});

describe('earn/staking release-readiness script', () => {
  it('fails while non-devnet deployment pins are zero placeholders', () => {
    const root = makeScratch('areal-release-zero-');
    writeReleaseFixture(root, {
      earnBootstrap: '[0u8; 32]',
      stakingBootstrap: '[0u8; 32]',
      stakingEarnRwtMint: '[0u8; 32]',
    });

    const result = runReleaseCheck(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('non-devnet BOOTSTRAP_AUTHORITY is still [0u8; 32]');
    expect(result.stderr).toContain('non-devnet EARN_RWT_MINT is still [0u8; 32]');
  });

  it('passes when all non-devnet deployment pins are nonzero', () => {
    const root = makeScratch('areal-release-ok-');
    writeReleaseFixture(root, {
      earnBootstrap: '[1u8; 32]',
      stakingBootstrap: '[2u8; 32]',
      stakingEarnRwtMint: '[3u8; 32]',
    });

    const result = runReleaseCheck(root);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[earn-staking-release-readiness] OK');
  });

  it('rejects fixture root overrides outside NODE_ENV=test', () => {
    const root = makeScratch('areal-release-override-');
    writeReleaseFixture(root, {
      earnBootstrap: '[1u8; 32]',
      stakingBootstrap: '[2u8; 32]',
      stakingEarnRwtMint: '[3u8; 32]',
    });

    const result = runReleaseCheckWithoutTestEnv(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EARN_STAKING_RELEASE_ROOT is test-only');
  });
});

describe('bootstrap-earn operational script', () => {
  it('only treats config PDAs as initialized after owner and discriminator validation', () => {
    const source = readFileSync(resolve(repoRoot, 'scripts/lib/bootstrap-earn.ts'), 'utf8');

    expect(source).toContain('const EARN_CONFIG_DISCRIMINATOR = Buffer.from');
    expect(source).toContain('const STAKING_CONFIG_DISCRIMINATOR = Buffer.from');
    expect(source).toContain('info.owner.equals(SYSTEM_PROGRAM_ID)');
    expect(source).toContain('has program owner but wrong discriminator');
    expect(source).toContain('const earnConfigExists = earnConfigData !== null;');
    expect(source).toContain('const stakingConfigExists = stakingConfigData !== null;');
    expect(source).not.toContain('const earnConfigExists = await accountExists(conn, earnConfigPda);');
    expect(source).not.toContain(
      'const stakingConfigExists = await accountExists(conn, stakingConfigPda);',
    );
  });
});
