import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  describeStep,
  gradientDescentExperiment,
  NON_CONVEX,
  QUADRATIC,
  runGradientDescent,
} from './gradientDescent';

describe('gradient descent', () => {
  it('follows the hand-worked steps on (x − 2)² + 1 from x₀ = 6 with η = 0.25', () => {
    // f'(x) = 2(x − 2): 6 − 0.25·8 = 4, 4 − 0.25·4 = 3, 3 − 0.25·2 = 2.5
    const run = runGradientDescent(QUADRATIC, 6, 0.25, 3);
    expect(run.xs).toEqual([6, 4, 3, 2.5]);
    expect(run.steps.map((s) => s.grad)).toEqual([8, 4, 2]);
    expect(run.status).toBe('ok');
    expect(describeStep(run.steps[0]!, 0.25)).toBe("x₁ = x₀ − η·f'(x₀) = 6 − 0.25 × 8 = 4");
  });

  it('converges to the minimum at x = 2 for a small learning rate', () => {
    const run = runGradientDescent(QUADRATIC, 6, 0.1, 50);
    expect(run.xs.at(-1)).toBeCloseTo(2, 3);
  });

  it('detects divergence above η = 1, where each step overshoots by more than it gains', () => {
    // x − 2 is multiplied by (1 − 2η) each step: η = 1.5 doubles the error and flips its sign.
    const run = runGradientDescent(QUADRATIC, 6, 1.5, 50);
    expect(run.status).toBe('diverged');
    expect(run.xs.slice(0, 3)).toEqual([6, -6, 18]);
    expect(run.divergedAt).toBeLessThan(50);
    expect(runGradientDescent(QUADRATIC, 6, 0.9, 50).status).toBe('ok');
  });

  it('lands in different minima of the non-convex function depending on the start', () => {
    expect(runGradientDescent(NON_CONVEX, -2, 0.02, 200).xs.at(-1)).toBeCloseTo(-1.3008, 3);
    expect(runGradientDescent(NON_CONVEX, 2, 0.02, 200).xs.at(-1)).toBeCloseTo(1.1309, 3);
    expect(NON_CONVEX.df(-1.30084)).toBeCloseTo(0, 3);
  });

  it('formats negative gradients in brackets and diverged results in exponent form', () => {
    expect(describeStep({ k: 2, x: 1, fx: 2, grad: -2, next: 1.5 }, 0.25)).toBe(
      "x₃ = x₂ − η·f'(x₂) = 1 − 0.25 × (-2) = 1.5",
    );
    expect(describeStep({ k: 0, x: 1, fx: 1, grad: 1, next: 3e9 }, 1)).toMatch(/3\.00e\+9 \(diverged\)$/);
  });

  it('provides a valid experiment whose readout flags divergence', () => {
    const def = gradientDescentExperiment('gd');
    expect(validateExperiment(def)).toEqual([]);
    const state = { ...def.initial, lr: 1.5, steps: 50 };
    expect(def.readout!(state, def.compute(state))[0]).toMatchObject({ status: 'diverged' });
    const lr = def.controls.find((c) => c.id === 'steps')!;
    expect(lr.kind === 'slider' && lr.set({ ...def.initial, inspect: 9 }, 5).inspect).toBe(4);
  });
});
