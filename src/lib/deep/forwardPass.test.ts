import { describe, expect, it } from 'vitest';
import { fillExample } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import type { CodeExample } from '../types';
import {
  buildForwardTrace,
  computeForward,
  describeUnit,
  FORWARD_INITIAL as S0,
  FORWARD_SOURCE,
  forwardExperiment,
  forwardPrint,
  forwardShapes,
  forwardSlots,
  hiddenNumpy,
  LAYER_LINES,
  selectUnit,
  setParam,
  type ForwardState,
} from './forwardPass';

const example: CodeExample = {
  id: 'forward-code',
  language: 'python',
  source: FORWARD_SOURCE,
  annotations: [],
  slots: Object.fromEntries(
    Object.keys(forwardSlots(S0)).map((k) => [k, (s: unknown) => forwardSlots(s as ForwardState)[k]!]),
  ),
};

describe('forward pass on the 2-3-1 network', () => {
  it('computes the hand-worked first row: Z1[0] = [-1, -3, 0], A1[0] = tanh of it', () => {
    const r = computeForward(S0);
    expect(r.Z[0]![0]).toEqual([-1, -3, 0]);
    expect(r.A[1]![0]![0]).toBeCloseTo(Math.tanh(-1), 12);
    // Z2[0] = 2·tanh(-1) - 2·tanh(-3) + 0.5·0 - 1.5 = -1.0331 (NumPy: -1.0331 after round(4))
    expect(r.Z[1]![0]![0]).toBeCloseTo(2 * Math.tanh(-1) - 2 * Math.tanh(-3) - 1.5, 12);
    expect(describeUnit(S0, r, 1, 0, 1).sum).toBe(
      'Z1[1][0] = X[1][0]·W1[0][0] + X[1][1]·W1[1][0] + b1[0] = 0·2 + 1·2 + (-1) = 1',
    );
    expect(describeUnit(S0, r, 1, 0, 1).act).toBe('A1[1][0] = Tanh(1) = 0.7616');
    expect(describeUnit(S0, r, 0, 1, 3).sum).toBe('x[1] = X[3][1] = 1');
  });

  it('prints what NumPy 2.5.3 prints', () => {
    // Each expected pair is the real output of FORWARD_SOURCE filled with the same values.
    const cases: [ForwardState, [string, string]][] = [
      [S0, ['(4, 1)', '[[0.2625], [0.7623], [0.8729], [0.2625]]']],
      [{ ...setParam(S0, 'W1', 1, 1, -0.7), batch: 2, hidden: 'relu' }, ['(2, 1)', '[[0.1824], [0.6225]]']],
      [
        {
          ...S0,
          X: [
            [0.3, -1.2],
            [2.5, 4],
            [-5, 1],
            [1, 1],
          ],
          batch: 3,
          hidden: 'identity',
        },
        ['(3, 1)', '[[0.9627], [0.852], [0.3775]]'],
      ],
      [{ ...S0, X: [[0.3, -1.2], ...S0.X.slice(1)], batch: 1, hidden: 'sigmoid' }, ['(1, 1)', '[[0.2703]]']],
    ];
    for (const [s, out] of cases) expect(forwardPrint(s, computeForward(s))).toEqual(out);
  });

  it('fills the code with the batch, its shape and the hidden activation', () => {
    const s = { ...S0, batch: 2, hidden: 'relu' as const };
    const { source } = fillExample(example, s);
    expect(source).toContain('X = np.array([[0.0, 0.0], [0.0, 1.0]])  # (2, 2): 2 examples, 2 features each');
    expect(source).toContain('A1 = np.maximum(0, Z1)  # (2, 3)');
    expect(source).toContain('b1 = np.array([-1.0, -3.0, 0.0])');
    expect(hiddenNumpy('sigmoid')).toBe('1 / (1 + np.exp(-Z1))');
  });

  it('maps each layer to its code lines', () => {
    const lines = FORWARD_SOURCE.split('\n');
    expect(LAYER_LINES[0]!.map((l) => lines[l - 1]!.slice(0, 2))).toEqual(['X ']);
    expect(LAYER_LINES[1]!.map((l) => lines[l - 1]!.slice(0, 2))).toEqual(['W1', 'b1', 'Z1', 'A1']);
    expect(LAYER_LINES[2]!.map((l) => lines[l - 1]!.slice(0, 2))).toEqual(['W2', 'b2', 'Z2', 'A2']);
  });

  it('states the shapes of every stage for the batch size', () => {
    expect(forwardShapes(3).map((st) => `${st.name}: ${st.shapes} -> ${st.result}`)).toEqual([
      'X: (3, 2) -> (3, 2)',
      'Z1: (3, 2) @ (2, 3) + (3,) -> (3, 3)',
      'A1: (3, 3), element by element -> (3, 3)',
      'Z2: (3, 3) @ (3, 1) + (1,) -> (3, 1)',
      'A2: (3, 1), element by element -> (3, 1)',
    ]);
  });

  it('builds a valid computed trace and experiment', () => {
    const trace = buildForwardTrace(S0);
    expect(validateTrace(trace, fillExample(example, S0).source)).toEqual([]);
    expect(trace.steps.map((st) => st.range.line)).toEqual([3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14]);
    expect(trace.steps[5]!.note).toContain(
      'Z1[0][0] = X[0][0]·W1[0][0] + X[0][1]·W1[1][0] + b1[0] = 0·2 + 0·2 + (-1) = -1',
    );
    expect(trace.steps.at(-1)!.vars.output).toEqual({
      kind: 'text',
      value: '(4, 1)\n[[0.2625], [0.7623], [0.8729], [0.2625]]',
    });
    expect(validateExperiment(forwardExperiment('f', 'forward-code'))).toEqual([]);
  });

  it('edits parameters and selection without touching other values', () => {
    expect(setParam(S0, 'b1', 0, 2, 0.5).b1).toEqual([-1, -3, 0.5]);
    expect(setParam(S0, 'W2', 2, 0, 1).W2).toEqual([[2], [-2], [1]]);
    expect(S0.W2).toEqual([[2], [-2], [0.5]]);
    expect(selectUnit(S0, 2, 2)).toMatchObject({ layer: 2, unit: 0 });
  });
});
