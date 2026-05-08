// IDL-vs-literal drift detection (R-EVENTS-IDL-DRIFT, Phase 12.1).
//
// Why this test exists:
//   The SDK inlines each program's `events: []` from `idl/<program>.json` as a
//   TypeScript literal in `src/events/<program>.ts`. The literal feeds the
//   dynamic decoder registry (`buildProgramEventRegistry`). If `arlex idl`
//   regenerates the JSON IDL but a contributor forgets to mirror the change in
//   the TS literal, decoders silently mismatch on a renamed field, a flipped
//   integer width, or a new event added on-chain.
//
// Strategy:
//   1. For each of the 5 Areal programs, read the source IDL JSON and the
//      inlined `*_EVENT_LITERALS` (internal-only export).
//   2. Cross-check by event name (presence in both directions), per-event
//      field count, per-field name, and per-field type (deep-equal on the
//      structural type — handles `[u8;32]` arrays, scalars, etc.).
//   3. Surface a precise diff message identifying which event/field drifted
//      so the fix is mechanical (re-copy the literal from the IDL).
//
// What this test deliberately does NOT do:
//   - Fix the drift. The point is to catch it; the fix is a manual literal
//     update once the IDL change is intentional.
//   - Validate IDL JSON shape itself. We trust `arlex idl` to emit valid
//     IDLs; that is policed elsewhere (idl:verify script).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { IdlEvent, IdlField } from '@arlex/client';

import { YIELD_DISTRIBUTION_EVENT_LITERALS } from '../../src/events/yield-distribution.js';
import { NATIVE_DEX_EVENT_LITERALS } from '../../src/events/native-dex.js';
import { OWNERSHIP_TOKEN_EVENT_LITERALS } from '../../src/events/ownership-token.js';
import { RWT_ENGINE_EVENT_LITERALS } from '../../src/events/rwt-engine.js';
import { FUTARCHY_EVENT_LITERALS } from '../../src/events/futarchy.js';

// Resolve the IDL JSON paths relative to this test file. Using a function so
// each program can compute its own absolute path; avoids polluting the test
// scope with a top-level `__dirname` shim.
function idlPath(program: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', '..', 'idl', `${program}.json`);
}

interface IdlJson {
  events?: readonly IdlEvent[];
}

function loadIdl(program: string): IdlJson {
  const raw = readFileSync(idlPath(program), 'utf8');
  return JSON.parse(raw) as IdlJson;
}

/**
 * Stable JSON stringification of a field type. We use this for deep equality
 * because `IdlField['type']` may be a primitive string (`'u64'`) or a nested
 * object (`{ array: ['u8', 32] }` / `{ defined: 'Foo' }`). `JSON.stringify`
 * with sorted keys is sufficient — Areal IDL types contain no cycles.
 */
function fieldTypeKey(type: unknown): string {
  if (type === null || typeof type !== 'object') return JSON.stringify(type);
  // Sort keys for deterministic comparison.
  const obj = type as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const k of sortedKeys) sortedObj[k] = obj[k];
  return JSON.stringify(sortedObj);
}

interface DriftRow {
  program: string;
  event: string;
  field?: string;
  kind:
    | 'event-missing-in-literal'
    | 'event-orphaned-in-literal'
    | 'field-count-mismatch'
    | 'field-missing-in-literal'
    | 'field-orphaned-in-literal'
    | 'field-type-mismatch';
  detail: string;
}

/**
 * Compare a single program's IDL events array against the inlined TS literal.
 * Returns a list of drift rows; empty list ⇒ no drift.
 */
