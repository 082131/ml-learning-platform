import { describe, expect, it } from 'vitest';
import { ACTIVATIONS } from './activations';
import {
  backward,
  forward,
  initNetwork,
  loss,
  lossAndGrads,
  maxRelativeError,
  numericalGrads,
  parameterCount,
  sgdStep,
  type Network,
} from './mlp';
import { mulberry32, permutation } from './rng';

// A 2-2-1 network checked against NumPy 2.5.3 (tanh hidden layer, sigmoid output, MSE loss).
const net: Network = [
  {
    W: [
      [0.1, -0.2],
      [0.4, 0.3],
    ],
    b: [0, 0.1],
    activation: 'tanh',
  },
  { W: [[0.5], [-0.6]], b: [0.2], activation: 'sigmoid' },
];
const X = [[0.5, -1]];
const Y = [[1]];

describe('activations', () => {
  it('match hand-worked values and derivatives', () => {
    expect(ACTIVATIONS.sigmoid.f(0)).toBe(0.5);
    expect(ACTIVATIONS.sigmoid.df(0)).toBe(0.25);
    expect(ACTIVATIONS.relu.f(-2)).toBe(0);
    expect(ACTIVATIONS.relu.f(3)).toBe(3);
    expect(ACTIVATIONS.relu.df(0)).toBe(0);
    expect(ACTIVATIONS.tanh.df(0)).toBe(1);
    expect(ACTIVATIONS.identity.df(5)).toBe(1);
  });
  it('have derivatives that agree with finite differences', () => {
    for (const a of Object.values(ACTIVATIONS))
      for (const z of [-1.7, -0.3, 0.4, 2.2]) {
        const numeric = (a.f(z + 1e-6) - a.f(z - 1e-6)) / 2e-6;
        expect(a.df(z)).toBeCloseTo(numeric, 6);
      }
  });
});

describe('forward and backward on a 2-2-1 network', () => {
  it('computes Z and A layer by layer (z1 = 0.5·0.1 + (−1)·0.4 + 0 = −0.35)', () => {
    const { Z, A } = forward(net, X);
    expect(Z[0]![0]![0]).toBeCloseTo(-0.35, 12);
    expect(Z[0]![0]![1]).toBeCloseTo(-0.3, 12);
    expect(A[1]![0]![0]).toBeCloseTo(-0.336375544336, 11);
    expect(Z[1]![0]![0]).toBeCloseTo(0.206599795303, 11);
    expect(A[2]![0]![0]).toBeCloseTo(0.55146701301, 10);
    expect(loss('mse', A[2]!, Y)).toBeCloseTo(0.2011818404185411, 12);
  });

  it('gives the gradients NumPy gives', () => {
    const { grads } = backward(net, forward(net, X), Y, 'mse');
    expect(grads[1]!.dW[0]![0]).toBeCloseTo(0.074638469509, 11);
    expect(grads[1]!.dW[1]![0]).toBeCloseTo(0.064639442159, 11);
    expect(grads[1]!.db[0]).toBeCloseTo(-0.221890297215, 11);
    expect(grads[0]!.dW[0]).toEqual([
      expect.closeTo(-0.049195935351, 11),
      expect.closeTo(0.060918003736, 11),
    ]);
    expect(grads[0]!.dW[1]![1]).toBeCloseTo(-0.121836007471, 11);
    expect(grads[0]!.db).toEqual([expect.closeTo(-0.098391870703, 11), expect.closeTo(0.121836007471, 11)]);
  });

  it('agrees with numerical gradients for every loss and activation', () => {
    const Xb = [
      [0.5, -1],
      [-0.3, 0.8],
      [1.2, 0.1],
    ];
    const Yb = [[1], [0], [1]];
    for (const hidden of ['tanh', 'sigmoid', 'relu'] as const)
      for (const lossId of ['mse', 'bce'] as const) {
        const n = initNetwork([2, 3, 1], hidden, 'sigmoid', 7);
        const exact = lossAndGrads(n, Xb, Yb, lossId).grads;
        expect(maxRelativeError(exact, numericalGrads(n, Xb, Yb, lossId))).toBeLessThan(1e-6);
      }
  });

  it('lowers the loss with a small gradient step', () => {
    const before = lossAndGrads(net, X, Y, 'mse');
    const after = lossAndGrads(sgdStep(net, before.grads, 0.5), X, Y, 'mse');
    expect(after.loss).toBeLessThan(before.loss);
  });

  it('computes binary cross-entropy: −log(0.8) for p = 0.8, y = 1', () => {
    expect(loss('bce', [[0.8]], [[1]])).toBeCloseTo(-Math.log(0.8), 12);
    expect(Number.isFinite(loss('bce', [[1]], [[0]]))).toBe(true);
  });

  it('rejects mismatched shapes', () => {
    expect(() => forward(net, [[1, 2, 3]])).toThrow();
    expect(() => loss('mse', [[1, 2]], [[1]])).toThrow('Predictions are (1, 2) but targets are (1, 1)');
  });
});

describe('initialization and helpers', () => {
  it('is reproducible from the seed and has the right shapes', () => {
    const a = initNetwork([2, 4, 1], 'relu', 'sigmoid', 1);
    expect(a).toEqual(initNetwork([2, 4, 1], 'relu', 'sigmoid', 1));
    expect(a[0]!.W).toHaveLength(2);
    expect(a[0]!.W[0]).toHaveLength(4);
    expect(a[1]!.activation).toBe('sigmoid');
    expect(parameterCount(a)).toBe(2 * 4 + 4 + 4 * 1 + 1);
  });
  it('mulberry32 is deterministic and in [0, 1); permutation is a shuffle', () => {
    const r = mulberry32(42);
    const xs = Array.from({ length: 100 }, r);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(mulberry32(42)()).toBe(xs[0]);
    expect([...permutation(10, mulberry32(3))].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
