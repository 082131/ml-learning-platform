import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  pythonFitData,
  computeFit,
  diagnose,
  FIT_DATA,
  fitExperiment,
  fitPrintout,
  LOG_LAMBDAS,
  pythonLambda,
} from './fitExperiment';
import { argmin, choleskySolve, design, fitRidge, mse, predict, sineData } from './polyRidge';

/**
 * Produced with ~/pyenv/bin/python (CPython 3.13, NumPy 2.4.6) from FIT_DATA dumped to JSON, running the
 * lesson's code: X = np.vander(2 * x_train - 1, degree + 1, increasing=True); penalty = np.eye(degree + 1);
 * penalty[0, 0] = 0; w = np.linalg.solve(X.T @ X + lam * penalty, X.T @ y_train) with lam = 10 ** logLambda,
 * then print(f"train MSE {mse_train:.4f}, validation MSE {mse_val:.4f}").
 */
const NUMPY = [
  {
    degree: 3,
    logLambda: -8,
    print: 'train MSE 0.0682, validation MSE 0.0656',
    w: [0.033955212453266055, -2.5964531340385637, 0.08967766948863243, 2.8532357591254405],
  },
  { degree: 0, logLambda: -8, print: 'train MSE 0.3788, validation MSE 0.5139', w: [0.18265000000000003] },
  {
    degree: 1,
    logLambda: -8,
    print: 'train MSE 0.2935, validation MSE 0.2852',
    w: [0.16994693756432588, -0.5060981050069359],
  },
  {
    degree: 9,
    logLambda: -8,
    print: 'train MSE 0.0420, validation MSE 0.8582',
    w: [
      0.013506367307949721, -3.0121319805711235, 4.516049275881923, 17.363872165111474, -31.60435003472485,
      -80.80436240105857, 48.7762782152567, 126.39910968518845, -21.38171109673527, -59.80272558973627,
    ],
  },
  {
    degree: 12,
    logLambda: -8,
    print: 'train MSE 0.0303, validation MSE 3.6556',
    w: [
      0.06645712731093859, -1.739353942843751, 1.9997174178652095, -23.17863302445865, 8.027162938948415,
      227.51158983053347, -147.74144632023373, -768.5182907841196, 345.9138673702853, 998.0767752682091,
      -299.7270487275956, -432.57980139406936, 91.73379400521048,
    ],
  },
  {
    degree: 12,
    logLambda: -2.5,
    print: 'train MSE 0.0513, validation MSE 0.1833',
    w: [
      0.12838199493481398, -2.1984846677036938, -0.8563620065201075, 0.17015236865080183,
      -0.34019102276939656, 1.6419599544783008, 0.6445578283664833, 1.5425494802326023, 0.6550612249022677,
      0.3930693938671266, 0.31921768033666853, -1.2552097219502376, -0.1631713841466917,
    ],
  },
  {
    degree: 12,
    logLambda: -0.5,
    print: 'train MSE 0.0813, validation MSE 0.1453',
    w: [
      0.08359173460888307, -1.5329532806335469, -0.32475688904010835, 0.215735922388116, -0.0339134413977047,
      0.46611898518421485, 0.09232338599947709, 0.4552730453683264, 0.15104917956505454, 0.3904711093026453,
      0.18216972588705133, 0.3199809592209136, 0.1986926563394899,
    ],
  },
  {
    degree: 12,
    logLambda: 1,
    print: 'train MSE 0.3036, validation MSE 0.3829',
    w: [
      0.14652222930376735, -0.2346857407142328, 0.025880677689603653, -0.026062358181659893,
      0.02362902238269932, 0.025389437717985838, 0.017678247181802637, 0.042325963171624154,
      0.013496022508916631, 0.04863044186536267, 0.011106006598120936, 0.050990678070289654,
      0.009815787730225513,
    ],
  },
  {
    degree: 5,
    logLambda: -3,
    print: 'train MSE 0.0546, validation MSE 0.1391',
    w: [
      0.14750065814558996, -2.323342892816194, -1.5110516262612743, 0.9868763704400816, 1.671041804062841,
      1.6444898275060489,
    ],
  },
];

