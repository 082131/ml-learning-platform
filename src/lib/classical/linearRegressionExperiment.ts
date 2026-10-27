/**
 * The two experiments of the linear-regression lesson: fitting a line by hand (with the MSE loop
 * trace) and gradient descent on raw or centered x.
 */
import { roundTo } from '../math/numeric';
import { formatNumber, scalar, text, array } from '../trace/values';
import type { ExperimentDef, ReadoutItem, Trace, TraceStep } from '../types';
import {
  leastSquares,
  linearGD,
  mse,
  regressionSubset,
  residuals,
  type LineFit,
  type LinearGDRun,
  type RegPoint,
  type ResidualRow,
} from './linearRegression';

export const REG_POINTS: readonly RegPoint[] = regressionSubset();

/** A float as Python prints it: 19.0, not 19. */
export function pyFloat(v: number): string {
  const s = formatNumber(v);
  return Number.isInteger(v) && !s.includes('e') ? `${s}.0` : s;
}
/** Python's `print(round(v, 4))`. */
export const pyRound4 = (v: number) => pyFloat(Number(v.toFixed(4)));
const pyFloatList = (vs: readonly number[]) => `[${vs.map(pyFloat).join(', ')}]`;

export const X_LIST = pyFloatList(REG_POINTS.map((p) => p.x));
export const Y_LIST = pyFloatList(REG_POINTS.map((p) => p.y));

/** "ŷ = 0.3·x − 1.8" */
export function lineLabel(w: number, b: number): string {
  const sign = b < 0 ? '−' : '+';
  return `ŷ = ${formatNumber(w)}·x ${sign} ${formatNumber(Math.abs(b))}`;
}
/** A number in brackets when negative, for written-out arithmetic: 0.3 × 18.1 + (−1.8). */
const paren = (v: number) => (v < 0 ? `(${formatNumber(v)})` : formatNumber(v));

// ---------------------------------------------------------------- fitting by hand

export interface FitState {
  w: number;
  b: number;
  /** Index into REG_POINTS of the penguin whose arithmetic is shown. */
  sel: number;
  best: 'hide' | 'show';
}

export interface FitResult {
  rows: ResidualRow[];
  mse: number;
  total: number;
  fit: LineFit;
  fitMse: number;
}

export function computeFit(s: FitState): FitResult {
  const rows = residuals(REG_POINTS, s.w, s.b);
  const value = mse(REG_POINTS, s.w, s.b);
  const fit = leastSquares(REG_POINTS);
  return {
    rows,
    mse: value,
    total: value * rows.length,
    fit,
    fitMse: mse(REG_POINTS, fit.slope, fit.intercept),
  };
}

/** The selected point's arithmetic: ŷ, residual and squared residual, with the numbers used. */
export function describePoint(s: FitState, row: ResidualRow) {
  return {
    yHat: `ŷ = w·x + b = ${formatNumber(s.w)} × ${formatNumber(row.x)} + ${paren(s.b)} = ${formatNumber(row.yHat)}`,
    r: `r = y − ŷ = ${formatNumber(row.y)} − ${paren(row.yHat)} = ${formatNumber(row.r)}`,
    r2: `r² = ${paren(row.r)}² = ${formatNumber(row.r2)}`,
  };
}

/** The MSE loop the step-through walks. Lines are referred to by number in buildMseTrace. */
export const MSE_LOOP_SOURCE = `x = ${X_LIST}
y = ${Y_LIST}
w = {{w}}
b = {{b}}
total = 0.0
for i in range(len(x)):
    y_hat = w * x[i] + b
    r = y[i] - y_hat
    total = total + r ** 2
mse = total / len(x)
print(round(mse, 4))`;

const L = { w: 3, b: 4, total: 5, loop: 6, yHat: 7, r: 8, add: 9, mse: 10, print: 11 } as const;

export const mseLoopSlots = (s: FitState) => ({ w: pyFloat(s.w), b: pyFloat(s.b) });

