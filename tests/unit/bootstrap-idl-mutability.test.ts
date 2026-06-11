// Bootstrap IDL account-mutability guards.
//
// earn/staking initialize now create singleton config PDAs manually after
// validation, so the config PDA must be writable in both checked-in IDL JSON
// and generated instruction bindings.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(here, '..', '..');

interface IdlAccount {
  name: string;
  isMut: boolean;
}

interface IdlInstruction {
  name: string;
  accounts: IdlAccount[];
}

interface IdlJson {
  instructions: IdlInstruction[];
}

function readText(path: string): string {
  return readFileSync(resolve(sdkRoot, path), 'utf8');
}

function readIdl(program: string): IdlJson {
  return JSON.parse(readText(`idl/${program}.json`)) as IdlJson;
}

function initializeAccount(program: string, accountName: string): IdlAccount {
  const initialize = readIdl(program).instructions.find(ix => ix.name === 'initialize');
  expect(initialize, `${program}.initialize missing from IDL`).toBeDefined();
  const account = initialize!.accounts.find(acc => acc.name === accountName);
  expect(account, `${program}.initialize.${accountName} missing from IDL`).toBeDefined();
  return account!;
}

function generatedInitializeComment(program: string, accountName: string): string {
  const source = readText(`src/programs/${program}/instructions.generated.ts`);
  const fieldName = accountName.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const match = source.match(new RegExp(`/\\*\\* ([^*]+) \\*/\\n\\s+${fieldName}: PublicKey;`));
  expect(match, `${program}.InitializeAccounts.${fieldName} missing from generated source`).not.toBeNull();
  return match![1]!;
}

describe('bootstrap initialize IDL mutability', () => {
  it('earn initialize marks earn_config writable', () => {
    expect(initializeAccount('earn', 'earn_config').isMut).toBe(true);
    expect(generatedInitializeComment('earn', 'earn_config')).toContain('writable');
  });

  it('staking initialize marks staking_config writable', () => {
    expect(initializeAccount('staking', 'staking_config').isMut).toBe(true);
    expect(generatedInitializeComment('staking', 'staking_config')).toContain('writable');
  });
});
