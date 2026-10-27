import { describe, expect, it } from 'vitest';
import { fillExample } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import type { CodeExample } from '../types';
import {
  BACKPROP_INITIAL as S0,
  BACKPROP_SOURCE,
  backpropExperiment,
  backpropPrint,
  backpropSlots,
  buildBackpropTrace,
  buildStages,
  computeBackprop,
  diagramAt,
  gradCheckRows,
  setBackpropParam,
  type BackpropState,
} from './backprop';

const example: CodeExample = {
  id: 'backprop-code',
  language: 'python',
  source: BACKPROP_SOURCE,
  annotations: [],
  slots: Object.fromEntries(
    Object.keys(backpropSlots(S0)).map((k) => [k, (s: unknown) => backpropSlots(s as BackpropState)[k]!]),
  ),
};

describe('backpropagation on the 2-2-1 network', () => {
  it('gives the gradients NumPy 2.5.3 gives (same network as deep.test.ts)', () => {
    const r = computeBackprop(S0);
    expect(r.loss).toBeCloseTo(0.2011818404185411, 12);
    expect(r.back.grads[1]!.dW.map((row) => row[0])).toEqual([
      expect.closeTo(0.074638469509, 11),
      expect.closeTo(0.064639442159, 11),
    ]);
    expect(r.back.grads[1]!.db[0]).toBeCloseTo(-0.221890297215, 11);
    expect(r.back.grads[0]!.dW[0]).toEqual([
      expect.closeTo(-0.049195935351, 11),
      expect.closeTo(0.060918003736, 11),
    ]);
    expect(r.back.grads[0]!.db).toEqual([
      expect.closeTo(-0.098391870703, 11),
      expect.closeTo(0.121836007471, 11),
    ]);
  });

  it('agrees with central-difference numerical gradients', () => {
    for (const s of [
      S0,
      { ...S0, x: [1.5, 0.3] as [number, number], y: 0 },
      { ...S0, x: [-2, 2] as [number, number] },
    ]) {
      const r = computeBackprop(s);
      expect(r.maxRelError).toBeLessThan(1e-8);
      const rows = gradCheckRows(r);
      expect(rows.map((row) => row.name)).toEqual([
        'W1[0][0]',
        'W1[0][1]',
        'W1[1][0]',
        'W1[1][1]',
        'b1[0]',
        'b1[1]',
        'W2[0]',
        'W2[1]',
        'b2',
      ]);
      for (const row of rows) expect(row.numeric).toBeCloseTo(row.exact, 8);
    }
  });

  it('lowers the loss with one gradient descent step, and prints what NumPy prints', () => {
    // Real output of BACKPROP_SOURCE with the same values (NumPy 2.5.3, CPython 3.13).
    const cases: [BackpropState, [string, string]][] = [
      [S0, ['loss before: 0.201182', 'loss after:  0.149336']],
      [{ ...S0, x: [1.5, 0.3], y: 0, lr: 4 }, ['loss before: 0.357722', 'loss after:  0.028662']],
      [{ ...S0, lr: 20 }, ['loss before: 0.201182', 'loss after:  0.000015']],
    ];
    for (const [s, out] of cases) {
      const r = computeBackprop(s);
      expect(backpropPrint(r)).toEqual(out);
      expect(r.lossAfter).toBeLessThan(r.loss);
    }
  });

  it('writes each chain-rule step out with its numbers', () => {
    const r = computeBackprop(S0);
    const stages = buildStages(S0, r);
    const at = (id: string) => stages.find((st) => st.id === id)!;
    expect(at('z1').arithmetic).toEqual([
      'z1[0] = 0.5·0.1 + (-1)·0.4 + 0 = -0.35',
      'z1[1] = 0.5·(-0.2) + (-1)·0.3 + 0.1 = -0.3',
    ]);
    expect(at('loss').arithmetic[0]).toBe('L = (0.5515 − 1)² = (-0.4485)² = 0.2012');
    expect(at('dA2').arithmetic[0]).toBe('∂L/∂ŷ = 2·(0.5515 − 1) / 1 = -0.8971');
    expect(at('dZ2').arithmetic[0]).toBe('∂L/∂z2 = (-0.8971) · 0.5515 · 0.4485 = -0.2219');
    expect(at('dW2').arithmetic[0]).toBe('∂L/∂W2[0] = (-0.3364) · (-0.2219) = 0.0746');
    expect(at('dA1').arithmetic[1]).toBe('∂L/∂a1[1] = (-0.2219) · (-0.6) = 0.1331');
    expect(at('dW1').arithmetic[0]).toBe('∂L/∂W1[0][0] = 0.5 · (-0.0984) = -0.0492');
    expect(at('update').arithmetic[0]).toBe('W2[0] ← 0.5 − 0.5 · 0.0746 = 0.4627');
    expect(stages.filter((st) => st.phase === 'backward').map((st) => st.line)).toEqual([
      18, 19, 20, 21, 22, 23, 24, 25,
    ]);
  });

  it('reveals values and gradients on the diagram as the walk-through reaches them', () => {
    const r = computeBackprop(S0);
    const stages = buildStages(S0, r);
    const first = diagramAt(S0, r, stages, 0);
    expect(first.layers[1]!.units[0]!.value).toBe('?');
    expect(first.flow).toBe('forward');
    const dW2 = diagramAt(
      S0,
      r,
      stages,
      stages.findIndex((st) => st.id === 'dW2'),
    );
    expect(dW2.flow).toBe('backward');
    expect(dW2.layers[2]!.units[0]!.sub).toBe('g -0.2219');
    expect(dW2.layers[1]!.units[0]!.sub).toBeUndefined();
    expect(dW2.edges.find((e) => e.layer === 2 && e.from === 0)).toMatchObject({
      active: true,
      label: 'g 0.0746',
    });
  });

  it('builds a valid computed trace and experiment', () => {
    const trace = buildBackpropTrace(S0);
    expect(validateTrace(trace, fillExample(example, S0).source)).toEqual([]);
    expect(trace.steps.at(-1)!.vars.output).toEqual({
      kind: 'text',
      value: 'loss before: 0.201182\nloss after:  0.149336',
    });
    expect(validateExperiment(backpropExperiment('b', 'backprop-code'))).toEqual([]);
  });
});

describe('setBackpropParam', () => {
  it('changes one parameter and leaves the state it came from alone', () => {
    expect(setBackpropParam(S0, 'W1', 1, 0, 2).W1).toEqual([
      [0.1, -0.2],
      [2, 0.3],
    ]);
    expect(setBackpropParam(S0, 'b2', 0, 0, -1).b2).toEqual([-1]);
    expect(S0.W1[1]).toEqual([0.4, 0.3]);
  });
});
