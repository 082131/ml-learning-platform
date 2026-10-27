import type { ExperimentDef } from '../types';
import { argmin, scoreFit, sineData, type FitScores, type SineData } from './polyRidge';

/** State shared by the fit plot, both error curves, the NumPy code and the readout. */
export interface FitState {
  degree: number;
  /** λ = 10^logLambda. */
  logLambda: number;
}

export interface FitResult extends FitScores {
  w: number[];
  /** Train and validation MSE for every degree 0..MAX_DEGREE at the current λ. */
  byDegree: FitScores[];
  /** Train and validation MSE for every log λ in LOG_LAMBDAS at the current degree. */
  byLambda: FitScores[];
  bestDegree: number;
  bestLogLambda: number;
}

export const MAX_DEGREE = 12;
export const LOG_LAMBDA_MIN = -8;
export const LOG_LAMBDA_MAX = 1;
export const LOG_LAMBDA_STEP = 0.5;
export const LOG_LAMBDAS = Array.from(
  { length: (LOG_LAMBDA_MAX - LOG_LAMBDA_MIN) / LOG_LAMBDA_STEP + 1 },
  (_, i) => LOG_LAMBDA_MIN + i * LOG_LAMBDA_STEP,
);
/** The lesson's data: 20 training and 20 validation points, y = sin(2πx) + N(0, 0.3²) noise, seed 1. */
export const DATA_SEED = 1;
export const FIT_DATA: SineData = sineData(DATA_SEED);

export const lambdaOf = (logLambda: number) => 10 ** logLambda;
/** The λ literal in the Python code: `10 ** -8`, `10 ** -2.5`. */
export const pythonLambda = (logLambda: number) => `10 ** ${logLambda}`;
/** What the Python code prints, with the same 4-decimal formatting as f"{v:.4f}". */
export const fitPrintout = (r: FitScores) =>
  `train MSE ${r.train.toFixed(4)}, validation MSE ${r.validation.toFixed(4)}`;

export function computeFit(s: FitState, data: SineData = FIT_DATA): FitResult {
  const lambda = lambdaOf(s.logLambda);
  const byDegree = Array.from({ length: MAX_DEGREE + 1 }, (_, d) => {
    const { train, validation } = scoreFit(data, d, lambda);
    return { train, validation };
  });
  const byLambda = LOG_LAMBDAS.map((l) => {
    const { train, validation } = scoreFit(data, s.degree, lambdaOf(l));
    return { train, validation };
  });
  const current = scoreFit(data, s.degree, lambda);
  return {
    ...current,
    byDegree,
    byLambda,
    bestDegree: argmin(byDegree.map((f) => f.validation)),
    bestLogLambda: LOG_LAMBDAS[argmin(byLambda.map((f) => f.validation))]!,
  };
}

/**
 * Which side of the validation minimum the current setting is on. More degree or less λ means more
 * flexibility: left of the minimum is the underfitting side, right of it the overfitting side.
 */
export function diagnose(s: FitState, r: FitResult): string {
  const flexMore = s.degree > r.bestDegree;
  const flexLess = s.degree < r.bestDegree;
  if (flexLess)
    return `Underfitting side: validation error is lowest at degree ${r.bestDegree} for this λ, and a degree-${s.degree} curve is too stiff.`;
  if (flexMore)
    return `Overfitting side: validation error is lowest at degree ${r.bestDegree} for this λ; the extra flexibility fits noise.`;
  return `At the validation minimum over degrees for this λ (degree ${r.bestDegree}).`;
}

export function fitExperiment(id: string): ExperimentDef<FitState, FitResult> {
  return {
    id,
    initial: { degree: 3, logLambda: LOG_LAMBDA_MIN },
    controls: [
      {
        kind: 'slider',
        id: 'degree',
        label: 'Polynomial degree d',
        min: 0,
        max: MAX_DEGREE,
        get: (s) => s.degree,
        set: (s, degree) => ({ ...s, degree }),
      },
      {
        kind: 'slider',
        id: 'logLambda',
        label: 'Penalty: log₁₀ lambda',
        min: LOG_LAMBDA_MIN,
        max: LOG_LAMBDA_MAX,
        step: LOG_LAMBDA_STEP,
        get: (s) => s.logLambda,
        set: (s, logLambda) => ({ ...s, logLambda }),
        format: (v) => `${v} (λ = ${lambdaOf(v).toPrecision(2)})`,
      },
    ],
    compute: (s) => computeFit(s),
    readout: (s, r) => [
      { label: 'NumPy: the print line', value: fitPrintout(r) },
      {
        label: 'Validation − train MSE',
        value: `${r.validation.toFixed(4)} − ${r.train.toFixed(4)} = ${(r.validation - r.train).toFixed(4)}`,
      },
      {
        label: `Best degree for λ = 10^${s.logLambda}`,
        value: `${r.bestDegree} (validation MSE ${r.byDegree[r.bestDegree]!.validation.toFixed(4)})`,
      },
      {
        label: `Best log₁₀ λ for degree ${s.degree}`,
        value: `${r.bestLogLambda} (validation MSE ${r.byLambda[LOG_LAMBDAS.indexOf(r.bestLogLambda)]!.validation.toFixed(4)})`,
      },
      { label: 'Diagnosis', value: diagnose(s, r) },
    ],
  };
}

/** A NumPy array literal of the values, 10 per line, continuation lines indented 5 spaces. */
export function pythonArrayLines(values: readonly number[], perLine = 10): string {
  const chunks: string[] = [];
  for (let i = 0; i < values.length; i += perLine) chunks.push(values.slice(i, i + perLine).join(', '));
  return `np.array([${chunks.join(',\n     ')}])`;
}

/** The four data lines of the lesson's Python code. */
export const pythonFitData = (data: SineData = FIT_DATA) =>
  [
    `x_train = ${pythonArrayLines(data.train.x)}`,
    `y_train = ${pythonArrayLines(data.train.y)}`,
    `x_val = ${pythonArrayLines(data.validation.x)}`,
    `y_val = ${pythonArrayLines(data.validation.y)}`,
  ].join('\n');
