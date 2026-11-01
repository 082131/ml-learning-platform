import type { Annotation, CodeRange } from '../types';

/**
 * The range of `match` on 1-based line `line` of `source`, in code points (0-based, end-exclusive),
 * so annotation columns never drift when a line is edited. Throws when the text is not on that line.
 */
export function spanOf(source: string, line: number, match: string, occurrence = 0): { range: CodeRange; match: string } {
  const text = source.split('\n')[line - 1];
  if (text === undefined) throw new Error(`line ${line} is out of range`);
  let at = -1;
  for (let k = 0; k <= occurrence; k++) {
    at = text.indexOf(match, at + 1);
    if (at < 0) throw new Error(`"${match}" not found on line ${line}: ${text}`);
  }
  const startCol = [...text.slice(0, at)].length;
  return { range: { line, startCol, endCol: startCol + [...match].length }, match };
}

/** The 1-based number of the first line containing `needle`. */
export function lineOf(source: string, needle: string): number {
  const i = source.split('\n').findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error(`"${needle}" not found`);
  return i + 1;
}

type Body = Omit<Annotation, 'id' | 'range' | 'match'>;

/** An annotation on the first occurrence of `match` on the first line that contains `lineNeedle`. */
export function ann(source: string, id: string, lineNeedle: string, match: string, body: Body): Annotation {
  return { id, ...spanOf(source, lineOf(source, lineNeedle), match), ...body };
}

/** An annotation on a whole line, found by a piece of its text. */
export function annLine(source: string, id: string, lineNeedle: string, body: Body): Annotation {
  return { id, range: { line: lineOf(source, lineNeedle) }, ...body };
}
