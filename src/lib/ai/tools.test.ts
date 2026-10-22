import { describe, expect, it } from 'vitest';
import { CalcError, calculate, formatResult } from './calculator';
import { lumenDocs } from './lumen';
import { runTool, TOOLS, validateArgs } from './tools';

describe('calculate', () => {
  it.each([
    ['2 + 3 * 4', 14],
    ['(2 + 3) * 4', 20],
    ['2480 * 0.175', 434],
    ['12 * 10 * 12 * 0.8', 1152],
    ['-3 - -2', -1],
    ['10 / 4', 2.5],
    ['.5 + 1', 1.5],
  ])('%s = %f', (expr, value) => {
    expect(calculate(expr)).toBeCloseTo(value, 10);
  });

  it('explains what is wrong and where', () => {
    expect(() => calculate('12 × 10')).toThrow('Unexpected character "×" at position 3');
    expect(() => calculate('2 +')).toThrow('Expression ended early: expected a number');
    expect(() => calculate('(1 + 2')).toThrow('expected ")"');
    expect(() => calculate('1 2')).toThrow('Unexpected "2" at position 2: expected an operator');
    expect(() => calculate('1 / 0')).toThrow(CalcError);
    expect(() => calculate('1.2.3')).toThrow('Malformed number');
    expect(() => calculate('__import__("os")')).toThrow(CalcError);
  });

  it('prints results without floating-point noise', () => {
    expect(formatResult(0.1 + 0.2)).toBe('0.3');
    expect(formatResult(1152)).toBe('1152');
  });
});

describe('tools', () => {
  const schema = TOOLS[0]!.input_schema;

  it('validates arguments against the schema', () => {
    expect(validateArgs(schema, { expression: '1 + 1' })).toEqual([]);
    expect(validateArgs(schema, {})).toEqual(['missing required argument "expression"']);
    expect(validateArgs(schema, { expression: 3, x: 1 })).toEqual(['"expression" must be a string', 'unknown argument "x"']);
    expect(validateArgs(schema, [1])).toEqual(['arguments must be a JSON object']);
  });

  it('runs the calculator and returns errors as results', () => {
    expect(runTool(lumenDocs, 'calculator', { expression: '12 * 100' })).toEqual({ ok: true, content: '1200' });
    expect(runTool(lumenDocs, 'calculator', { expression: '12 × 100' })).toMatchObject({ ok: false });
    expect(runTool(lumenDocs, 'weather', {})).toEqual({ ok: false, error: 'unknown tool "weather"' });
  });

  it('searches the help center with BM25 and returns the best passages with titles', () => {
    const r = runTool(lumenDocs, 'search_docs', { query: 'Team plan storage per member' });
    expect(r.ok).toBe(true);
    const content = (r as { content: string }).content;
    expect(content.split('\n')[0]).toMatch(/^\(Plans and pricing\) /);
    expect(content).toContain('Each Team member gets 100 GB');
    expect(runTool(lumenDocs, 'search_docs', { query: 'zzzz' })).toEqual({ ok: true, content: 'No matching passages.' });
  });
});
