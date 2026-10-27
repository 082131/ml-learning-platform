import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { validateTrace } from '../code/validate';
import {
  accuracy,
  binaryTask,
  boundaryInUnits,
  clipLine,
  fitScaler,
  logLoss,
  scale,
  sigmoid,
  trainLogistic,
} from './logistic';
import {
  BILL_SCALER,
  BILL_TASK,
  buildPredictTrace,
  computeLogistic,
  gdPrint,
  logisticExperiment,
  PREDICT_SOURCE,
  predictPrint,
  predictSlots,
} from './logisticExperiment';

describe('logistic regression math', () => {
  it('computes the sigmoid, log loss and accuracy by hand', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(Math.log(3))).toBeCloseTo(0.75, 12); // 1 / (1 + 1/3)
    // p = [0.5, 0.8], y = [1, 0]: −(log 0.5 + log 0.2) / 2 = (0.6931 + 1.6094) / 2 = 1.1513
    expect(logLoss([0.5, 0.8], [1, 0])).toBeCloseTo((Math.log(2) + Math.log(5)) / 2, 12);
    expect(accuracy([0.5, 0.8, 0.2], [1, 0, 0])).toBeCloseTo(2 / 3, 12);
  });

  it('standardizes with ddof = 0 and takes one hand-worked gradient step', () => {
    const sc = fitScaler([
      [1, 10],
      [3, 30],
    ]);
    expect(sc).toEqual({ mean: [2, 20], std: [1, 10] });
    expect(scale(sc, [3, 10])).toEqual([1, -1]);
    // Z = [[1], [−1]], y = [1, 0], start p = 0.5, so p − y = [−0.5, 0.5]:
    // grad_w = (1·(−0.5) + (−1)·0.5) / 2 = −0.5, grad_b = 0, so w = 0 − 2·(−0.5) = 1
    const run = trainLogistic([[1], [-1]], [1, 0], { lr: 2, steps: 1 });
    expect(run.model).toEqual({ w: [1], b: 0 });
    expect(run.history[0]!.loss).toBeCloseTo(Math.log(2), 12);
    expect(run.history[1]!.acc).toBe(1);
  });

  it('builds the Adelie/Chinstrap split as pandas iloc[3::4] does', () => {
    // Fixture from pandas 3.0.2: 219 penguins; test rows start 4, 8, 12, 16, 20; 165 train / 54 test.
    expect(BILL_TASK.all).toHaveLength(219);
    expect(BILL_TASK.train).toHaveLength(165);
    expect(BILL_TASK.test.slice(0, 5).map((p) => p.row)).toEqual([4, 8, 12, 16, 20]);
    expect(BILL_TASK.train.filter((p) => p.label === 1)).toHaveLength(51);
    expect(BILL_SCALER.mean).toEqual(
      [42.35818181818182, 18.537575757575755].map((v) => expect.closeTo(v, 12)),
    );
    expect(BILL_SCALER.std[0]).toBeCloseTo(5.475035051524967, 12);
    expect(BILL_SCALER.std[1]).toBeCloseTo(1.2125780957118528, 12);
    expect(
      binaryTask('Adelie', 'Gentoo', ['bill_length_mm']).all.every((p) => p.species !== 'Chinstrap'),
    ).toBe(true);
  });

  it('trains to the same weights as the NumPy loop', () => {
    // Fixture: the lesson's NumPy GD loop run with NumPy 2.4.6 and pandas 3.0.2 on penguins.csv.
    // Columns: lr, steps, w1, w2, b, training log loss, then the two printed lines.
    const python = [
      [
        0.5,
        50,
        2.7513179624764326,
        -0.6453305432704431,
        -1.2672509616705558,
        0.13030329920710848,
        'w1=2.7513 w2=-0.6453 b=-1.2673\nlog loss=0.1303 accuracy=0.9758',
      ],
      [
        1,
        500,
        6.825921693826537,
        -2.5442496941240913,
        -2.9501761921239043,
        0.04961518162791497,
        'w1=6.8259 w2=-2.5442 b=-2.9502\nlog loss=0.0496 accuracy=0.9697',
      ],
      [
        30,
        500,
        10.869081251409385,
        -4.513773390774797,
        -4.675938257015997,
        0.04303959685215956,
        'w1=10.8691 w2=-4.5138 b=-4.6759\nlog loss=0.0430 accuracy=0.9758',
      ],
      [
        0.01,
        1,
        0.00392561734486011,
        -0.00011577454303981916,
        -0.0019090909090909091,
        0.6912426894570464,
        'w1=0.0039 w2=-0.0001 b=-0.0019\nlog loss=0.6912 accuracy=0.9636',
      ],
    ] as const;
    for (const [lr, steps, w1, w2, b, loss, printed] of python) {
      const r = computeLogistic({ lr, steps, sel: 0 });
      expect(r.model.w[0]).toBeCloseTo(w1, 9);
      expect(r.model.w[1]).toBeCloseTo(w2, 9);
      expect(r.model.b).toBeCloseTo(b, 9);
      expect(r.trainLoss).toBeCloseTo(loss, 10);
      expect(gdPrint(r)).toBe(printed);
    }
  });

  it('turns the model into a boundary line in millimetres and clips it to the plot', () => {
    // w = (1, 0), b = 0 on standardized x1: boundary at x1 = mean, a vertical line
    const sc = { mean: [40, 18], std: [5, 1] };
    const line = boundaryInUnits({ w: [1, 0], b: 0 }, sc);
    expect(line).toEqual({ a1: 0.2, a2: 0, c: -8 });
    expect(clipLine(line, [30, 60], [15, 22])).toEqual([
      [40, 15],
      [40, 22],
    ]);
    expect(clipLine({ a1: 1, a2: 1, c: -1 }, [0, 1], [0, 1])).toEqual([
      [0, 1],
      [1, 0],
    ]);
    expect(clipLine({ a1: 1, a2: 0, c: -5 }, [0, 1], [0, 1])).toBeUndefined();
  });
});

describe('logistic experiment', () => {
  it('is valid, and its prediction code and trace agree with Python for the initial state', () => {
    const def = logisticExperiment('lg', 'predict');
    expect(validateExperiment(def)).toEqual([]);
    const r = def.compute(def.initial);
    // Fixture: PREDICT_SOURCE filled for penguin 1 (CSV row 0) with the initial weights, run with
    // CPython 3.13, printed this line.
    expect(predictPrint(r)).toBe('-2.991 0.0478 Adelie');
    expect(predictSlots(def.initial, r).x).toBe('39.1, 18.7');
    const trace = buildPredictTrace(def.initial);
    expect(trace.steps.at(-1)!.vars.output).toEqual({ kind: 'text', value: '-2.991 0.0478 Adelie' });
    expect(validateTrace(trace, PREDICT_SOURCE)).toEqual([]);
    expect(def.readout!(def.initial, r).find((i) => i.label === 'Test accuracy')!.value).toMatch(
      /^\d+\/54 = /,
    );
  });
});

describe('logistic display helpers', () => {
  it('formats tiny and near-1 probabilities without rounding them to 0 or 1', async () => {
    const { formatP, paren } = await import('./logisticExperiment');
    expect(formatP(0.1093)).toBe('0.1093');
    expect(formatP(7.9e-6)).toBe('7.90e-6');
    expect(formatP(1 - 2e-6)).toBe('1 − 2.00e-6');
    expect(paren(-0.5)).toBe('(-0.5)');
  });
});
