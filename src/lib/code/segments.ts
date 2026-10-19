import type { CodeRange } from '../types';

/** One highlighter token. `cls` is a syntax class such as `kw` or `str` (see highlight.ts). */
export interface CodeToken {
  content: string;
  cls?: string;
}

/** Anything that attaches to a source range: an annotation, or the active step of a trace. */
export interface Mark {
  id: string;
  range: CodeRange;
}

/** A renderable run of text with one syntax class and a fixed set of marks covering it. */
export interface Segment {
  text: string;
  cls?: string;
  /** Column (in code points) where the segment starts. */
  start: number;
  /** IDs of the marks covering this segment, in input order. Whole-line marks cover every segment. */
  marks: string[];
}

/**
 * Columns count Unicode code points, not UTF-16 units, so an emoji is one column,
 * the way an author counts characters in an editor.
 */
export function chars(text: string): string[] {
  return Array.from(text);
}

export function splitLines(source: string): string[] {
  return source.replace(/\r\n?/g, '\n').split('\n');
}

/** One unstyled token per line. Used before the highlighter has loaded, and in tests. */
export function plainTokens(source: string): CodeToken[][] {
  return splitLines(source).map((line) => (line ? [{ content: line }] : []));
}

/** Resolves a range against a line's length: whole-line ranges cover the full line. */
export function rangeCols(range: CodeRange, lineLength: number): { start: number; end: number } {
  return { start: range.startCol ?? 0, end: range.endCol ?? lineLength };
}

/** Throws a RangeError naming the mark when its range is outside the source. */
export function assertInBounds(mark: Mark, lineLengths: number[]): void {
  const { line, startCol, endCol } = mark.range;
  const length = lineLengths[line - 1];
  const where = `"${mark.id}" (line ${line}, cols ${startCol ?? '-'}..${endCol ?? '-'})`;
  if (!Number.isInteger(line) || length === undefined)
    throw new RangeError(`Range ${where} is outside the ${lineLengths.length}-line source`);
  if ((startCol === undefined) !== (endCol === undefined))
    throw new RangeError(`Range ${where} must give both startCol and endCol, or neither`);
  if (startCol !== undefined && endCol !== undefined) {
    if (!Number.isInteger(startCol) || !Number.isInteger(endCol) || startCol < 0 || endCol > length)
      throw new RangeError(`Range ${where} is outside line ${line}, which has ${length} columns`);
    if (endCol <= startCol) throw new RangeError(`Range ${where} is empty or reversed`);
  }
}

/**
 * Splits highlighter tokens at mark boundaries so every segment has exactly one syntax class
 * and one set of covering marks. Highlighting is display only; marks come from structured ranges.
 */
export function splitSegments(lines: CodeToken[][], marks: Mark[]): Segment[][] {
  const lengths = lines.map((tokens) => tokens.reduce((n, t) => n + chars(t.content).length, 0));
  for (const mark of marks) assertInBounds(mark, lengths);

  return lines.map((tokens, i) => {
    const lineNo = i + 1;
    const onLine = marks
      .filter((m) => m.range.line === lineNo)
      .map((m) => ({ id: m.id, ...rangeCols(m.range, lengths[i] ?? 0) }));
    const cuts = new Set<number>();
    for (const m of onLine) cuts.add(m.start).add(m.end);

    const out: Segment[] = [];
    let col = 0;
    for (const token of tokens) {
      const text = chars(token.content);
      const tokenEnd = col + text.length;
      const inner = [...cuts].filter((c) => c > col && c < tokenEnd).sort((a, b) => a - b);
      for (const [from, to] of pairs([col, ...inner, tokenEnd])) {
        out.push({
          text: text.slice(from - col, to - col).join(''),
          cls: token.cls,
          start: from,
          marks: onLine.filter((m) => m.start <= from && m.end >= to).map((m) => m.id),
        });
      }
      col = tokenEnd;
    }
    return out;
  });
}

function pairs(points: number[]): [number, number][] {
  return points.slice(1).map((p, i) => [points[i] ?? 0, p]);
}
