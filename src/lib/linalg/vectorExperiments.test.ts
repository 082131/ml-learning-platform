import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  describeDot,
  describeScale,
  describeSum,
  dotProductExperiment,
  dotProductResult,
  printDot,
  vectorBasicsExperiment,
} from './vectorExperiments';

const basics = vectorBasicsExperiment('t', { u: [3, 1], v: [1, 2], k: 1.5 });
const readout = (u: [number, number], v: [number, number], k: number) => {
  const s = { u, v, k };
  return Object.fromEntries(basics.readout!(s, basics.compute(s)).map((i) => [i.label, i.value]));
};

describe('vector basics', () => {
  it('writes out the arithmetic of u + v and k·u', () => {
    expect(describeSum([3, 1], [1, -2])).toBe('(4, -1) = (3 + 1, 1 + (-2))');
    expect(describeScale(1.5, [3, 1])).toBe('(4.5, 1.5) = (1.5·3, 1.5·1)');
  });

  // Printed by NumPy 2.5.3: print(u + v) and print(k * u) for these literals.
  it.each([
    [[3, 1], [1, 2], 1.5, '[4 3]', '[4.5 1.5]'],
    [[2.5, -1], [1, 2], 0, '[3.5 1. ]', '[ 0. -0.]'],
    [[3, 1], [1, 2], 2, '[4 3]', '[6 2]'],
    [[-3, 1], [1, 2], -0.5, '[-2  3]', '[ 1.5 -0.5]'],
  ] as const)('u=%j v=%j k=%s prints %s and %s', (u, v, k, sum, scaled) => {
    const r = readout([...u], [...v], k);
    expect(r['print(u + v)']).toBe(sum);
    expect(r['print(k * u)']).toBe(scaled);
  });

  it('treats a dragged −0 as 0, as the Python literal does', () => {
    expect(readout([-0, 2.5], [0, 0], 1)['print(u + v)']).toBe('[0.  2.5]');
  });

  it('is a valid experiment', () => expect(validateExperiment(basics)).toEqual([]));
});

// u, v, print(np.dot(u, v)), print(cos), warnings: from NumPy 2.5.3 (see the lesson's code.ts).
const REAL = [[[3, 1], [1, 2], "5", "0.7071067811865475", []], [[2.5, -1], [1, 2], "0.5", "0.08304547985373997", []], [[3, 4], [4, -3], "0", "0.0", []], [[-1.5, 0.5], [2, -4.5], "-5.25", "-0.6742693640213323", []], [[1, 1], [-1, -1], "-2", "-0.9999999999999998", []], [[0, 0], [1, 2], "0", "nan", ["invalid value encountered in scalar divide"]], [[5, 5], [0.5, 0], "2.5", "0.7071067811865475", []]] as [number[], number[], string, string, string[]][];

describe('dot product', () => {
  it('writes out the products and the sum', () => {
    expect(describeDot([3, 1], [1, 2])).toBe('5 = 3·1 + 1·2 = 3 + 2');
    expect(describeDot([-1.5, 0.5], [2, -4.5])).toBe('-5.25 = (-1.5)·2 + 0.5·(-4.5) = (-3) + (-2.25)');
  });

  it.each(REAL)('u=%j v=%j prints %s and cos %s', (u, v, d, cos) => {
    const r = dotProductResult(u, v);
    expect(printDot(u, v, r.dot)).toBe(d);
    const exp = dotProductExperiment('d', { u: [u[0]!, u[1]!], v: [v[0]!, v[1]!] });
    const items = exp.readout!(exp.initial, exp.compute(exp.initial));
    expect(items.find((i) => i.label === 'print(cos)')!.value.split(' ')[0]).toBe(cos);
  });

  it('hand-worked: (3, 4) and (4, −3) are perpendicular', () => {
    const r = dotProductResult([3, 4], [4, -3]);
    expect(r.dot).toBe(0);
    expect(r.normU).toBe(5);
    expect(r.angle).toBe(90);
  });

  it('flags a zero vector instead of showing an angle', () => {
    const exp = dotProductExperiment('z', { u: [0, 0], v: [1, 2] });
    const items = exp.readout!(exp.initial, exp.compute(exp.initial));
    expect(items.find((i) => i.label === 'cos θ')!.status).toBe('error');
    expect(items.some((i) => i.label === 'θ')).toBe(false);
  });
});
