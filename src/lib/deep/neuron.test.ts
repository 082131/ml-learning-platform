import { describe, expect, it } from 'vitest';
import { fillExample } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import type { ActivationId } from './activations';
import {
  buildNeuronTrace,
  collapseAt,
  collapseCurve,
  computeNeuron,
  describeCollapse,
  describeA,
  describeZ,
  NEURON_INITIAL,
  NEURON_SOURCE,
  neuronExperiment,
  neuronPrint,
  neuronSlots,
  type NeuronState,
} from './neuron';

const state = (x: [number, number], w: [number, number], b: number, act: ActivationId): NeuronState => ({
  x,
  w,
  b,
  act,
});

describe('single neuron', () => {
  it('computes z = 0.5·1 + (-1)·2 + 0.5 = -1 and σ(-1) = 0.2689 for the lesson example', () => {
    const r = computeNeuron(NEURON_INITIAL);
    expect(r.z).toBe(-1);
    expect(r.a).toBeCloseTo(0.268941421, 9);
    expect(r.slope).toBeCloseTo(0.268941421 * (1 - 0.268941421), 9);
    expect(describeZ(NEURON_INITIAL)).toBe(
      'z = w[0]·x[0] + w[1]·x[1] + b = 0.5·1 + (-1)·2 + 0.5 = 0.5 + (-2) + 0.5 = -1',
    );
    expect(describeA('sigmoid', -1)).toBe(
      'a = σ(z) = 1 / (1 + e^(−z)) = 1 / (1 + e^(1)) = 1 / (1 + 2.7183) = 0.2689',
    );
    expect(describeA('relu', -1)).toBe('a = ReLU(z) = max(0, -1) = 0');
  });

  it('prints what NumPy 2.5.3 prints for the same code', () => {
    // Each expected line is the real output of NEURON_SOURCE filled with these values (CPython 3.13).
    const cases: [NeuronState, string][] = [
      [state([1, 2], [0.5, -1], 0.5, 'sigmoid'), 'z = -1.0000, a = 0.2689'],
      [state([1, 2], [0.5, -1], 0.5, 'tanh'), 'z = -1.0000, a = -0.7616'],
      [state([1, 2], [0.5, -1], 0.5, 'relu'), 'z = -1.0000, a = 0.0000'],
      [state([-2.3, 0.7], [1.9, -2.8], 0.3, 'identity'), 'z = -6.0300, a = -6.0300'],
      [state([0.1, 0.2], [3, -0.1], -0.3, 'relu'), 'z = -0.0200, a = 0.0000'],
      [state([2.9, -3], [-1.7, 2.2], 1.1, 'sigmoid'), 'z = -10.4300, a = 0.0000'],
      [state([0.3, 0.3], [0.7, 0.3], 0, 'tanh'), 'z = 0.3000, a = 0.2913'],
    ];
    for (const [s, out] of cases) expect(neuronPrint(computeNeuron(s))).toBe(out);
  });

  it('fills the code with Python float literals and the NumPy activation', () => {
    const slots = neuronSlots(state([1, -0.5], [2, 0], 0, 'relu'));
    expect(slots).toEqual({ x1: '1.0', x2: '-0.5', w1: '2.0', w2: '0.0', b: '0.0', f: 'np.maximum(0, z)' });
  });

  it('traces every line with in-bounds ranges', () => {
    const exp = neuronExperiment('n', 'neuron-code');
    const trace = buildNeuronTrace(NEURON_INITIAL);
    const { source } = fillExample(
      {
        id: 'neuron-code',
        language: 'python',
        source: NEURON_SOURCE,
        annotations: [],
        slots: Object.fromEntries(
          Object.keys(neuronSlots(NEURON_INITIAL)).map((k) => [
            k,
            (s: unknown) => neuronSlots(s as NeuronState)[k]!,
          ]),
        ),
      },
      NEURON_INITIAL,
    );
    expect(validateTrace(trace, source)).toEqual([]);
    expect(trace.steps.map((s) => s.range.line)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(trace.steps[3]!.note).toContain('= -1.');
    expect(trace.steps.at(-1)!.vars.output).toEqual({ kind: 'text', value: 'z = -1.0000, a = 0.2689' });
    expect(validateExperiment(exp)).toEqual([]);
  });

  it('keeps slider values to one decimal', () => {
    const exp = neuronExperiment('n', 'neuron-code');
    const w1 = exp.controls.find((c) => c.id === 'w1')!;
    if (w1.kind !== 'slider') throw new Error('w1 is a slider');
    expect(w1.set(NEURON_INITIAL, 0.1 + 0.2).w[0]).toBe(0.3);
  });
});

describe('two linear layers collapse into one', () => {
  it('matches the hand-worked and NumPy values at x = [1, 2]', () => {
    // h = [1·1 + 2·(-1) + 0.5, 1·(-1) + 2·0.5 + 0.5] = [-0.5, 0.5]; W = W1 @ W2 = [1, -1.5]; c = 1
    const lin = collapseAt([1, 2], 'identity');
    expect(lin.h).toEqual([-0.5, 0.5]);
    expect(lin.W).toEqual([1, -1.5]);
    expect(lin.c).toBe(1);
    expect(lin.y).toBe(-1);
    expect(lin.yLinear).toBe(-1);
    // With ReLU the negative hidden value becomes 0: y = 0·2 + 0.5·1 - 0.5 = 0
    const relu = collapseAt([1, 2], 'relu');
    expect(relu.fh).toEqual([0, 0.5]);
    expect(relu.y).toBe(0);
  });

  it('is a straight line without an activation and bends with one', () => {
    const lin = collapseCurve(2, 'identity');
    expect(lin.every((p) => Math.abs(p.y - p.yLinear) < 1e-12)).toBe(true);
    const bent = collapseCurve(2, 'tanh');
    expect(bent.some((p) => Math.abs(p.y - p.yLinear) > 0.1)).toBe(true);
  });
});

describe('describeCollapse', () => {
  it('writes the collapse arithmetic out with numbers', () => {
    const d = describeCollapse([1, 2], 'relu');
    expect(d.hidden).toBe('h = x @ W1 + b1 = [1·1 + 2·(-1) + 0.5, 1·(-1) + 2·0.5 + 0.5] = [-0.5, 0.5]');
    expect(d.twoLayers).toBe('y = f(h) @ W2 + b2 = 0·2 + 0.5·1 + (-0.5) = 0');
    expect(d.merged).toBe('W = W1 @ W2 = [1, -1.5], c = b1 @ W2 + b2 = 1');
    expect(d.oneLayer).toBe('x @ W + c = 1·1 + 2·(-1.5) + 1 = -1');
    expect(d.same).toBe(false);
    expect(describeCollapse([1, 2], 'identity').same).toBe(true);
  });
});
