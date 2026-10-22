import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import REAL from './fixtures/derivative-prints.json';
import {
  CALC_FUNCTIONS,
  centralDifference,
  clipLine,
  derivativeExperiment,
  forwardDifference,
} from './derivative';

const exp = derivativeExperiment('t', { fn: 'square', x: 1, h: '0.1' });
const printed = (fn: string, x: number, h: string) => {
  const s = { fn, x, h };
  return exp.readout!(s, exp.compute(s)).find((r) => r.label === 'print(...)')!.value;
};

describe('numerical derivatives', () => {
  it('hand-worked: f(x) = x² at x = 1 with h = 0.1', () => {
    const f = CALC_FUNCTIONS.square!.f;
    // (1.1² − 1) / 0.1 = 0.21 / 0.1 = 2.1; (1.21 − 0.81) / 0.2 = 2
    expect(forwardDifference(f, 1, 0.1)).toBeCloseTo(2.1, 12);
    expect(centralDifference(f, 1, 0.1)).toBeCloseTo(2, 12);
  });

  // fixtures/derivative-prints.json: the lesson's print line computed by CPython 3.13.
  it.each(REAL as [string, number, string, string][])('%s at x = %s, h = %s prints %s', (fn, x, h, out) => {
    expect(printed(fn, x, h)).toBe(out);
  });

  it('reports the missing derivative of |x| at 0', () => {
    const s = { fn: 'abs', x: 0, h: '0.1' };
    const items = exp.readout!(s, exp.compute(s));
    expect(items.find((i) => i.label === "f'(x)")!.status).toBe('error');
  });

  it('is a valid experiment', () => expect(validateExperiment(exp)).toEqual([]));
});

describe('clipLine', () => {
  it('cuts a steep line where it leaves the y range', () => {
    // y = 2x through the origin, inside x ∈ [−3, 3], y ∈ [−1, 4]: from (−0.5, −1) to (2, 4)
    expect(clipLine(0, 0, 2, [-3, 3], [-1, 4])).toEqual([
      [-0.5, -1],
      [2, 4],
    ]);
  });
  it('keeps a flat line inside the box and drops one outside it', () => {
    expect(clipLine(1, 2, 0, [-3, 3], [0, 5])).toEqual([
      [-3, 2],
      [3, 2],
    ]);
    expect(clipLine(1, 9, 0, [-3, 3], [0, 5])).toBeUndefined();
  });
});