function detectDrift(
  program: string,
  idlEvents: readonly IdlEvent[],
  literalEvents: readonly IdlEvent[],
): DriftRow[] {
  const drift: DriftRow[] = [];
  const idlByName = new Map(idlEvents.map((e) => [e.name, e]));
  const litByName = new Map(literalEvents.map((e) => [e.name, e]));

  // Direction 1: every IDL event must exist in the literal.
  for (const idlEvent of idlEvents) {
    const lit = litByName.get(idlEvent.name);
    if (!lit) {
      drift.push({
        program,
        event: idlEvent.name,
        kind: 'event-missing-in-literal',
        detail: `IDL declares event \`${idlEvent.name}\` but src/events/${program}.ts has no matching literal entry`,
      });
      continue;
    }

    const idlFields: readonly IdlField[] = idlEvent.fields ?? [];
    const litFields: readonly IdlField[] = lit.fields ?? [];

    if (idlFields.length !== litFields.length) {
      drift.push({
        program,
        event: idlEvent.name,
        kind: 'field-count-mismatch',
        detail: `Event \`${idlEvent.name}\`: IDL has ${idlFields.length} fields, TS literal has ${litFields.length}`,
      });
    }

    const idlFieldByName = new Map(idlFields.map((f) => [f.name, f]));
    const litFieldByName = new Map(litFields.map((f) => [f.name, f]));

    for (const idlField of idlFields) {
      const litField = litFieldByName.get(idlField.name);
      if (!litField) {
        drift.push({
          program,
          event: idlEvent.name,
          field: idlField.name,
          kind: 'field-missing-in-literal',
          detail: `Event \`${idlEvent.name}\`: IDL has field \`${idlField.name}: ${fieldTypeKey(idlField.type)}\` but TS literal does not`,
        });
        continue;
      }
      const idlKey = fieldTypeKey(idlField.type);
      const litKey = fieldTypeKey(litField.type);
      if (idlKey !== litKey) {
        drift.push({
          program,
          event: idlEvent.name,
          field: idlField.name,
          kind: 'field-type-mismatch',
          detail: `Event \`${idlEvent.name}\`: field \`${idlField.name}\` IDL type ${idlKey} ≠ TS literal type ${litKey}`,
        });
      }
    }

    // Catch fields in the literal that are absent from the IDL.
    for (const litField of litFields) {
      if (!idlFieldByName.has(litField.name)) {
        drift.push({
          program,
          event: idlEvent.name,
          field: litField.name,
          kind: 'field-orphaned-in-literal',
          detail: `Event \`${idlEvent.name}\`: TS literal has field \`${litField.name}: ${fieldTypeKey(litField.type)}\` but IDL does not`,
        });
      }
    }
  }

  // Direction 2: every literal event must exist in the IDL (no orphans).
  for (const litEvent of literalEvents) {
    if (!idlByName.has(litEvent.name)) {
      drift.push({
        program,
        event: litEvent.name,
        kind: 'event-orphaned-in-literal',
        detail: `TS literal declares event \`${litEvent.name}\` but src/idl/${program}.json has no matching IDL entry`,
      });
    }
  }

  return drift;
}

/**
 * Format a drift report as a multi-line string for assertion failure messages.
 * The format is intentionally verbose so a CI failure tells the reader exactly
 * which event/field needs to be re-copied from the IDL.
 */
function formatDrift(rows: readonly DriftRow[]): string {
  if (rows.length === 0) return '';
  const lines = [
    `${rows.length} IDL-vs-literal drift row${rows.length === 1 ? '' : 's'} detected:`,
  ];
  for (const row of rows) {
    lines.push(`  [${row.program}] (${row.kind}) ${row.detail}`);
  }
  return lines.join('\n');
}

interface ProgramCase {
  program: string;
  literal: readonly IdlEvent[];
}

const PROGRAMS: readonly ProgramCase[] = [
  { program: 'yield-distribution', literal: YIELD_DISTRIBUTION_EVENT_LITERALS },
  { program: 'native-dex', literal: NATIVE_DEX_EVENT_LITERALS },
  { program: 'ownership-token', literal: OWNERSHIP_TOKEN_EVENT_LITERALS },
  { program: 'rwt-engine', literal: RWT_ENGINE_EVENT_LITERALS },
  { program: 'futarchy', literal: FUTARCHY_EVENT_LITERALS },
];

describe('IDL-vs-literal drift detection (R-EVENTS-IDL-DRIFT)', () => {
  for (const { program, literal } of PROGRAMS) {
    it(`${program}: inlined event literals match idl/${program}.json`, () => {
      const idl = loadIdl(program);
      const idlEvents = idl.events ?? [];
      const drift = detectDrift(program, idlEvents, literal);
      // Empty drift list is the success state; on failure, attach the
      // formatted report so the diff in CI is human-readable.
      expect(drift, formatDrift(drift)).toEqual([]);
    });
  }
});
