import { describe, expect, it } from 'vitest';
import { indent } from './editing';

describe('indent', () => {
  it('inserts four spaces at the cursor', () => {
    expect(indent({ value: 'ab', start: 1, end: 1 }, false)).toEqual({ value: 'a    b', start: 5, end: 5 });
  });

  it('indents and dedents every selected line', () => {
    const value = 'x = 1\nif x:\ny = 2';
    const indented = indent({ value, start: 6, end: value.length }, false);
    expect(indented.value).toBe('x = 1\n    if x:\n    y = 2');
    expect(indented.value.slice(indented.start, indented.end)).toBe('if x:\n    y = 2');
    const back = indent(indented, true);
    expect(back.value).toBe(value);
  });

  it('dedents only the spaces that exist', () => {
    expect(indent({ value: '  a', start: 3, end: 3 }, true)).toEqual({ value: 'a', start: 1, end: 1 });
  });
});
