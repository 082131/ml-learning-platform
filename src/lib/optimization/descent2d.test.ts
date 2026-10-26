import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  BEST,
  CONTOUR_LEVELS,
  descent2DExperiment,
  descentSlots,
  gradientAt,
  levelSet,
  lossAt,
  printRounded,
  pySum,
  runDescent2D,
} from './descent2d';
import fixture from './fixtures/descent-prints.json';
import { pyRepr } from '../linalg/pyFormat';

describe('descent2d', () => {
  it('pySum compensates like CPython’s sum', () => {
    expect(pySum([0.1, 0.2, 0.3])).toBe(0.6); // a plain left-to-right sum gives 0.6000000000000001
    expect([0.1, 0.2, 0.3].reduce((a, b) => a + b, 0)).toBe(0.6000000000000001);
    expect(pySum(Array(10).fill(0.1))).toBe(1);
  });

  it('has its minimum at the least-squares line w = 1.8, b = 0.8 with loss 0.2', () => {
    expect(lossAt(BEST.w, BEST.b)).toBeCloseTo(BEST.loss, 12);
    const [dw, db] = gradientAt(BEST.w, BEST.b);
    expect(Math.abs(dw)).toBeLessThan(1e-12);
    expect(Math.abs(db)).toBeLessThan(1e-12);
  });

  it('draws level sets on which the loss equals the level', () => {
    for (const level of CONTOUR_LEVELS)
      for (const [w, b] of levelSet(level, 24)) expect(lossAt(w, b)).toBeCloseTo(level, 9);
  });

  it(`reproduces CPython ${fixture.python}’s printout for ${fixture.cases.length} slider settings`, () => {
    for (const c of fixture.cases) {
      const r = runDescent2D(c.w0, c.b0, c.lr, c.steps);
      const [w, b] = r.path.at(-1)!;
      expect(pyRepr(w), JSON.stringify(c)).toBe(c.w);
      expect(pyRepr(b), JSON.stringify(c)).toBe(c.b);
      expect(pyRepr(r.finalLoss), JSON.stringify(c)).toBe(c.loss);
      expect(printRounded(w, b, r.finalLoss)).toBe(c.printed);
    }
  });

  it('flags a learning rate that makes the loss go up', () => {
    expect(runDescent2D(-1, 5, 0.1, 30).status).toBe('ok');
    expect(runDescent2D(-1, 5, 0.3, 100).status).toBe('up');
  });

  it('is a valid experiment whose slots are float literals', () => {
    const def = descent2DExperiment('d', { lr: 0.1, w0: -1, b0: 5, steps: 30, inspect: 0 });
    expect(validateExperiment(def)).toEqual([]);
    const s = def.initial;
    expect([descentSlots.w0(s), descentSlots.b0(s), descentSlots.lr(s), descentSlots.steps(s)]).toEqual([
      '-1.0',
      '5.0',
      '0.1',
      '30',
    ]);
    expect(def.controls.find((c) => c.id === 'lr')!.kind).toBe('slider');
    const lr = def.controls.find((c) => c.id === 'lr');
    if (lr?.kind === 'slider') expect(lr.set(s, 0.07 + 1e-17 * 3).lr).toBe(0.07);
    expect(def.readout!(s, def.compute(s)).at(-1)).toEqual({
      label: 'What the code prints',
      value: '1.4638 1.5179 0.3869',
    });
  });
});
