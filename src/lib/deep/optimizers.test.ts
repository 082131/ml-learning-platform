import { describe, expect, it } from 'vitest';
import { validateTrace } from '../code/validate';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { ADAM_SOURCE, adamSlots, buildAdamTrace } from './adamTrace';
import { isolines, sampleGrid } from './contour';
import { lrIndex, LR_CHOICES, optimizerRaceExperiment, runRace, type RaceState } from './optimizerExperiment';
import { ADAM_EPS, BOWL, describeUpdate, fmt, ROSENBROCK, runOptimizer, type Hyper } from './optimizers';

const H: Hyper = { lr: 0.05, beta: 0.9, adamLr: 0.2, beta1: 0.9, beta2: 0.999, eps: ADAM_EPS };

describe('optimizers on the bowl ½(x² + 10y²) from (−4, 1.5)', () => {
  it('SGD: θ − η·g with g = (x, 10y)', () => {
    // g = (−4, 15); (−4, 1.5) − 0.05·(−4, 15) = (−3.8, 0.75); then g = (−3.8, 7.5) → (−3.61, 0.375)
    const run = runOptimizer(BOWL, 'sgd', H, 2);
    expect(run.steps[0]!.g).toEqual([-4, 15]);
    expect(run.path[1]![0]).toBeCloseTo(-3.8, 12);
    expect(run.path[1]![1]).toBeCloseTo(0.75, 12);
    expect(run.path[2]![0]).toBeCloseTo(-3.61, 12);
    expect(run.path[2]![1]).toBeCloseTo(0.375, 12);
  });

  it('momentum: u = β·u + g, θ − η·u (PyTorch form)', () => {
    // Step 1: u = g = (−4, 15) → (−3.8, 0.75). Step 2: g = (−3.8, 7.5), u = 0.9·(−4, 15) + g = (−7.4, 21)
    // θ = (−3.8, 0.75) − 0.05·(−7.4, 21) = (−3.43, −0.3): it overshoots y = 0, the price of momentum.
    const run = runOptimizer(BOWL, 'momentum', H, 2);
    expect(run.steps[1]!.m![0]).toBeCloseTo(-7.4, 12);
    expect(run.steps[1]!.m![1]).toBeCloseTo(21, 12);
    expect(run.path[2]![0]).toBeCloseTo(-3.43, 12);
    expect(run.path[2]![1]).toBeCloseTo(-0.3, 12);
  });

  it('Adam: bias correction makes the first step exactly η against the sign of each gradient', () => {
    // m₁ = 0.1·g = (−0.4, 1.5), v₁ = 0.001·g² = (0.016, 0.225); m̂ = m₁/0.1 = g, v̂ = v₁/0.001 = g²,
    // so the step is η·g/|g| = 0.2·(−1, 1) (up to ε): θ₁ = (−3.8, 1.3).
    const run = runOptimizer(BOWL, 'adam', H, 2);
    const [s1, s2] = run.steps;
    expect(s1!.m![0]).toBeCloseTo(-0.4, 12);
    expect(s1!.v![1]).toBeCloseTo(0.225, 12);
    expect(s1!.mHat![1]).toBeCloseTo(15, 12);
    expect(s1!.vHat![0]).toBeCloseTo(16, 12);
    // ε shifts it by 0.2·4·1e-8/4 = 5e-10, as NumPy shows: −3.8000000005.
    expect(s1!.next[0]).toBeCloseTo(-3.8000000005, 12);
    expect(s1!.next[1]).toBeCloseTo(1.3000000001333334, 12);
    // Recorded with NumPy 2.5.3 (Python 3.13) running the same update:
    expect(s2!.m![0]).toBeCloseTo(-0.7400000000499998, 12);
    expect(s2!.v![1]).toBeCloseTo(0.39377500003466703, 12);
    expect(s2!.mHat![1]).toBeCloseTo(13.947368421754387, 10);
    expect(s2!.vHat![0]).toBeCloseTo(15.219609806803621, 10);
    expect(s2!.next[0]).toBeCloseTo(-3.6003329722314024, 12);
    expect(s2!.next[1]).toBeCloseTo(1.101251163454939, 12);
  });

  it('matches the NumPy run after 60 steps', () => {
    const r = runRace({ surface: 'bowl', ...H, steps: 60, inspect: 1 });
    const close = (p: number[], q: number[]) => p.forEach((v, i) => expect(v).toBeCloseTo(q[i]!, 10));
    close(r.sgd.path.at(-1)!, [-0.18427919594780828, 1.3010426069826053e-18]);
    close(r.momentum.path.at(-1)!, [-0.12489247915576407, 0.04763183474277134]);
    close(r.adam.path.at(-1)!, [-0.0858553451316768, 0.04679909554590733]);
  });

  it('SGD diverges above η = 0.2, where the y error is multiplied by |1 − 10η| > 1; momentum does not', () => {
    const h = { ...H, lr: 0.25 };
    const sgd = runOptimizer(BOWL, 'sgd', h, 60);
    expect(sgd.status).toBe('diverged');
    expect(sgd.divergedAt).toBe(15);
    expect(runOptimizer(BOWL, 'momentum', h, 60).status).toBe('ok');
    // At exactly 0.2 the factor is −1: y flips between 1.5 and −1.5 forever.
    expect(runOptimizer(BOWL, 'sgd', { ...H, lr: 0.2 }, 60).path.at(-1)![1]).toBeCloseTo(1.5, 9);
  });
});

