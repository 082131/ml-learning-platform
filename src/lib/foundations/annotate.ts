import type { CodeRange } from '../types';

/**
 * The range of `match` on a 1-based line of a template source, in code points, so lesson code.ts
 * files never count columns by hand. `nth` picks a later occurrence on the same line.
 * Throws when the text is not there, so a code edit that breaks an annotation fails validation.
 */
export function span(
  source: string,
  line: number,
  match: string,
  nth = 0,
): { range: CodeRange; match: string } {
  const text = source.split('\n')[line - 1];
  if (text === undefined) throw new Error(`Line ${line} does not exist`);
  let at = -1;
  for (let i = 0; i <= nth; i++) {
    at = text.indexOf(match, at + 1);
    if (at < 0) throw new Error(`"${match}" (occurrence ${nth}) is not on line ${line}: ${text}`);
  }
  const startCol = [...text.slice(0, at)].length;
  return { range: { line, startCol, endCol: startCol + [...match].length }, match };
}

/** The 1-based number of the first line that contains `text`. */
export function lineOf(source: string, text: string, from = 1): number {
  const lines = source.split('\n');
  for (let i = from - 1; i < lines.length; i++) if (lines[i]!.includes(text)) return i + 1;
  throw new Error(`No line contains "${text}"`);
}
