import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { describeSumEntry, matrixOpsExperiment, resizeOps } from './matrixOps';

const A = [
  [1, 2, 3],
  [4, 5, 6],
];
const B = [
  [10, 0, -1],
  [2, 3, 4],
];
const exp = matrixOpsExperiment('t', A, B);

describe('matrix operations experiment', () => {
  // Printed by NumPy 2.5.3 for these A and B with the selection at [0, 2].
  it('reads out exactly what the lesson code prints', () => {
    const s = { ...exp.initial, focus: [0, 2] as [number, number] };
    const out = Object.fromEntries(exp.readout!(s, exp.compute(s)).map((r) => [r.label, r.value]));
    expect(out).toEqual({
      'print(A.shape)': '(2, 3)',
      'print(A[0, 2])': '3',
      'print(A[0])': '[1 2 3]',
      'print(A + B)': '[[11  2  2]\n [ 6  8 10]]',
      'print(A.T)': '[[1 4]\n [2 5]\n [3 6]]',
      'print(A.T.shape)': '(3, 2)',
    });
  });

  it('writes out one entry of the sum', () => {
    expect(describeSumEntry(A, B, 0, 2)).toBe('A[0][2] + B[0][2] = 3 + (-1) = 2');
  });

  it('resizes A and B together and keeps the selection inside', () => {
    const s = resizeOps({ ...exp.initial, focus: [1, 2] }, 1, 2);
    expect(s.A).toEqual([[1, 2]]);
    expect(s.B).toEqual([[10, 0]]);
    expect(s.focus).toEqual([0, 1]);
    expect(resizeOps(exp.initial, 3, 3).A[2]!.length).toBe(3);
  });

  it('is a valid experiment', () => expect(validateExperiment(exp)).toEqual([]));
});
