import type { Annotation, CodeExample, Trace } from '../types';
import { assertInBounds, chars, rangeCols, splitLines } from './segments';
import { findSlots } from './slots';

const LANGUAGES = ['python', 'sql', 'bash', 'json', 'typescript', 'yaml', 'markdown', 'toml', 'diff'];
const KINDS = ['syntax', 'variable', 'function', 'parameter', 'math', 'framework'];

function lineLengths(source: string): number[] {
  return splitLines(source).map((l) => chars(l).length);
}

/** The template text an annotation covers. */
export function sliceOf(source: string, range: Annotation['range']): string {
  const line = chars(splitLines(source)[range.line - 1] ?? '');
  const { start, end } = rangeCols(range, line.length);
  return line.slice(start, end).join('');
}

/**
 * Checks a code example against its own source (constitution IV): ranges in bounds, `match`
 * equals the source slice, unique IDs, every placeholder has a slot and every slot is used.
 * Column annotations on one line may not overlap; whole-line notes are shown in the gutter instead.
 */
export function validateExample(example: CodeExample): string[] {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(`${example.id}: ${msg}`);
  if (!LANGUAGES.includes(example.language)) at(`unknown language "${example.language}"`);
  if (example.run === 'pyodide' && example.language !== 'python')
    at('only Python examples can run in Pyodide');

  const lengths = lineLengths(example.source);
  const slots = findSlots(example.source);
  const ids = new Set<string>();
  const spans: { id: string; line: number; start: number; end: number }[] = [];

  for (const a of example.annotations) {
    if (ids.has(a.id)) at(`duplicate annotation id "${a.id}"`);
    ids.add(a.id);
    if (!KINDS.includes(a.kind)) at(`annotation "${a.id}" has unknown kind "${a.kind}"`);
    if (!a.title.trim() || !a.what.trim() || !a.why.trim())
      at(`annotation "${a.id}" needs title, what and why`);
    try {
      assertInBounds(a, lengths);
    } catch (e) {
      at((e as Error).message);
      continue;
    }
    const slice = sliceOf(example.source, a.range);
    if (a.match !== undefined && a.match !== slice)
      at(`annotation "${a.id}" match "${a.match}" does not equal the source slice "${slice}"`);
    const { line, startCol, endCol } = a.range;
    if (startCol === undefined || endCol === undefined) continue;
    for (const s of slots.filter((u) => u.line === line)) {
      const cutsInto = (c: number) => c > s.start && c < s.end;
      if (cutsInto(startCol) || cutsInto(endCol))
        at(`annotation "${a.id}" cuts into the {{${s.name}}} placeholder`);
    }
    for (const other of spans.filter((o) => o.line === line && o.start < endCol && startCol < o.end))
      at(`annotations "${other.id}" and "${a.id}" overlap on line ${line}`);
    spans.push({ id: a.id, line, start: startCol, end: endCol });
  }

  const used = new Set(slots.map((s) => s.name));
  const defined = new Set(Object.keys(example.slots ?? {}));
  for (const name of used) if (!defined.has(name)) at(`placeholder {{${name}}} has no slot formatter`);
  for (const name of defined) if (!used.has(name)) at(`slot "${name}" is never used in the source`);

  const stageIds = new Set<string>();
  for (const stage of example.stages ?? []) {
    if (stageIds.has(stage.id)) at(`duplicate stage id "${stage.id}"`);
    stageIds.add(stage.id);
    if (!stage.source.trim() || !stage.note.trim()) at(`stage "${stage.id}" needs source and a note`);
  }
  return errors;
}

/** Checks a trace against the (filled) source it steps through. Used by content tests. */
export function validateTrace(trace: Trace, source: string): string[] {
  const errors: string[] = [];
  if (!['computed', 'pyodide', 'simulated'].includes(trace.source))
    errors.push(`unknown trace source "${trace.source}"`);
  if (trace.steps.length === 0) errors.push('trace has no steps');
  const lengths = lineLengths(source);
  trace.steps.forEach((step, i) => {
    try {
      assertInBounds({ id: `step ${i + 1}`, range: step.range }, lengths);
    } catch (e) {
      errors.push((e as Error).message);
    }
    if (!step.note.trim()) errors.push(`step ${i + 1} has no note`);
    for (const [name, v] of Object.entries(step.vars)) {
      if (v.kind !== 'array') continue;
      const size = v.shape.reduce((a, b) => a * b, 1);
      if (v.data.flat().length !== size)
        errors.push(`step ${i + 1}: "${name}" data does not match shape [${v.shape}]`);
    }
  });
  return errors;
}
