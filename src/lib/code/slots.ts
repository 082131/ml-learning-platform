import type { Annotation, CodeExample } from '../types';
import { chars, splitLines } from './segments';

/** `{{name}}` placeholders in a code template. Names are letters, digits and underscores. */
const SLOT = /\{\{(\w+)\}\}/g;

export interface SlotUse {
  name: string;
  line: number;
  /** Code-point columns of the whole `{{name}}` placeholder in the template. */
  start: number;
  end: number;
}

export function findSlots(source: string): SlotUse[] {
  return splitLines(source).flatMap((text, i) =>
    [...text.matchAll(SLOT)].map((m) => {
      const start = chars(text.slice(0, m.index)).length;
      return { name: m[1] ?? '', line: i + 1, start, end: start + chars(m[0]).length };
    }),
  );
}

/** Calls each slot formatter with the experiment state. Values must be single-line. */
export function resolveSlots(example: CodeExample, state: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(example.slots ?? {}).map(([name, format]) => {
      const value = format(state);
      if (/[\r\n]/.test(value)) throw new Error(`Slot "${name}" in "${example.id}" must format to one line`);
      return [name, value];
    }),
  );
}

/**
 * Fills placeholders and moves annotation columns so they still cover the same code.
 * Annotations are written against the template; a column after a placeholder shifts by the
 * difference in length, and an annotation that spans a placeholder grows to cover its value.
 */
export function fillSlots(
  source: string,
  annotations: Annotation[],
  values: Record<string, string>,
): { source: string; annotations: Annotation[] } {
  const uses = findSlots(source);
  const valueOf = (name: string) => {
    const v = values[name];
    if (v === undefined) throw new Error(`No value for slot "${name}"`);
    return v;
  };
  const shiftCol = (line: number, col: number) =>
    uses
      .filter((u) => u.line === line && u.end <= col)
      .reduce((c, u) => c + chars(valueOf(u.name)).length - (u.end - u.start), col);

  const filled = splitLines(source)
    .map((text) => text.replace(SLOT, (_, name: string) => valueOf(name)))
    .join('\n');
  const moved = annotations.map((a) => {
    const { line, startCol, endCol } = a.range;
    if (startCol === undefined || endCol === undefined) return a;
    return { ...a, range: { line, startCol: shiftCol(line, startCol), endCol: shiftCol(line, endCol) } };
  });
  return { source: filled, annotations: moved };
}

/** The source and annotations to display. Without experiment state, slotted code shows its template. */
export function fillExample(
  example: CodeExample,
  state: unknown,
): { source: string; annotations: Annotation[] } {
  if (!example.slots || state === undefined)
    return { source: example.source, annotations: example.annotations };
  return fillSlots(example.source, example.annotations, resolveSlots(example, state));
}
