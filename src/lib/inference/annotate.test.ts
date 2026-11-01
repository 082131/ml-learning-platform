import { describe, expect, it } from 'vitest';
import { ann, annLine, lineOf, spanOf } from './annotate';

describe('annotation helpers', () => {
  const src = 'a = 1\nb = “x” + {{slot}}\nc = b';
  it('finds code-point columns on a 1-based line', () => {
    expect(spanOf(src, 2, '{{slot}}')).toEqual({ range: { line: 2, startCol: 12, endCol: 20 }, match: '{{slot}}' });
    expect(spanOf(src, 1, '1').range).toEqual({ line: 1, startCol: 4, endCol: 5 });
  });
  it('finds later occurrences and lines by content', () => {
    expect(spanOf('x = x + x', 1, 'x', 2).range.startCol).toBe(8);
    expect(lineOf(src, 'c =')).toBe(3);
    expect(annLine(src, 'l', 'b =', { kind: 'syntax', title: 't', what: 'w', why: 'y' }).range).toEqual({ line: 2 });
    expect(ann(src, 'i', 'c =', 'b', { kind: 'variable', title: 't', what: 'w', why: 'y' }).range.startCol).toBe(4);
  });
  it('throws when the text is missing', () => {
    expect(() => spanOf(src, 1, 'zzz')).toThrow();
    expect(() => lineOf(src, 'zzz')).toThrow();
  });
});
