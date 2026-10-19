import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { matmulExperiment, resizeMatMul, setCell } from './matmulExperiment';

const A = [
  [1, 2, 3],
  [4, 5, 6],
];
const B = [
  [7, 8],
  [9, 10],
  [11, 12],
];
const def = matmulExperiment('mm', A, B, 'loop');

describe('matmulExperiment', () => {
  it('is valid and reads out the shape, NumPy’s printout and the work done', () => {
    expect(validateExperiment(def)).toEqual([]);
    expect(def.readout!(def.initial, def.compute(def.initial))).toEqual([
      { label: 'NumPy: print(C.shape)', value: '(2, 2)' },
      { label: 'NumPy: print(C)', value: '[[ 58  64]\n [139 154]]' },
      { label: 'Multiply-adds (m·n·p)', value: '2·3·2 = 12' },
    ]);
  });

  it('keeps A and B compatible when a size changes, and keeps typed values', () => {
    const grown = resizeMatMul(def.initial, 'n', 4);
    expect(grown.A).toEqual([
      [1, 2, 3, 2],
      [4, 5, 6, 5],
    ]);
    expect(grown.B.length).toBe(4);
    expect(grown.B[3]).toEqual([5, 2]);
    const shrunk = resizeMatMul({ ...def.initial, focus: [1, 1] }, 'p', 1);
    expect(shrunk.B).toEqual([[7], [9], [11]]);
    expect(shrunk.focus).toEqual([1, 0]);
    expect(def.compute(shrunk).C).toEqual([[58], [139]]);
  });

  it('edits single cells immutably and recomputes the product', () => {
    const s = setCell(def.initial, 'A', 0, 1, 5);
    expect(def.initial.A[0]).toEqual([1, 2, 3]);
    expect(def.compute(s).C[0]).toEqual([1 * 7 + 5 * 9 + 3 * 11, 1 * 8 + 5 * 10 + 3 * 12]);
    expect(def.trace!(s).steps.length).toBe(26);
  });
});