/** A computed trace of MSE_LOOP_SOURCE: one step per line run, with the arithmetic of each. */
export function buildMseTrace(s: FitState): Trace {
  const xs = REG_POINTS.map((p) => p.x);
  const ys = REG_POINTS.map((p) => p.y);
  const n = xs.length;
  const vars: TraceStep['vars'] = { x: array(xs), y: array(ys) };
  const snap = () => ({ ...vars });
  const steps: TraceStep[] = [
    { range: { line: 1 }, vars: { x: array(xs) }, note: `x holds ${n} flipper lengths in cm.` },
    { range: { line: 2 }, vars: snap(), note: `y holds the same ${n} penguins' body masses in kg.` },
  ];
  vars.w = scalar(s.w);
  steps.push({ range: { line: L.w }, vars: snap(), note: `The slope w = ${formatNumber(s.w)} kg per cm.` });
  vars.b = scalar(s.b);
  steps.push({ range: { line: L.b }, vars: snap(), note: `The intercept b = ${formatNumber(s.b)} kg.` });
  let total = 0;
  vars.total = scalar(total);
  steps.push({ range: { line: L.total }, vars: snap(), note: 'total will collect the squared residuals.' });
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    vars.i = scalar(i);
    steps.push({ range: { line: L.loop }, vars: snap(), note: `i = ${i}: penguin ${i + 1} of ${n}.` });
    const yHat = s.w * x + s.b;
    vars.y_hat = scalar(yHat);
    steps.push({
      range: { line: L.yHat, startCol: 4 },
      vars: snap(),
      note: `y_hat = ${formatNumber(s.w)} × ${formatNumber(x)} + ${paren(s.b)} = ${formatNumber(yHat)} kg predicted.`,
    });
    const r = y - yHat;
    vars.r = scalar(r);
    steps.push({
      range: { line: L.r, startCol: 4 },
      vars: snap(),
      note: `r = ${formatNumber(y)} − ${paren(yHat)} = ${formatNumber(r)}: the penguin is ${r >= 0 ? 'above' : 'below'} the line.`,
    });
    const before = total;
    total = total + r ** 2;
    vars.total = scalar(total);
    steps.push({
      range: { line: L.add, startCol: 4 },
      vars: snap(),
      note: `r² = ${formatNumber(r ** 2)}, so total = ${formatNumber(before)} + ${formatNumber(r ** 2)} = ${formatNumber(total)}.`,
    });
  }
  const value = total / n;
  vars.mse = scalar(value);
  steps.push({
    range: { line: L.mse },
    vars: snap(),
    note: `mse = ${formatNumber(total)} / ${n} = ${formatNumber(value)}: the average squared residual, in kg².`,
  });
  steps.push({
    range: { line: L.print },
    vars: { ...snap(), output: text(pyRound4(value)) },
    note: `round(mse, 4) prints ${pyRound4(value)}.`,
  });
  return { source: 'computed', steps };
}

export const FIT_LIMITS = {
  w: { min: 0, max: 1, step: 0.01 },
  b: { min: -8, max: 2, step: 0.05 },
} as const;

export function fitExperiment(id: string, traceExample: string): ExperimentDef<FitState, FitResult> {
  return {
    id,
    initial: { w: 0.3, b: -1.8, sel: 0, best: 'hide' },
    controls: [
      {
        kind: 'slider',
        id: 'w',
        label: 'Slope w (kg per cm)',
        ...FIT_LIMITS.w,
        get: (s) => s.w,
        set: (s, w) => ({ ...s, w: roundTo(w, 2) }),
      },
      {
        kind: 'slider',
        id: 'b',
        label: 'Intercept b (kg)',
        ...FIT_LIMITS.b,
        get: (s) => s.b,
        set: (s, b) => ({ ...s, b: roundTo(b, 2) }),
      },
      {
        kind: 'slider',
        id: 'sel',
        label: 'Selected penguin',
        min: 1,
        max: REG_POINTS.length,
        get: (s) => s.sel + 1,
        set: (s, v) => ({ ...s, sel: v - 1 }),
      },
      {
        kind: 'select',
        id: 'best',
        label: 'Least-squares line',
        options: [
          { value: 'hide', label: 'Hidden' },
          { value: 'show', label: 'Shown (dashed)' },
        ],
        get: (s) => s.best,
        set: (s, best) => ({ ...s, best: best === 'show' ? 'show' : 'hide' }),
      },
    ],
    compute: computeFit,
    trace: buildMseTrace,
    traceExample,
    readout: (s, r) => {
      const items: ReadoutItem[] = [
        { label: 'Your line', value: lineLabel(s.w, s.b) },
        {
          label: 'MSE = sum of r² / 12',
          value: `${formatNumber(r.total)} / ${r.rows.length} = ${formatNumber(r.mse)} kg²`,
        },
        { label: 'print(round(mse, 4))', value: pyRound4(r.mse) },
      ];
      if (s.best === 'show')
        items.push({
          label: 'Least squares',
          value: `${lineLabel(roundTo(r.fit.slope, 4), roundTo(r.fit.intercept, 4))}, MSE ${formatNumber(r.fitMse)} kg²`,
        });
      return items;
    },
  };
}