describe('polynomial ridge regression', () => {
  it('builds the design matrix on t = 2x − 1', () => {
    // x = 0 → t = −1: [1, −1, 1]; x = 1 → t = 1: [1, 1, 1]; x = 0.75 → t = 0.5: [1, 0.5, 0.25]
    expect(design([0, 1, 0.75], 2)).toEqual([
      [1, -1, 1],
      [1, 1, 1],
      [1, 0.5, 0.25],
    ]);
  });

  it('solves a symmetric positive definite system by Cholesky', () => {
    // [[4, 2], [2, 3]] w = [2, 1]: det 8, w = [(2·3 − 2·1)/8, (4·1 − 2·2)/8] = [0.5, 0]
    const w = choleskySolve(
      [
        [4, 2],
        [2, 3],
      ],
      [2, 1],
    );
    expect(w[0]).toBeCloseTo(0.5, 12);
    expect(w[1]).toBeCloseTo(0, 12);
    expect(() => choleskySolve([[0]], [1])).toThrow('positive definite');
  });

  it('leaves the intercept unpenalized (hand-worked)', () => {
    // x = [0, 0.5, 1] → t = [−1, 0, 1], y = [1, 2, 4]. XᵀX = [[3, 0], [0, 2]], Xᵀy = [7, 3].
    // λ = 1 adds 1 to the slope entry only: [[3, 0], [0, 3]] w = [7, 3] → w = [7/3, 1].
    const w = fitRidge({ x: [0, 0.5, 1], y: [1, 2, 4] }, 1, 1);
    expect(w[0]).toBeCloseTo(7 / 3, 12);
    expect(w[1]).toBeCloseTo(1, 12);
    // Predictions 4/3, 7/3, 10/3: squared errors 1/9, 1/9, 4/9 → MSE (6/9)/3 = 2/9
    expect(predict(w, 0)).toBeCloseTo(4 / 3, 12);
    expect(mse(w, { x: [0, 0.5, 1], y: [1, 2, 4] })).toBeCloseTo(2 / 9, 12);
  });

  it('matches NumPy’s weights and printout for degrees 0 to 12 and several λ', () => {
    for (const f of NUMPY) {
      const w = fitRidge(FIT_DATA.train, f.degree, 10 ** f.logLambda);
      const scale = Math.max(...f.w.map(Math.abs));
      w.forEach((v, i) => expect(Math.abs(v - f.w[i]!) / scale).toBeLessThan(1e-6));
      expect(fitPrintout(computeFit({ degree: f.degree, logLambda: f.logLambda }))).toBe(f.print);
    }
  });

  it('generates reproducible, rounded data from a seed', () => {
    expect(sineData(1)).toEqual(FIT_DATA);
    expect(FIT_DATA.train.x).toHaveLength(20);
    expect(FIT_DATA.validation.x).toHaveLength(20);
    for (const v of [...FIT_DATA.train.x, ...FIT_DATA.train.y]) expect(Number(v.toFixed(3))).toBe(v);
  });
});

describe('fit experiment', () => {
  it('is valid and finds the validation minimum', () => {
    const def = fitExperiment('fit');
    expect(validateExperiment(def)).toEqual([]);
    const r = def.compute(def.initial);
    expect(r.byDegree).toHaveLength(13);
    expect(r.byLambda).toHaveLength(LOG_LAMBDAS.length);
    expect(r.bestDegree).toBe(argmin(r.byDegree.map((f) => f.validation)));
    // Training error never rises with degree at a fixed tiny λ (nested models)
    r.byDegree.slice(1).forEach((f, d) => expect(f.train).toBeLessThanOrEqual(r.byDegree[d]!.train + 1e-9));
  });

  it('labels the side of the validation minimum', () => {
    const r = computeFit({ degree: 12, logLambda: -8 });
    expect(diagnose({ degree: 12, logLambda: -8 }, r)).toMatch(/^Overfitting side/);
    expect(diagnose({ degree: 0, logLambda: -8 }, computeFit({ degree: 0, logLambda: -8 }))).toMatch(
      /^Underfitting side/,
    );
  });

  it('writes λ as a Python power of ten', () => {
    expect(pythonLambda(-8)).toBe('10 ** -8');
    expect(pythonLambda(-2.5)).toBe('10 ** -2.5');
  });

  it('writes the data into the Python code exactly as it was run', () => {
    // The data block of the script run with ~/pyenv/bin/python for the fixture above
    expect(pythonFitData())
      .toBe(`x_train = np.array([0.003, 0.067, 0.139, 0.154, 0.248, 0.281, 0.395, 0.404, 0.426, 0.455,
     0.489, 0.489, 0.527, 0.613, 0.627, 0.721, 0.767, 0.968, 0.981, 0.995])
y_train = np.array([0.108, 0.329, 0.887, 0.893, 0.579, 1.159, 0.153, 1.082, 0.458, 0.202,
     0.071, 0.043, 0.105, -0.428, -0.438, -0.762, -1.385, -0.312, 0.538, 0.371])
x_val = np.array([0.039, 0.115, 0.118, 0.132, 0.163, 0.166, 0.294, 0.324, 0.388, 0.401,
     0.51, 0.677, 0.704, 0.834, 0.869, 0.881, 0.934, 0.936, 0.949, 0.978])
y_val = np.array([-0.196, 0.989, 1.007, 0.86, 1.055, 1.018, 0.545, 1.087, 0.798, 0.468,
     0.261, -1.25, -0.904, -0.635, -0.224, -0.669, -0.331, -0.441, 0.184, 0.018])`);
  });
});
