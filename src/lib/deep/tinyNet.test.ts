import { describe, expect, it } from 'vitest';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import {
  buildTorchTrace,
  initialNetwork,
  maxDifferenceFromTorch,
  runTiny,
  TORCH_RECORD,
  TORCH_SOURCE,
  tinyNetExperiment,
} from './tinyNet';
import { forward } from './mlp';

describe('the TypeScript twin of tiny_net.py', () => {
  it('stores nn.Linear weights transposed: X @ W equals X @ weight.T', () => {
    const net = initialNetwork();
    // hidden.weight row 0 is [0.5, −0.3], so for x = (0, 1) unit 0 gets −0.3 + bias 0.1 = −0.2 before tanh.
    expect(net[0]!.W).toEqual([
      [0.5, 0.8, -0.4],
      [-0.3, 0.2, 0.6],
    ]);
    expect(forward(net, [[0, 1]]).Z[0]![0]![0]).toBeCloseTo(-0.2, 12);
  });

  it('first loss by hand: mean BCE of the four initial predictions', () => {
    const p = forward(initialNetwork(), [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]).A[2]!.map((r) => r[0]!);
    const y = [0, 1, 1, 0];
    const bce = -p.reduce((s, pi, i) => s + (y[i]! * Math.log(pi) + (1 - y[i]!) * Math.log(1 - pi)), 0) / 4;
    expect(runTiny(0.5, 1).steps[0]!.loss).toBeCloseTo(bce, 12);
  });

  it('reproduces the PyTorch 2.14.1 run: losses, predictions, gradients and parameters within float32 precision', () => {
    expect(TORCH_RECORD.torch).toBe('2.14.1');
    const run = runTiny(0.5, 3);
    expect(maxDifferenceFromTorch(run)).toBeLessThan(1e-6);
    expect(run.steps.map((s) => Number(s.loss.toFixed(6)))).toEqual([0.70559, 0.704199, 0.702961]);
    expect(TORCH_RECORD.printed).toBe(
      '0 0.70559\n1 0.704199\n2 0.702961\ntensor([0.5315, 0.5023, 0.4945, 0.4813])\n',
    );
    expect(run.final.map((p) => p.toFixed(4))).toEqual(['0.5315', '0.5023', '0.4945', '0.4813']);
  });

  it('learns XOR with enough steps, and hardly moves at lr = 0.01 (claims in the lesson)', () => {
    const final = runTiny(2, 300).final;
    expect(final.map((p) => (p >= 0.5 ? 1 : 0))).toEqual([0, 1, 1, 0]);
    expect(final[1]).toBeGreaterThan(0.95);
    expect(runTiny(0.01, 300).steps.at(-1)!.loss).toBeGreaterThan(0.69);
  });

  it('has a simulated trace that fits the shown source, and a valid experiment', () => {
    const trace = buildTorchTrace();
    expect(trace.source).toBe('simulated');
    expect(validateTrace(trace, TORCH_SOURCE)).toEqual([]);
    expect(trace.steps.at(-1)!.vars.output).toEqual({
      kind: 'text',
      value: 'tensor([0.5315, 0.5023, 0.4945, 0.4813])',
    });
    const def = tinyNetExperiment('tiny');
    expect(validateExperiment(def)).toEqual([]);
    expect(def.readout!(def.initial, def.compute(def.initial)).at(-1)!.value).toMatch(
      /^largest difference \d\.\de-\d+/,
    );
  });
});