describe('optimizers on Rosenbrock from (−1.2, 1)', () => {
  it('matches NumPy after 1 and 400 steps', () => {
    const h = { ...H, lr: 0.001, adamLr: 0.1 };
    // g = (−215.6, −88): SGD moves to (−1.2 + 0.2156, 1 + 0.088) = (−0.9844, 1.088)
    expect(runOptimizer(ROSENBROCK, 'sgd', h, 1).path[1]![0]).toBeCloseTo(-0.9844, 12);
    const close = (p: number[], q: number[]) => p.forEach((v, i) => expect(v).toBeCloseTo(q[i]!, 8));
    close(runOptimizer(ROSENBROCK, 'sgd', h, 400).path.at(-1)!, [-0.6445472395110311, 0.42340687940662597]);
    close(
      runOptimizer(ROSENBROCK, 'momentum', h, 400).path.at(-1)!,
      [0.9327297793632173, 0.8697043716202181],
    );
    close(runOptimizer(ROSENBROCK, 'adam', h, 400).path.at(-1)!, [0.7710462709899862, 0.5937205294156158]);
    const a2 = runOptimizer(ROSENBROCK, 'adam', h, 2).steps[1]!;
    expect(a2.vHat![0]).toBeCloseTo(24614.12538320234, 7);
  });
});

describe('equations, formatting and the experiment', () => {
  it('writes the inspected update with its numbers', () => {
    const run = runOptimizer(BOWL, 'adam', H, 1);
    const lines = describeUpdate('adam', run.steps[0]!, undefined, H);
    expect(lines.map((l) => l.numbers)).toEqual([
      '∇f(−4, 1.5) = (−4, 15)',
      '0.9·(0, 0) + 0.1·(−4, 15) = (−0.4, 1.5)',
      '0.999·(0, 0) + 0.001·(16, 225) = (0.016, 0.225)',
      '(−0.4, 1.5) / 0.1 = (−4, 15)',
      '(0.016, 0.225) / 0.001 = (16, 225)',
      '(−4, 1.5) − 0.2·(−1, 1) = (−3.8, 1.3)',
    ]);
    const sgd = runOptimizer(BOWL, 'sgd', H, 1).steps[0]!;
    expect(describeUpdate('sgd', sgd, undefined, H).at(-1)!.numbers).toBe(
      '(−4, 1.5) − 0.05·(−4, 15) = (−3.8, 0.75)',
    );
    expect(fmt(0.00001234)).toBe('1.23e−5');
    expect(fmt(-2.5)).toBe('−2.5');
  });

  it('maps learning rates to slider positions', () => {
    expect(LR_CHOICES[lrIndex(0.05)]).toBe(0.05);
    expect(LR_CHOICES[lrIndex(0.0011)]).toBe(0.001);
  });

  it('is a valid experiment whose Adam trace fits the filled code', () => {
    const def = optimizerRaceExperiment('race', 'adam-code');
    expect(validateExperiment(def)).toEqual([]);
    for (const [surface, inspect] of [
      ['bowl', 1],
      ['bowl', 5],
      ['rosenbrock', 40],
    ] as const) {
      const s: RaceState = { ...def.initial, surface, inspect };
      const trace = def.trace!(s);
      const src = fillSlots(
        ADAM_SOURCE,
        [],
        adamSlots(surface === 'bowl' ? BOWL : ROSENBROCK, { ...H, ...s }, inspect),
      ).source;
      expect(validateTrace(trace, src)).toEqual([]);
    }
    const t5 = buildAdamTrace(BOWL, H, runOptimizer(BOWL, 'adam', H, 5), 5);
    expect(t5.steps.find((st) => st.note.startsWith('Iterations t = 1 to 4'))).toBeDefined();
    const s1 = buildAdamTrace(BOWL, H, runOptimizer(BOWL, 'adam', H, 1), 1);
    expect(s1.steps.at(-1)!.vars.output).toEqual({ kind: 'text', value: '(−3.8, 1.3)' });
  });

  it('labels a diverged run in the readout', () => {
    const def = optimizerRaceExperiment('race', 'adam-code');
    const s = { ...def.initial, lr: 0.3 };
    const items = def.readout!(s, def.compute(s));
    expect(items[0]).toMatchObject({ status: 'diverged' });
    expect(items[0]!.value).toMatch(/at step \d+/);
  });
});

describe('isolines (marching squares)', () => {
  it('finds the crossing of one cell by linear interpolation', () => {
    // Values 0 on the left, 2 on the right: the level-1 line is the vertical x = 0.5.
    const grid = {
      xs: [0, 1],
      ys: [0, 1],
      values: [
        [0, 2],
        [0, 2],
      ],
    };
    expect(isolines(grid, 1)).toEqual([
      [
        [0.5, 0],
        [0.5, 1],
      ],
    ]);
  });

  it('traces the unit circle for x² + y² = 1', () => {
    const segs = isolines(
      sampleGrid((x, y) => x * x + y * y, [-2, 2], [-2, 2], 41, 41),
      1,
    );
    expect(segs.length).toBeGreaterThan(20);
    for (const seg of segs)
      for (const p of seg) expect(Math.abs(Math.hypot(p[0], p[1]) - 1)).toBeLessThan(0.02);
  });

  it('resolves a saddle cell with its center value', () => {
    // Corners 00 and 11 above 1, center 1.5 above: the curve cuts off the two low corners.
    const grid = {
      xs: [0, 1],
      ys: [0, 1],
      values: [
        [2, 1],
        [1, 2],
      ].map((r) => r.map((v) => v - 0.5)),
    };
    expect(isolines(grid, 1)).toHaveLength(2);
  });
});