// ---------------------------------------------------------------- gradient descent

export interface GDLinState {
  center: 'raw' | 'centered';
  lr: number;
  steps: number;
}

export interface GDLinResult {
  run: LinearGDRun;
  fit: LineFit;
  fitMse: number;
}

export const LR_OPTIONS = [0.0005, 0.001, 0.002, 0.003, 0.01, 0.1, 0.3, 0.5, 0.6] as const;
export const GD_MAX_STEPS = 200;

export function computeGD(s: GDLinState): GDLinResult {
  const fit = leastSquares(REG_POINTS);
  return {
    run: linearGD(REG_POINTS, { lr: s.lr, steps: s.steps, center: s.center === 'centered' }),
    fit,
    fitMse: mse(REG_POINTS, fit.slope, fit.intercept),
  };
}

/** What the lesson's NumPy loop prints: f"slope={w:.4f} intercept={intercept:.4f} mse={mse:.4f}". */
export function gdPrintLine(r: LinearGDRun): string {
  const last = r.path.at(-1)!;
  return `slope=${last.slope.toFixed(4)} intercept=${last.intercept.toFixed(4)} mse=${last.mse.toFixed(4)}`;
}

export function gdExperiment(id: string): ExperimentDef<GDLinState, GDLinResult> {
  return {
    id,
    initial: { center: 'raw', lr: 0.002, steps: 100 },
    controls: [
      {
        kind: 'select',
        id: 'center',
        label: 'x used for training',
        options: [
          { value: 'raw', label: 'Raw x (cm)' },
          { value: 'centered', label: 'Centered x − x̄' },
        ],
        get: (s) => s.center,
        set: (s, v) => ({ ...s, center: v === 'centered' ? 'centered' : 'raw' }),
      },
      {
        kind: 'select',
        id: 'lr',
        label: 'Learning rate η',
        options: LR_OPTIONS.map((v) => ({ value: String(v), label: String(v) })),
        get: (s) => String(s.lr),
        set: (s, v) => ({ ...s, lr: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'steps',
        label: 'Steps',
        min: 1,
        max: GD_MAX_STEPS,
        get: (s) => s.steps,
        set: (s, steps) => ({ ...s, steps }),
      },
    ],
    compute: computeGD,
    readout: (s, r) => {
      const { run, fit, fitMse } = r;
      const best: ReadoutItem = {
        label: 'Least squares (closed form)',
        value: `slope ${formatNumber(fit.slope)}, intercept ${formatNumber(fit.intercept)}, MSE ${formatNumber(fitMse)}`,
      };
      if (run.status === 'diverged')
        return [
          {
            label: 'Status',
            value: `values passed ±1e6 at step ${run.divergedAt}; the learning rate is too large for this x`,
            status: 'diverged',
          },
          best,
        ];
      const last = run.path.at(-1)!;
      return [
        {
          label: `After ${s.steps} steps`,
          value: lineLabel(roundTo(last.slope, 4), roundTo(last.intercept, 4)),
        },
        { label: 'MSE now', value: `${formatNumber(last.mse)} (least squares: ${formatNumber(fitMse)})` },
        { label: 'The code prints', value: gdPrintLine(run) },
        best,
      ];
    },
  };
}
