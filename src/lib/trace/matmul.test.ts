import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { buildMatMulTrace, describeEntry, MATMUL_LOOP_SOURCE, matmulLoopSlots } from './matmul';
import { array, scalar, text } from './values';

const A = [
  [1, 2, 3],
  [4, 5, 6],
];
const B = [
  [7, 8],
  [9, 10],
  [11, 12],
];

describe('buildMatMulTrace', () => {
  const trace = buildMatMulTrace(A, B);

  it('has one multiply-add step per (i, j, k): 2·2·3 = 12, plus setup, loop headers and print', () => {
    expect(trace.source).toBe('computed');
    const adds = trace.steps.filter((s) => s.range.line === 7);
    expect(adds).toHaveLength(12);
    expect(trace.steps).toHaveLength(3 + 2 + 4 * 2 + 12 + 1);
  });

  it('matches the hand-worked entry C[0][1] = 1·8 + 2·10 + 3·12 = 64, step by step', () => {
    const c01 = trace.steps.filter(
      (s) =>
        s.range.line === 7 &&
        s.vars.i?.kind === 'scalar' &&
        s.vars.i.value === 0 &&
        (s.vars.j as { value: number }).value === 1,
    );
    expect(c01.map((s) => s.note)).toEqual([
      'k = 0: A[0][0] · B[0][1] = 1 · 8 = 8, so C[0][1] = 0 + 8 = 8.',
      'k = 1: A[0][1] · B[1][1] = 2 · 10 = 20, so C[0][1] = 8 + 20 = 28.',
      'k = 2: A[0][2] · B[2][1] = 3 · 12 = 36, so C[0][1] = 28 + 36 = 64.',
    ]);
    expect(c01[1]?.highlight).toEqual({ A: [[0, 1]], B: [[1, 1]], C: [[0, 1]] });
    expect(c01[2]?.vars.C).toEqual(
      array([
        [58, 64],
        [0, 0],
      ]),
    );
  });

  it('ends with the full product printed', () => {
    const last = trace.steps.at(-1)!;
    expect(last.vars.C).toEqual(
      array([
        [58, 64],
        [139, 154],
      ]),
    );
    expect(last.vars.output).toEqual(text('[[58, 64], [139, 154]]'));
    expect(last.vars.k).toEqual(scalar(2));
  });

  it('fits the filled loop source, including at other shapes', () => {
    const check = (a: number[][], b: number[][]) =>
      validateTrace(buildMatMulTrace(a, b), fillSlots(MATMUL_LOOP_SOURCE, [], matmulLoopSlots(a, b)).source);
    expect(check(A, B)).toEqual([]);
    expect(check([[2]], [[3]])).toEqual([]);
    expect(check([[1, -2, 3, 4]], [[1], [2], [3], [4]])).toEqual([]);
    const filled = fillSlots(MATMUL_LOOP_SOURCE, [], matmulLoopSlots(A, B)).source.split('\n');
    expect(filled[2]).toBe('C = [[0] * 2 for _ in range(2)]');
    expect(filled[6]!.slice(12, 40)).toBe('C[i][j] += A[i][k] * B[k][j]');
  });

  it('refuses shapes that cannot be multiplied', () => {
    expect(() => buildMatMulTrace(A, A)).toThrow(/A has 3 columns but B has 2 rows/);
  });
});

describe('describeEntry', () => {
  it('writes out the sum for one entry, bracketing negatives', () => {
    expect(describeEntry(A, B, 1, 0)).toEqual({
      symbolic: 'A[1][0]·B[0][0] + A[1][1]·B[1][0] + A[1][2]·B[2][0]',
      numbers: '4·7 + 5·9 + 6·11',
      products: '28 + 45 + 66',
      sum: 139,
    });
    expect(describeEntry([[-1, 2]], [[3], [-4]], 0, 0)).toMatchObject({
      numbers: '(-1)·3 + 2·(-4)',
      products: '(-3) + (-8)',
      sum: -11,
    });
  });
});

describe('loop variables', () => {
  it('stay in scope after their loop ends, as in Python', () => {
    const steps = buildMatMulTrace(A, B).steps;
    // The step that starts entry C[0][1]: k still holds 2 from the previous entry.
    const startC01 = steps.find(
      (s) => s.range.line === 5 && (s.vars.j as { value: number } | undefined)?.value === 1,
    )!;
    expect(startC01.vars.k).toEqual(scalar(2));
    expect(steps[3]!.vars).not.toHaveProperty('j');
  });
});
