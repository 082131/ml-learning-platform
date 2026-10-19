import { describe, expect, it } from 'vitest';
import { lineOf, span } from './annotate';
import { fillTemplate } from './template';

describe('span and lineOf', () => {
  const src = 'x = 1\ny = x + x\nz = "é" + {{a}}';
  it('finds code-point columns, including a later occurrence', () => {
    expect(span(src, 2, 'x')).toEqual({ range: { line: 2, startCol: 4, endCol: 5 }, match: 'x' });
    expect(span(src, 2, 'x', 1).range).toEqual({ line: 2, startCol: 8, endCol: 9 });
    expect(span(src, 3, '{{a}}').range).toEqual({ line: 3, startCol: 10, endCol: 15 });
  });
  it('throws when the text is missing', () => {
    expect(() => span(src, 1, 'y')).toThrow('not on line 1');
    expect(() => span(src, 9, 'y')).toThrow('does not exist');
  });
  it('finds the line of a text', () => {
    expect(lineOf(src, 'z =')).toBe(3);
    expect(lineOf(src, 'x', 2)).toBe(2);
  });
  it('fills slots and reports a missing one', () => {
    expect(fillTemplate(src, { a: '2' })).toContain('"é" + 2');
    expect(() => fillTemplate(src, {})).toThrow('No value for slot {{a}}');
  });
});
