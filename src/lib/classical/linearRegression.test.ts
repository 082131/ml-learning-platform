import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { leastSquares, linearGD, mse, regressionSubset, residuals } from './linearRegression';
import {
  buildMseTrace,
  computeGD,
  describePoint,
  fitExperiment,
  gdExperiment,
  gdPrintLine,
  lineLabel,
  pyFloat,
  pyRound4,
  REG_POINTS,
  X_LIST,
  Y_LIST,
} from './linearRegressionExperiment';

describe('linear regression math', () => {
  it('takes 12 real penguins, converted to cm and kg', () => {
    const pts = regressionSubset();
    expect(pts).toHaveLength(12);
    // penguins.csv row 0: Adelie, flipper 181 mm, 3750 g
    expect(pts[0]).toEqual({ row: 0, species: 'Adelie', x: 18.1, y: 3.75 });
    expect(new Set(pts.map((p) => p.species))).toEqual(new Set(['Adelie', 'Gentoo', 'Chinstrap']));
    expect(X_LIST).toBe('[18.1, 17.8, 19.4, 18.9, 19.9, 19.0, 21.5, 21.0, 22.1, 21.6, 19.7, 20.1]');
    expect(Y_LIST).toBe('[3.75, 3.25, 3.75, 3.95, 3.775, 4.25, 5.05, 4.4, 5.45, 5.0, 3.3, 4.45]');
  });

  it('computes residuals and MSE for a hand-worked three-point example', () => {
    // Line ŷ = 2x + 1 through (0, 1), (1, 4), (2, 4): predictions 1, 3, 5, residuals 0, 1, −1
    const pts = [
      { x: 0, y: 1 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
    ];
    expect(residuals(pts, 2, 1).map((r) => r.r)).toEqual([0, 1, -1]);
    expect(mse(pts, 2, 1)).toBeCloseTo(2 / 3, 12);
    // Least squares: x̄ = 1, ȳ = 3, Σ(x−x̄)(y−ȳ) = (−1)(−2) + 0 + (1)(1) = 3, Σ(x−x̄)² = 2 → slope 1.5, b = 3 − 1.5 = 1.5
    expect(leastSquares(pts)).toEqual({ slope: 1.5, intercept: 1.5 });
    expect(() =>
      leastSquares([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toThrow(/slope is undefined/);
  });

  it('matches the Python MSE loop for the initial line w = 0.3, b = −1.8', () => {
    // Fixture: the lesson's mse loop run with CPython 3.13 (~/pyenv/bin/python); it printed
    // 0.1515, with total = 1.8176249999999983 and mse = 0.15146874999999985.
    const value = mse(REG_POINTS, 0.3, -1.8);
    expect(value).toBe(0.15146874999999985);
    expect(pyRound4(value)).toBe('0.1515');
    const trace = buildMseTrace({ w: 0.3, b: -1.8, sel: 0, best: 'hide' });
    expect(trace.steps).toHaveLength(5 + 12 * 4 + 2);
    expect(trace.steps[6]!.note).toBe('y_hat = 0.3 × 18.1 + (-1.8) = 3.63 kg predicted.');
    expect(trace.steps[7]!.note).toBe('r = 3.75 − 3.63 = 0.12: the penguin is above the line.');
    expect(trace.steps.at(-1)!.vars.output).toEqual({ kind: 'text', value: '0.1515' });
  });

  it('matches the closed form from np.polyfit', () => {
    // Fixture: np.polyfit(x, y, 1) printed [ 0.430195   -4.37371863] (NumPy 2.4.6); the formula gave
    // slope 0.43019499588864096, intercept -4.373718626414505, MSE 0.12098907145281057.
    const fit = leastSquares(REG_POINTS);
    expect(fit.slope).toBeCloseTo(0.43019499588864096, 12);
    expect(fit.intercept).toBeCloseTo(-4.373718626414505, 11);
    expect(mse(REG_POINTS, fit.slope, fit.intercept)).toBeCloseTo(0.12098907145281057, 12);
  });

  it('runs gradient descent like the NumPy loop, raw and centered', () => {
    // Fixture: the lesson's NumPy GD loop (NumPy 2.4.6, CPython 3.13). Columns: center, lr, steps,
    // slope, intercept, mse, then the printed line.
    const python = [
      [
        false,
        0.002,
        100,
        0.21152101459574368,
        0.0027761247411820992,
        0.20617380522775522,
        'slope=0.2115 intercept=0.0028 mse=0.2062',
      ],
      [
        true,
        0.1,
        50,
        0.4301949957563689,
        -4.373778538447749,
        0.12098907504257805,
        'slope=0.4302 intercept=-4.3738 mse=0.1210',
      ],
      [
        true,
        0.5,
        20,
        0.4276637193649073,
        -4.323282941679111,
        0.12100043517423292,
        'slope=0.4277 intercept=-4.3233 mse=0.1210',
      ],
      [
        false,
        0.001,
        7,
        0.2111434806533825,
        0.010276926040678033,
        0.20646605720547606,
        'slope=0.2111 intercept=0.0103 mse=0.2065',
      ],
      [
        true,
        0.6,
        30,
        -15.632766563782598,
        315.680790450035,
        457.7279647207077,
        'slope=-15.6328 intercept=315.6808 mse=457.7280',
      ],
    ] as const;
    for (const [center, lr, steps, w, b, m, printed] of python) {
      const run = linearGD(REG_POINTS, { lr, steps, center });
      const last = run.path.at(-1)!;
      expect(run.status).toBe('ok');
      expect(last.slope).toBeCloseTo(w, 9);
      expect(last.intercept).toBeCloseTo(b, 8);
      expect(last.mse).toBeCloseTo(m, 9);
      expect(gdPrintLine(run)).toBe(printed);
    }
  });

  it('follows the first update by hand and flags divergence', () => {
    // From w = b = 0 every prediction is 0, so err = −y: grad_b = 2·mean(−y) = −2ȳ, grad_w = −2·mean(x·y)
    const run = linearGD(REG_POINTS, { lr: 0.1, steps: 1, center: false });
    const ybar = REG_POINTS.reduce((s, p) => s + p.y, 0) / 12;
    expect(run.path[1]!.grad!.b).toBeCloseTo(-2 * ybar, 12);
    expect(run.path[0]!.mse).toBeCloseTo(REG_POINTS.reduce((s, p) => s + p.y ** 2, 0) / 12, 12);
    const bad = linearGD(REG_POINTS, { lr: 0.003, steps: 200, center: false });
    expect(bad.status).toBe('diverged');
    expect(bad.divergedAt).toBeLessThan(200);
  });
});

describe('linear regression experiments', () => {
  it('are valid, and the fit readout writes out the MSE', () => {
    const fit = fitExperiment('f', 'mse-loop');
    expect(validateExperiment(fit)).toEqual([]);
    const items = fit.readout!(fit.initial, fit.compute(fit.initial));
    expect(items.map((i) => i.value)).toEqual(['ŷ = 0.3·x − 1.8', '1.8176 / 12 = 0.1515 kg²', '0.1515']);
    const shown = { ...fit.initial, best: 'show' as const };
    expect(fit.readout!(shown, fit.compute(shown)).at(-1)!.value).toBe(
      'ŷ = 0.4302·x − 4.3737, MSE 0.121 kg²',
    );
    const gd = gdExperiment('g');
    expect(validateExperiment(gd)).toEqual([]);
    const diverged = { center: 'raw' as const, lr: 0.003, steps: 200 };
    expect(gd.readout!(diverged, computeGD(diverged))[0]).toMatchObject({ status: 'diverged' });
  });

  it('formats Python floats and the selected point arithmetic', () => {
    expect(pyFloat(19)).toBe('19.0');
    expect(pyFloat(-1.8)).toBe('-1.8');
    expect(pyRound4(0.12000001)).toBe('0.12');
    expect(lineLabel(0.43, 2)).toBe('ŷ = 0.43·x + 2');
    const s = { w: 0.3, b: -1.8, sel: 0, best: 'hide' as const };
    const d = describePoint(s, residuals(REG_POINTS, 0.3, -1.8)[0]!);
    expect(d.yHat).toBe('ŷ = w·x + b = 0.3 × 18.1 + (-1.8) = 3.63');
    expect(d.r).toBe('r = y − ŷ = 3.75 − 3.63 = 0.12');
    expect(d.r2).toBe('r² = 0.12² = 0.0144');
  });
});
