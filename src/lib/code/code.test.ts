import { describe, expect, it } from 'vitest';
import type { Annotation, CodeExample } from '../types';
import { highlight, tokenClass } from './highlight';
import { plainTokens, splitSegments, type CodeToken } from './segments';
import { fillSlots, findSlots, resolveSlots } from './slots';
import { sliceOf, validateExample, validateTrace } from './validate';

const texts = (line: { text: string }[] | undefined) => line?.map((s) => s.text);

describe('splitSegments', () => {
  const tokens: CodeToken[][] = [
    [{ content: 'C = ' }, { content: 'np', cls: 'fn' }, { content: '.dot(A, B)' }],
    [{ content: 'print(C)' }],
  ];

  it('splits tokens at annotation boundaries and keeps syntax classes', () => {
    const [line] = splitSegments(tokens, [{ id: 'dot', range: { line: 1, startCol: 4, endCol: 10 } }]);
    expect(texts(line)).toEqual(['C = ', 'np', '.dot', '(A, B)']);
    expect(line?.map((s) => s.cls)).toEqual([undefined, 'fn', undefined, undefined]);
    expect(line?.map((s) => s.marks)).toEqual([[], ['dot'], ['dot'], []]);
    expect(line?.map((s) => s.start)).toEqual([0, 4, 6, 10]);
  });

  it('handles overlapping annotations: each segment lists every mark covering it', () => {
    const [line] = splitSegments(tokens, [
      { id: 'call', range: { line: 1, startCol: 4, endCol: 14 } },
      { id: 'args', range: { line: 1, startCol: 11, endCol: 15 } },
    ]);
    expect(texts(line)).toEqual(['C = ', 'np', '.dot(', 'A, ', 'B', ')']);
    expect(line?.map((s) => s.marks)).toEqual([[], ['call'], ['call'], ['call', 'args'], ['args'], []]);
  });

  it('whole-line annotations cover every segment of their line only', () => {
    const lines = splitSegments(tokens, [{ id: 'line2', range: { line: 2 } }]);
    expect(lines[0]?.every((s) => s.marks.length === 0)).toBe(true);
    expect(lines[1]?.map((s) => s.marks)).toEqual([['line2']]);
  });

  it('counts columns in code points, so emoji and accents are one column each', () => {
    const [line] = splitSegments(plainTokens('s = "héllo 👋!"'), [
      { id: 'wave', range: { line: 1, startCol: 11, endCol: 12 } },
    ]);
    expect(texts(line)).toEqual(['s = "héllo ', '👋', '!"']);
  });

  it('throws a RangeError for out-of-range annotations instead of rendering garbage', () => {
    expect(() => splitSegments(tokens, [{ id: 'far', range: { line: 3 } }])).toThrow(/"far".*2-line source/);
    expect(() =>
      splitSegments(tokens, [{ id: 'wide', range: { line: 2, startCol: 2, endCol: 99 } }]),
    ).toThrow(RangeError);
    expect(() =>
      splitSegments(tokens, [{ id: 'empty', range: { line: 2, startCol: 3, endCol: 3 } }]),
    ).toThrow(/empty or reversed/);
    expect(() => splitSegments(tokens, [{ id: 'half', range: { line: 2, startCol: 3 } }])).toThrow(/both/);
  });

  it('keeps empty lines as empty segment lists', () => {
    expect(splitSegments(plainTokens('a\n\nb'), [])).toEqual([
      [{ text: 'a', cls: undefined, start: 0, marks: [] }],
      [],
      [{ text: 'b', cls: undefined, start: 0, marks: [] }],
    ]);
  });
});

describe('highlight', () => {
  it('maps Shiki tokens to syntax classes and keeps the text intact', async () => {
    const source = 'import numpy as np\n# note\nx = "s" + 3';
    const lines = await highlight(source, 'python');
    expect(lines.map((l) => l.map((t) => t.content).join(''))).toEqual(source.split('\n'));
    const cls = (text: string) => lines.flat().find((t) => t.content === text)?.cls;
    expect([cls('import'), cls('# note'), cls('"s"'), cls('3')]).toEqual(['kw', 'com', 'str', 'num']);
  });

  it('ignores colors that are not theme variables', () => {
    expect(tokenClass('#ff0000')).toBeUndefined();
    expect(tokenClass('var(--sh-token-keyword)')).toBe('kw');
  });
});

