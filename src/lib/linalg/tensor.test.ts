import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import REAL from './fixtures/tensor-prints.json';
import {
  applyOp,
  arange3,
  destination,
  formatNumpyInt,
  ravel,
  tensorExperiment,
  tensorSlots,
  unravel,
  type Shape3,
  type TensorOp,
} from './tensor';

const OPS: TensorOp[] = ['flatten', 'merge', 'transpose'];

describe('tensor indexing', () => {
  it('ravels and unravels in row-major order (hand-worked for shape (2, 2, 3))', () => {
    expect(ravel([1, 0, 2], [2, 2, 3])).toBe(8); // 1·6 + 0·3 + 2
    expect(unravel(8, [2, 2, 3])).toEqual([1, 0, 2]);
  });

  it('follows one entry through each operation', () => {
    const shape: Shape3 = [2, 2, 3];
    expect(destination('flatten', shape, [1, 1, 0])).toEqual([1, 3]); // 9 sits at y[1, 3]
    expect(destination('merge', shape, [1, 1, 0])).toEqual([3, 0]);
    expect(destination('transpose', shape, [1, 1, 0])).toEqual([1, 0, 1]);
  });

  it('every entry of y holds the value its source entry had', () => {
    const shape: Shape3 = [3, 2, 4];
    const x = arange3(shape);
    for (const op of OPS) {
      const y = applyOp(op, shape) as unknown as number[] | number[][];
      x.forEach((m, i) =>
        m.forEach((row, j) =>
          row.forEach((v, k) => {
            const at = destination(op, shape, [i, j, k]).reduce<unknown>((t, n) => (t as unknown[])[n], y);
            expect(at).toBe(v);
          }),
        ),
      );
    }
  });
});

describe('NumPy printouts (fixtures/tensor-prints.json, from NumPy 2.5.3)', () => {
  it.each(Object.entries(REAL))('shape (%s)', (key, prints) => {
    const shape = key.split(',').map(Number) as Shape3;
    expect(formatNumpyInt(arange3(shape))).toBe(prints.x);
    for (const op of OPS) expect(formatNumpyInt(applyOp(op, shape))).toBe(prints[op]);
  });
});

describe('tensor experiment', () => {
  const exp = tensorExperiment('t', { shape: [2, 2, 3], op: 'flatten', focus: [1, 1, 0] });
  it('fills the code slots and the readout from one state', () => {
    expect(tensorSlots.op(exp.initial)).toBe('x.reshape(2, 6)');
    expect(tensorSlots.shape(exp.initial)).toBe('2, 2, 3');
    const out = Object.fromEntries(exp.readout!(exp.initial, exp.compute(exp.initial)).map((r) => [r.label, r.value]));
    expect(out['Selected entry']).toBe('x[1, 1, 0] → y[1, 3]');
    expect(out["print(x.shape, '->', y.shape)"]).toBe('(2, 2, 3) -> (2, 6)');
  });
  it('keeps the selection inside a smaller shape', () => {
    const shrink = exp.controls.find((c) => c.id === 'd0')!;
    if (shrink.kind !== 'slider') throw new Error('slider expected');
    expect(shrink.set(exp.initial, 1).focus).toEqual([0, 1, 0]);
  });
  it('is a valid experiment', () => expect(validateExperiment(exp)).toEqual([]));
});