const ann = (id: string, range: Annotation['range'], match?: string): Annotation => ({
  id,
  range,
  match,
  kind: 'variable',
  title: id,
  what: 'w',
  why: 'y',
});

describe('slots', () => {
  const source = 'A = {{A}}\nC = A @ {{B}}  # done';

  it('finds placeholders with their columns', () => {
    expect(findSlots(source)).toEqual([
      { name: 'A', line: 1, start: 4, end: 9 },
      { name: 'B', line: 2, start: 8, end: 13 },
    ]);
  });

  it('shifts annotation ranges after a placeholder is filled, and grows ranges that cover one', () => {
    const before = [
      ann('lit', { line: 1, startCol: 4, endCol: 9 }),
      ann('comment', { line: 2, startCol: 15, endCol: 21 }),
    ];
    const out = fillSlots(source, before, { A: '[[1, 2], [3, 4]]', B: 'np.eye(2)' });
    expect(out.source).toBe('A = [[1, 2], [3, 4]]\nC = A @ np.eye(2)  # done');
    expect(sliceOf(out.source, out.annotations[0]!.range)).toBe('[[1, 2], [3, 4]]');
    expect(sliceOf(out.source, out.annotations[1]!.range)).toBe('# done');
  });

  it('formats values from experiment state and rejects multi-line values', () => {
    const ex: CodeExample = {
      id: 'ex',
      language: 'python',
      source,
      annotations: [],
      slots: { A: (s) => JSON.stringify((s as { a: number[] }).a), B: () => 'B' },
    };
    expect(resolveSlots(ex, { a: [1, 2] })).toEqual({ A: '[1,2]', B: 'B' });
    expect(() => resolveSlots({ ...ex, slots: { A: () => '1\n2' } }, {})).toThrow(/one line/);
  });
});

describe('validateExample', () => {
  const base: CodeExample = {
    id: 'mm',
    language: 'python',
    source: 'C = np.dot(A, {{B}})',
    slots: { B: () => 'B' },
    annotations: [ann('np-dot', { line: 1, startCol: 4, endCol: 10 }, 'np.dot'), ann('line', { line: 1 })],
  };

  it('accepts a correct example', () => {
    expect(validateExample(base)).toEqual([]);
  });

  it('reports drift, out-of-range ranges, duplicate IDs, overlaps and slot mismatches', () => {
    const errors = validateExample({
      ...base,
      slots: { C: () => 'C' },
      annotations: [
        ann('np-dot', { line: 1, startCol: 4, endCol: 10 }, 'np.sum'),
        ann('np-dot', { line: 2 }),
        ann('inner', { line: 1, startCol: 7, endCol: 12 }),
        ann('cut', { line: 1, startCol: 16, endCol: 18 }),
      ],
    });
    expect(errors.join('\n')).toMatch(/match "np.sum" does not equal the source slice "np.dot"/);
    expect(errors.join('\n')).toMatch(/duplicate annotation id "np-dot"/);
    expect(errors.join('\n')).toMatch(/outside the 1-line source/);
    expect(errors.join('\n')).toMatch(/"np-dot" and "inner" overlap/);
    expect(errors.join('\n')).toMatch(/"cut" cuts into the \{\{B\}\} placeholder/);
    expect(errors.join('\n')).toMatch(/\{\{B\}\} has no slot formatter/);
    expect(errors.join('\n')).toMatch(/slot "C" is never used/);
  });

  it('only allows Pyodide runs for Python', () => {
    expect(validateExample({ ...base, language: 'sql', run: 'pyodide' })).toContain(
      'mm: only Python examples can run in Pyodide',
    );
  });
});

describe('validateTrace', () => {
  it('checks step ranges, notes and array shapes', () => {
    const errors = validateTrace(
      {
        source: 'computed',
        steps: [
          {
            range: { line: 1 },
            note: 'ok',
            vars: {
              a: {
                kind: 'array',
                shape: [2, 2],
                data: [
                  [1, 2],
                  [3, 4],
                ],
              },
            },
          },
          { range: { line: 3 }, note: '', vars: { b: { kind: 'array', shape: [3], data: [1, 2] } } },
        ],
      },
      'a = 1\nb = 2',
    );
    expect(errors).toHaveLength(3);
    expect(errors.join('\n')).toMatch(/step 2.*outside/);
  });
});
