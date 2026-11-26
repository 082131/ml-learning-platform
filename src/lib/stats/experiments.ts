/**
 * Experiment definitions for the Statistics and probability track. Each one is pure: a state (the controls), a
 * compute function the visual, the code slots and the readout all read from, and a readout. Numbers are computed live
 * from the visible inputs; simulated values are seeded so they can be reproduced.
 */
import { seededRandom } from '../classical/random';
import type { ExperimentDef } from '../types';
import {
  betaCdf,
  betaPdf,
  betaQuantile,
  binomPmf,
  normalCdf,

  normalQuantile,
  poissonPmf,
  probBetaGreater,
} from './dist';
import {
  betaDraw,
  getPopulation,
  intervalCoverage,
  mean,
  POPULATIONS,
  sampleMeans,
  simulateAATests,
  skewness,
  spread,
  type Interval,
  type IntervalMethod,
  type PeekRun,
} from './sim';

const pct = (x: number, digits = 1) => `${(100 * x).toFixed(digits)}%`;
const fix = (x: number, d = 4) => x.toFixed(d);
const opts = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
/** Shown with p-values: below 0.0001 we say so instead of printing a row of zeros. */
export const fmtP = (p: number) => (p < 0.0001 ? '< 0.0001' : p.toFixed(4));

// ---------- 1. Two dice: events, unions, intersections, independence ----------

export interface DiceEvent {
  label: string;
  /** The same condition as Python code, for the code slot. */
  py: string;
  test: (a: number, b: number) => boolean;
}

export const DICE_EVENTS: Record<string, DiceEvent> = {
  sum7: { label: 'the sum is 7', py: 'a + b == 7', test: (a, b) => a + b === 7 },
  first6: { label: 'the first die shows 6', py: 'a == 6', test: (a) => a === 6 },
  second6: { label: 'the second die shows 6', py: 'b == 6', test: (_a, b) => b === 6 },
  doubles: { label: 'both dice show the same number', py: 'a == b', test: (a, b) => a === b },
  sum10: { label: 'the sum is 10 or more', py: 'a + b >= 10', test: (a, b) => a + b >= 10 },
  any6: { label: 'at least one die shows 6', py: 'a == 6 or b == 6', test: (a, b) => a === 6 || b === 6 },
  even: { label: 'the sum is even', py: '(a + b) % 2 == 0', test: (a, b) => (a + b) % 2 === 0 },
  firstOdd: { label: 'the first die is odd', py: 'a % 2 == 1', test: (a) => a % 2 === 1 },
};

export interface DiceState {
  a: string;
  b: string;
}

export interface DiceCell {
  a: number;
  b: number;
  inA: boolean;
  inB: boolean;
}

export interface DiceResult {
  cells: DiceCell[];
  nA: number;
  nB: number;
  nBoth: number;
  nEither: number;
  /** P(A and B) equals P(A)·P(B), compared exactly in counts out of 36. */
  independent: boolean;
  /** P(B | A) = nBoth / nA. */
  bGivenA: number;
}

export function diceResult(s: DiceState): DiceResult {
  const A = DICE_EVENTS[s.a] ?? DICE_EVENTS.sum7!;
  const B = DICE_EVENTS[s.b] ?? DICE_EVENTS.first6!;
  const cells: DiceCell[] = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) cells.push({ a, b, inA: A.test(a, b), inB: B.test(a, b) });
  const nA = cells.filter((c) => c.inA).length;
  const nB = cells.filter((c) => c.inB).length;
  const nBoth = cells.filter((c) => c.inA && c.inB).length;
  const nEither = cells.filter((c) => c.inA || c.inB).length;
  return { cells, nA, nB, nBoth, nEither, independent: nBoth * 36 === nA * nB, bGivenA: nA ? nBoth / nA : 0 };
}

const eventOptions = Object.entries(DICE_EVENTS).map(([value, e]) => ({ value, label: e.label }));

export function diceExperiment(id: string): ExperimentDef<DiceState, DiceResult> {
  return {
    id,
    initial: { a: 'sum7', b: 'first6' },
    controls: [
      { kind: 'select', id: 'a', label: 'Event A', options: eventOptions, get: (s) => s.a, set: (s, v) => ({ ...s, a: v }) },
      { kind: 'select', id: 'b', label: 'Event B', options: eventOptions, get: (s) => s.b, set: (s, v) => ({ ...s, b: v }) },
    ],
    compute: diceResult,
    readout: (_s, r) => [
      { label: 'P(A)', value: `${r.nA}/36 = ${fix(r.nA / 36)}` },
      { label: 'P(B)', value: `${r.nB}/36 = ${fix(r.nB / 36)}` },
      { label: 'P(A and B)', value: `${r.nBoth}/36 = ${fix(r.nBoth / 36)}` },
      { label: 'P(A or B)', value: `${r.nA} + ${r.nB} − ${r.nBoth} = ${r.nEither}/36 = ${fix(r.nEither / 36)}` },
      { label: 'P(A)·P(B)', value: fix((r.nA / 36) * (r.nB / 36)) },
      { label: 'Independent?', value: r.independent ? 'yes: P(A and B) = P(A)·P(B)' : 'no: P(A and B) ≠ P(A)·P(B)', status: r.independent ? 'ok' : 'error' },
    ],
  };
}

// ---------- 2. Conditional probability: a fraud flag, in natural frequencies ----------

export const SCREEN_POPULATION = 100_000;

export interface ScreenState {
  /** Share of transactions that are fraud, in percent. */
  prevalence: number;
  /** Share of fraud the model flags (sensitivity, recall), in percent. */
  sensitivity: number;
  /** Share of legitimate transactions the model flags anyway (false positive rate), in percent. */
  fpr: number;
}

export interface ScreenResult {
  fraud: number;
  legit: number;
  truePos: number;
  falseNeg: number;
  falsePos: number;
  trueNeg: number;
  flagged: number;
  /** P(fraud | flagged): of the flagged transactions, the share that really are fraud. */
  ppv: number;
  /** P(legit | not flagged). */
  npv: number;
}

export function screenResult(s: ScreenState): ScreenResult {
  const fraud = Math.round((SCREEN_POPULATION * s.prevalence) / 100);
  const legit = SCREEN_POPULATION - fraud;
  const truePos = Math.round((fraud * s.sensitivity) / 100);
  const falsePos = Math.round((legit * s.fpr) / 100);
  const flagged = truePos + falsePos;
  const trueNeg = legit - falsePos;
  const falseNeg = fraud - truePos;
  return {
    fraud,
    legit,
    truePos,
    falseNeg,
    falsePos,
    trueNeg,
    flagged,
    ppv: flagged ? truePos / flagged : 0,
    npv: trueNeg + falseNeg ? trueNeg / (trueNeg + falseNeg) : 0,
  };
}

export function screenExperiment(id: string): ExperimentDef<ScreenState, ScreenResult> {
  return {
    id,
    initial: { prevalence: 1, sensitivity: 95, fpr: 5 },
    controls: [
      { kind: 'slider', id: 'prevalence', label: 'Fraud base rate (%)', min: 0.1, max: 30, step: 0.1, get: (s) => s.prevalence, set: (s, v) => ({ ...s, prevalence: v }), format: (v) => `${v.toFixed(1)}%` },
      { kind: 'slider', id: 'sensitivity', label: 'Fraud caught: P(flag | fraud) (%)', min: 50, max: 100, step: 1, get: (s) => s.sensitivity, set: (s, v) => ({ ...s, sensitivity: v }), format: (v) => `${v}%` },
      { kind: 'slider', id: 'fpr', label: 'False alarms: P(flag | legit) (%)', min: 1, max: 30, step: 1, get: (s) => s.fpr, set: (s, v) => ({ ...s, fpr: v }), format: (v) => `${v}%` },
    ],
    compute: screenResult,
    readout: (_s, r) => [
      { label: 'Flagged', value: `${r.truePos.toLocaleString('en-US')} fraud + ${r.falsePos.toLocaleString('en-US')} legit = ${r.flagged.toLocaleString('en-US')}` },
      { label: 'P(fraud | flagged)', value: `${r.truePos.toLocaleString('en-US')} / ${r.flagged.toLocaleString('en-US')} = ${pct(r.ppv)}` },
      { label: 'P(legit | not flagged)', value: pct(r.npv, 2) },
    ],
  };
}

// ---------- 3. Random variables, expected value, variance, long-run average ----------

export interface Gamble {
  label: string;
  values: number[];
  probs: number[];
  unit: string;
}

export const GAMBLES: Record<string, Gamble> = {
  die: { label: 'A fair die', values: [1, 2, 3, 4, 5, 6], probs: Array(6).fill(1 / 6), unit: 'points' },
  spinner: { label: 'A prize spinner: lose $1, win $1 or win $4', values: [-1, 1, 4], probs: [0.5, 0.3, 0.2], unit: '$' },
  claims: { label: 'Insurance claims per policy: $0, $500 or $5,000', values: [0, 500, 5000], probs: [0.9, 0.08, 0.02], unit: '$' },
};

export interface GambleStats {
  mean: number;
  variance: number;
  sd: number;
}

/** E[X] = Σ x·p; Var(X) = Σ (x − E[X])²·p; SD = √Var. */
export function gambleStats(g: Gamble): GambleStats {
  const m = g.values.reduce((s, x, i) => s + x * g.probs[i]!, 0);
  const variance = g.values.reduce((s, x, i) => s + (x - m) ** 2 * g.probs[i]!, 0);
  return { mean: m, variance, sd: Math.sqrt(variance) };
}

export interface GambleState {
  game: string;
  n: number;
  seed: number;
}

export interface GambleResult extends GambleStats {
  gamble: Gamble;
  /** [draw number, average so far], thinned to at most ~200 points for the chart. */
  running: [number, number][];
  finalMean: number;
  counts: number[];
}

export function gambleResult(s: GambleState): GambleResult {
  const g = GAMBLES[s.game] ?? GAMBLES.die!;
  const rand = seededRandom(s.seed);
  const every = Math.max(1, Math.floor(s.n / 200));
  const counts = g.values.map(() => 0);
  const running: [number, number][] = [];
  let sum = 0;
  for (let i = 1; i <= s.n; i++) {
    const u = rand();
    let cum = 0;
    let k = g.values.length - 1;
    for (let j = 0; j < g.values.length; j++) {
      cum += g.probs[j]!;
      if (u < cum) {
        k = j;
        break;
      }
    }
    counts[k]!++;
    sum += g.values[k]!;
    if (i % every === 0 || i === s.n) running.push([i, sum / i]);
  }
  return { ...gambleStats(g), gamble: g, running, finalMean: sum / s.n, counts };
}

export function gambleExperiment(id: string): ExperimentDef<GambleState, GambleResult> {
  return {
    id,
    initial: { game: 'spinner', n: 500, seed: 3 },
    controls: [
      { kind: 'select', id: 'game', label: 'Random variable', options: Object.entries(GAMBLES).map(([value, g]) => ({ value, label: g.label })), get: (s) => s.game, set: (s, v) => ({ ...s, game: v }) },
      { kind: 'slider', id: 'n', label: 'Number of plays', min: 10, max: 5000, step: 10, get: (s) => s.n, set: (s, v) => ({ ...s, n: v }) },
      { kind: 'slider', id: 'seed', label: 'Random seed', min: 1, max: 30, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: gambleResult,
    readout: (s, r) => [
      { label: 'E[X] (long-run average)', value: fix(r.mean, 3) },
      { label: `Average of ${s.n} plays`, value: fix(r.finalMean, 3) },
      { label: 'Var(X)', value: fix(r.variance, 3) },
      { label: 'SD(X)', value: fix(r.sd, 3) },
    ],
  };
}

// ---------- 4. Binomial and Poisson ----------

export interface DiscreteState {
  family: 'binomial' | 'poisson';
  n: number;
  p: number;
  lambda: number;
  k: number;
}

export interface DiscreteResult {
  values: number[];
  probs: number[];
  mean: number;
  sd: number;
  pExactly: number;
  pAtMost: number;
  pMore: number;
}

export function discreteResult(s: DiscreteState): DiscreteResult {
  const binom = s.family === 'binomial';
  const mean = binom ? s.n * s.p : s.lambda;
  const variance = binom ? s.n * s.p * (1 - s.p) : s.lambda;
  const top = binom ? s.n : Math.max(12, Math.ceil(s.lambda + 4 * Math.sqrt(s.lambda)));
  const values = Array.from({ length: top + 1 }, (_, i) => i);
  const probs = values.map((k) => (binom ? binomPmf(k, s.n, s.p) : poissonPmf(k, s.lambda)));
  const pmf = (k: number) => (binom ? binomPmf(k, s.n, s.p) : poissonPmf(k, s.lambda));
  let atMost = 0;
  for (let i = 0; i <= s.k; i++) atMost += pmf(i);
  atMost = Math.min(1, atMost);
  return { values, probs, mean, sd: Math.sqrt(variance), pExactly: pmf(s.k), pAtMost: atMost, pMore: Math.max(0, 1 - atMost) };
}

export function discreteExperiment(id: string): ExperimentDef<DiscreteState, DiscreteResult> {
  return {
    id,
    initial: { family: 'binomial', n: 20, p: 0.1, lambda: 3, k: 2 },
    controls: [
      { kind: 'select', id: 'family', label: 'Distribution', options: opts([['binomial', 'Binomial: successes in n tries'], ['poisson', 'Poisson: events in a time window']]), get: (s) => s.family, set: (s, v) => ({ ...s, family: v as DiscreteState['family'] }) },
      { kind: 'slider', id: 'n', label: 'Binomial: tries n', min: 1, max: 60, step: 1, get: (s) => s.n, set: (s, v) => ({ ...s, n: v }) },
      { kind: 'slider', id: 'p', label: 'Binomial: success chance p', min: 0.01, max: 0.99, step: 0.01, get: (s) => s.p, set: (s, v) => ({ ...s, p: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'lambda', label: 'Poisson: average count λ', min: 0.5, max: 20, step: 0.5, get: (s) => s.lambda, set: (s, v) => ({ ...s, lambda: v }) },
      { kind: 'slider', id: 'k', label: 'Threshold k', min: 0, max: 40, step: 1, get: (s) => s.k, set: (s, v) => ({ ...s, k: v }) },
    ],
    compute: discreteResult,
    readout: (s, r) => [
      { label: 'Distribution', value: s.family === 'binomial' ? `Binomial(n = ${s.n}, p = ${s.p.toFixed(2)})` : `Poisson(λ = ${s.lambda})` },
      { label: 'Mean', value: fix(r.mean, 3) },
      { label: 'SD', value: fix(r.sd, 3) },
      { label: `P(X = ${s.k})`, value: fix(r.pExactly) },
      { label: `P(X ≤ ${s.k})`, value: fix(r.pAtMost) },
      { label: `P(X > ${s.k})`, value: fix(r.pMore) },
    ],
  };
}

// ---------- 5. The normal curve ----------

export interface NormalState {
  mu: number;
  sigma: number;
  a: number;
  b: number;
}

export interface NormalResult {
  zA: number;
  zB: number;
  /** P(a < X < b) = Φ(z_b) − Φ(z_a). */
  prob: number;
  cdfA: number;
  cdfB: number;
}

export function normalResult(s: NormalState): NormalResult {
  const lo = Math.min(s.a, s.b);
  const hi = Math.max(s.a, s.b);
  const zA = (lo - s.mu) / s.sigma;
  const zB = (hi - s.mu) / s.sigma;
  const cdfA = normalCdf(zA);
  const cdfB = normalCdf(zB);
  return { zA, zB, prob: cdfB - cdfA, cdfA, cdfB };
}

export function normalExperiment(id: string): ExperimentDef<NormalState, NormalResult> {
  return {
    id,
    initial: { mu: 500, sigma: 40, a: 460, b: 540 },
    controls: [
      { kind: 'slider', id: 'mu', label: 'Mean μ (orders per day)', min: 400, max: 600, step: 5, get: (s) => s.mu, set: (s, v) => ({ ...s, mu: v }) },
      { kind: 'slider', id: 'sigma', label: 'Standard deviation σ', min: 10, max: 80, step: 5, get: (s) => s.sigma, set: (s, v) => ({ ...s, sigma: v }) },
      { kind: 'slider', id: 'a', label: 'From a', min: 300, max: 700, step: 5, get: (s) => s.a, set: (s, v) => ({ ...s, a: v }) },
      { kind: 'slider', id: 'b', label: 'To b', min: 300, max: 700, step: 5, get: (s) => s.b, set: (s, v) => ({ ...s, b: v }) },
    ],
    compute: normalResult,
    readout: (s, r) => [
      { label: 'z of a', value: `(${Math.min(s.a, s.b)} − ${s.mu}) / ${s.sigma} = ${r.zA.toFixed(2)}` },
      { label: 'z of b', value: `(${Math.max(s.a, s.b)} − ${s.mu}) / ${s.sigma} = ${r.zB.toFixed(2)}` },
      { label: 'P(a < X < b)', value: `${fix(r.cdfB)} − ${fix(r.cdfA)} = ${fix(r.prob)}` },
    ],
  };
}

// ---------- 6 and 7. Sampling distributions and the central limit theorem ----------

export const SAMPLE_REPS = 1000;

export interface SamplingState {
  pop: string;
  n: number;
  seed: number;
}

export interface SamplingResult {
  means: number[];
  first: number[];
  /** The SD of the 1,000 sample means, measured. */
  seMeasured: number;
  /** σ / √n, predicted. */
  seFormula: number;
  meanOfMeans: number;
  skewMeans: number;
  /** Share of sample means within μ ± 1.96·σ/√n. */
  within: number;
  /** Shares below μ − 1.96·σ/√n and above μ + 1.96·σ/√n: 2.5% each if the means are normal. */
  tailLow: number;
  tailHigh: number;
}

export function samplingResult(s: SamplingState): SamplingResult {
  const pop = getPopulation(s.pop);
  const { means, first } = sampleMeans(pop, s.n, SAMPLE_REPS, s.seed);
  const seFormula = pop.sd / Math.sqrt(s.n);
  const within = means.filter((m) => Math.abs(m - pop.mean) <= 1.96 * seFormula).length / means.length;
  const tailLow = means.filter((m) => m < pop.mean - 1.96 * seFormula).length / means.length;
  const tailHigh = means.filter((m) => m > pop.mean + 1.96 * seFormula).length / means.length;
  return { means, first, seMeasured: spread(means), seFormula, meanOfMeans: mean(means), skewMeans: skewness(means), within, tailLow, tailHigh };
}

const popOptions = Object.values(POPULATIONS).map((p) => ({ value: p.id, label: p.label }));

export function samplingExperiment(id: string, initial: SamplingState): ExperimentDef<SamplingState, SamplingResult> {
  return {
    id,
    initial,
    controls: [
      { kind: 'select', id: 'pop', label: 'Population', options: popOptions, get: (s) => s.pop, set: (s, v) => ({ ...s, pop: v }) },
      { kind: 'slider', id: 'n', label: 'Sample size n', min: 1, max: 200, step: 1, get: (s) => s.n, set: (s, v) => ({ ...s, n: v }) },
      { kind: 'slider', id: 'seed', label: 'Random seed', min: 1, max: 30, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: samplingResult,
    readout: (s, r) => {
      const pop = getPopulation(s.pop);
      return [
        { label: 'Population mean μ, SD σ', value: `${pop.mean.toFixed(2)}, ${pop.sd.toFixed(2)}` },
        { label: `Mean of ${SAMPLE_REPS} sample means`, value: r.meanOfMeans.toFixed(2) },
        { label: 'SD of the sample means (measured)', value: r.seMeasured.toFixed(3) },
        { label: 'σ / √n (predicted standard error)', value: `${pop.sd.toFixed(2)} / √${s.n} = ${r.seFormula.toFixed(3)}` },
        { label: 'Skewness of the means', value: r.skewMeans.toFixed(2) },
        { label: 'Means within μ ± 1.96 SE', value: pct(r.within) },
        { label: 'Below / above that range', value: `${pct(r.tailLow)} / ${pct(r.tailHigh)} (a normal curve: 2.5% / 2.5%)` },
      ];
    },
  };
}

// ---------- 8. Confidence intervals ----------

export const CI_REPS = 1000;
export const CI_SHOWN = 50;

export interface CiState {
  pop: string;
  n: number;
  confidence: number;
  method: IntervalMethod;
  seed: number;
}

/**
 * Whether a simulated coverage is consistent with the promised level: within 3 Monte Carlo standard errors,
 * 3·√(c(1 − c) / CI_REPS), about ±2 points at 95%. Anything further is very unlikely to be simulation noise.
 */
export const coverageOk = (coverage: number, confidence: number) =>
  Math.abs(coverage - confidence) <= 3 * Math.sqrt((confidence * (1 - confidence)) / CI_REPS);

export interface CiResult {
  shown: Interval[];
  covered: number;
  coverage: number;
  shownMisses: number;
  avgWidth: number;
  trueMean: number;
}

export function ciResult(s: CiState): CiResult {
  const pop = getPopulation(s.pop);
  const { intervals, covered } = intervalCoverage(pop, s.n, s.confidence, s.method, CI_REPS, s.seed);
  const shown = intervals.slice(0, CI_SHOWN);
  return {
    shown,
    covered,
    coverage: covered / CI_REPS,
    shownMisses: shown.filter((i) => !i.covers).length,
    avgWidth: mean(intervals.map((i) => i.hi - i.lo)),
    trueMean: pop.mean,
  };
}

export function ciExperiment(id: string): ExperimentDef<CiState, CiResult> {
  return {
    id,
    initial: { pop: 'heights', n: 10, confidence: 0.95, method: 't', seed: 4 },
    controls: [
      { kind: 'select', id: 'pop', label: 'Population', options: popOptions.filter((o) => o.value !== 'convert'), get: (s) => s.pop, set: (s, v) => ({ ...s, pop: v }) },
      { kind: 'slider', id: 'n', label: 'Sample size n', min: 3, max: 200, step: 1, get: (s) => s.n, set: (s, v) => ({ ...s, n: v }) },
      { kind: 'select', id: 'confidence', label: 'Confidence level', options: opts([['0.8', '80%'], ['0.9', '90%'], ['0.95', '95%'], ['0.99', '99%']]), get: (s) => String(s.confidence), set: (s, v) => ({ ...s, confidence: Number(v) }) },
      { kind: 'select', id: 'method', label: 'Interval', options: opts([['t', 't interval with the sample SD (correct)'], ['z-with-s', 'z interval with the sample SD (too narrow for small n)'], ['z-known', 'z interval with the true σ (needs σ known)']]), get: (s) => s.method, set: (s, v) => ({ ...s, method: v as IntervalMethod }) },
      { kind: 'slider', id: 'seed', label: 'Random seed', min: 1, max: 30, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: ciResult,
    readout: (s, r) => [
      { label: `Intervals that contain μ = ${r.trueMean}`, value: `${r.covered} of ${CI_REPS} = ${pct(r.coverage)}`, status: coverageOk(r.coverage, s.confidence) ? 'ok' : 'error' },
      { label: 'Promised', value: pct(s.confidence, 0) },
      { label: `Misses among the ${CI_SHOWN} drawn`, value: String(r.shownMisses) },
      { label: 'Average width', value: r.avgWidth.toFixed(2) },
    ],
  };
}

// ---------- 9. A hypothesis test: is the new model really better? ----------

export interface TestState {
  n: number;
  k: number;
  /** The rate the null hypothesis claims, in percent. */
  p0: number;
  sides: 'greater' | 'two';
}

export interface TestResult {
  values: number[];
  probs: number[];
  /** Which outcomes count as "at least as extreme" as the observed k. */
  extreme: boolean[];
  pValue: number;
  expected: number;
  sd: number;
  z: number;
}

/** Exact binomial test. Two-sided: every outcome no more likely than the observed one (SciPy's binomtest rule). */
export function binomialTest(s: TestState): TestResult {
  const p0 = s.p0 / 100;
  const k = Math.min(s.k, s.n);
  const values = Array.from({ length: s.n + 1 }, (_, i) => i);
  const probs = values.map((i) => binomPmf(i, s.n, p0));
  const observed = probs[k]!;
  const RELATIVE = 1 + 1e-7; // the same tolerance SciPy uses for ties
  const extreme = values.map((i) => (s.sides === 'greater' ? i >= k : probs[i]! <= observed * RELATIVE));
  const pValue = Math.min(1, probs.reduce((acc, p, i) => acc + (extreme[i] ? p : 0), 0));
  const expected = s.n * p0;
  const sd = Math.sqrt(s.n * p0 * (1 - p0));
  return { values, probs, extreme, pValue, expected, sd, z: (k - expected) / sd };
}

export function testExperiment(id: string): ExperimentDef<TestState, TestResult> {
  return {
    id,
    initial: { n: 100, k: 78, p0: 70, sides: 'greater' },
    controls: [
      { kind: 'slider', id: 'n', label: 'Tickets labeled n', min: 10, max: 400, step: 10, get: (s) => s.n, set: (s, v) => ({ ...s, n: v, k: Math.min(s.k, v) }) },
      { kind: 'slider', id: 'k', label: 'Correct labels k', min: 0, max: 400, step: 1, get: (s) => s.k, set: (s, v) => ({ ...s, k: Math.min(v, s.n) }) },
      { kind: 'slider', id: 'p0', label: 'Old model accuracy, the null (%)', min: 10, max: 95, step: 1, get: (s) => s.p0, set: (s, v) => ({ ...s, p0: v }) },
      { kind: 'select', id: 'sides', label: 'Alternative', options: opts([['greater', 'one-sided: the new model is better'], ['two', 'two-sided: the new model is different']]), get: (s) => s.sides, set: (s, v) => ({ ...s, sides: v as TestState['sides'] }) },
    ],
    compute: binomialTest,
    readout: (s, r) => [
      { label: 'Observed accuracy', value: `${Math.min(s.k, s.n)}/${s.n} = ${pct(Math.min(s.k, s.n) / s.n)}` },
      { label: 'Expected under the null', value: `${r.expected.toFixed(1)} correct (SD ${r.sd.toFixed(2)})` },
      { label: 'z (how many SDs away)', value: r.z.toFixed(2) },
      { label: 'p-value', value: fmtP(r.pValue), status: r.pValue < 0.05 ? 'ok' : undefined },
      { label: 'At α = 0.05', value: r.pValue < 0.05 ? 'reject the null' : 'not enough evidence to reject the null' },
    ],
  };
}

// ---------- 10. Errors and power ----------

export interface PowerState {
  /** The true effect, in standard deviations of one observation (Cohen's d). */
  effect: number;
  n: number;
  alpha: number;
  sides: 'one' | 'two';
}

export interface PowerResult {
  /** Where the test statistic's distribution sits when the effect is real: d·√n. */
  shift: number;
  crit: number;
  power: number;
  beta: number;
  /** n for 80% power at this effect and α. */
  nFor80: number;
}

export function powerResult(s: PowerState): PowerResult {
  const shift = s.effect * Math.sqrt(s.n);
  const zA = normalQuantile(1 - (s.sides === 'two' ? s.alpha / 2 : s.alpha));
  const power = s.sides === 'two' ? 1 - normalCdf(zA - shift) + normalCdf(-zA - shift) : 1 - normalCdf(zA - shift);
  const nFor80 = s.effect > 0 ? Math.ceil(((zA + normalQuantile(0.8)) / s.effect) ** 2) : Infinity;
  return { shift, crit: zA, power, beta: 1 - power, nFor80 };
}

export function powerExperiment(id: string): ExperimentDef<PowerState, PowerResult> {
  return {
    id,
    initial: { effect: 0.3, n: 50, alpha: 0.05, sides: 'one' },
    controls: [
      { kind: 'slider', id: 'effect', label: 'True effect d (in SDs)', min: 0, max: 1, step: 0.05, get: (s) => s.effect, set: (s, v) => ({ ...s, effect: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'n', label: 'Sample size n', min: 5, max: 400, step: 5, get: (s) => s.n, set: (s, v) => ({ ...s, n: v }) },
      { kind: 'select', id: 'alpha', label: 'Significance level α', options: opts([['0.01', '0.01'], ['0.05', '0.05'], ['0.1', '0.10']]), get: (s) => String(s.alpha), set: (s, v) => ({ ...s, alpha: Number(v) }) },
      { kind: 'select', id: 'sides', label: 'Test', options: opts([['one', 'one-sided'], ['two', 'two-sided']]), get: (s) => s.sides, set: (s, v) => ({ ...s, sides: v as PowerState['sides'] }) },
    ],
    compute: powerResult,
    readout: (s, r) => [
      { label: 'Critical z', value: r.crit.toFixed(3) },
      { label: 'Effect in standard errors d·√n', value: `${s.effect.toFixed(2)} × √${s.n} = ${r.shift.toFixed(2)}` },
      { label: 'Type I error rate α', value: String(s.alpha) },
      { label: 'Type II error rate β', value: fix(r.beta, 3) },
      { label: 'Power 1 − β', value: pct(r.power), status: r.power >= 0.8 ? 'ok' : undefined },
      { label: 'n for 80% power', value: Number.isFinite(r.nFor80) ? String(r.nFor80) : 'no n is enough when d = 0' },
    ],
  };
}

// ---------- 11. A/B test sample size ----------

export interface DesignState {
  /** Baseline conversion rate, in percent. */
  baseline: number;
  /** Minimum detectable effect, relative, in percent. */
  mde: number;
  alpha: number;
  power: number;
  /** Visitors per day, both arms together. */
  traffic: number;
}

/** n per group ≈ (z₁₋α/₂ + z₁₋β)² · (p₁(1−p₁) + p₂(1−p₂)) / (p₂ − p₁)². */
export function samplePerGroup(p1: number, relLift: number, alpha: number, power: number): number {
  const p2 = p1 * (1 + relLift);
  const z = normalQuantile(1 - alpha / 2) + normalQuantile(power);
  return Math.ceil((z * z * (p1 * (1 - p1) + p2 * (1 - p2))) / (p2 - p1) ** 2);
}

export interface DesignResult {
  p1: number;
  p2: number;
  perGroup: number;
  days: number;
  /** [relative MDE in %, n per group] from 2% to 50%. */
  curve: [number, number][];
}

export function designResult(s: DesignState): DesignResult {
  const p1 = s.baseline / 100;
  const perGroup = samplePerGroup(p1, s.mde / 100, s.alpha, s.power);
  const curve: [number, number][] = [];
  for (let m = 2; m <= 50; m += 1) curve.push([m, samplePerGroup(p1, m / 100, s.alpha, s.power)]);
  return { p1, p2: p1 * (1 + s.mde / 100), perGroup, days: Math.ceil((2 * perGroup) / s.traffic), curve };
}

export function designExperiment(id: string): ExperimentDef<DesignState, DesignResult> {
  return {
    id,
    initial: { baseline: 5, mde: 10, alpha: 0.05, power: 0.8, traffic: 4000 },
    controls: [
      { kind: 'slider', id: 'baseline', label: 'Baseline conversion (%)', min: 0.5, max: 50, step: 0.5, get: (s) => s.baseline, set: (s, v) => ({ ...s, baseline: v }) },
      { kind: 'slider', id: 'mde', label: 'Smallest lift worth detecting (relative %)', min: 2, max: 50, step: 1, get: (s) => s.mde, set: (s, v) => ({ ...s, mde: v }) },
      { kind: 'select', id: 'alpha', label: 'Significance level α (two-sided)', options: opts([['0.01', '0.01'], ['0.05', '0.05'], ['0.1', '0.10']]), get: (s) => String(s.alpha), set: (s, v) => ({ ...s, alpha: Number(v) }) },
      { kind: 'select', id: 'power', label: 'Power', options: opts([['0.8', '80%'], ['0.9', '90%']]), get: (s) => String(s.power), set: (s, v) => ({ ...s, power: Number(v) }) },
      { kind: 'slider', id: 'traffic', label: 'Visitors per day (both groups)', min: 500, max: 50000, step: 500, get: (s) => s.traffic, set: (s, v) => ({ ...s, traffic: v }) },
    ],
    compute: designResult,
    readout: (s, r) => [
      { label: 'Rates to tell apart', value: `${pct(r.p1, 2)} vs ${pct(r.p2, 2)}` },
      { label: 'Visitors per group', value: r.perGroup.toLocaleString('en-US') },
      { label: 'Days at this traffic', value: `${(2 * r.perGroup).toLocaleString('en-US')} / ${s.traffic.toLocaleString('en-US')} per day → ${r.days}` },
    ],
  };
}

// ---------- 12a. Analysing an A/B test ----------

export interface AbState {
  nA: number;
  convA: number;
  nB: number;
  convB: number;
  confidence: number;
}

export interface AbResult {
  rateA: number;
  rateB: number;
  diff: number;
  relLift: number;
  /** Unpooled standard error of the difference, for the interval. */
  seDiff: number;
  lo: number;
  hi: number;
  /** Pooled z statistic and its two-sided p-value, for the test. */
  z: number;
  pValue: number;
}

export function abResult(s: AbState): AbResult {
  const rateA = s.convA / s.nA;
  const rateB = s.convB / s.nB;
  const diff = rateB - rateA;
  const seDiff = Math.sqrt((rateA * (1 - rateA)) / s.nA + (rateB * (1 - rateB)) / s.nB);
  const zc = normalQuantile(1 - (1 - s.confidence) / 2);
  const pooled = (s.convA + s.convB) / (s.nA + s.nB);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / s.nA + 1 / s.nB));
  const z = sePooled ? diff / sePooled : 0;
  return { rateA, rateB, diff, relLift: rateA ? diff / rateA : 0, seDiff, lo: diff - zc * seDiff, hi: diff + zc * seDiff, z, pValue: 2 * (1 - normalCdf(Math.abs(z))) };
}

export function abExperiment(id: string, initial: AbState = { nA: 10000, convA: 500, nB: 10000, convB: 560, confidence: 0.95 }): ExperimentDef<AbState, AbResult> {
  return {
    id,
    initial,
    controls: [
      { kind: 'number', id: 'nA', label: 'A visitors', min: 10, max: 1000000, step: 1, get: (s) => s.nA, set: (s, v) => ({ ...s, nA: Math.max(10, Math.round(v)), convA: Math.min(s.convA, Math.max(10, Math.round(v))) }) },
      { kind: 'number', id: 'convA', label: 'A conversions', min: 0, max: 1000000, step: 1, get: (s) => s.convA, set: (s, v) => ({ ...s, convA: Math.min(s.nA, Math.max(0, Math.round(v))) }) },
      { kind: 'number', id: 'nB', label: 'B visitors', min: 10, max: 1000000, step: 1, get: (s) => s.nB, set: (s, v) => ({ ...s, nB: Math.max(10, Math.round(v)), convB: Math.min(s.convB, Math.max(10, Math.round(v))) }) },
      { kind: 'number', id: 'convB', label: 'B conversions', min: 0, max: 1000000, step: 1, get: (s) => s.convB, set: (s, v) => ({ ...s, convB: Math.min(s.nB, Math.max(0, Math.round(v))) }) },
      { kind: 'select', id: 'confidence', label: 'Confidence level', options: opts([['0.9', '90%'], ['0.95', '95%'], ['0.99', '99%']]), get: (s) => String(s.confidence), set: (s, v) => ({ ...s, confidence: Number(v) }) },
    ],
    compute: abResult,
    readout: (s, r) => [
      { label: 'Conversion A, B', value: `${pct(r.rateA, 2)}, ${pct(r.rateB, 2)}` },
      { label: 'Difference B − A', value: `${(100 * r.diff).toFixed(2)} points (${r.relLift >= 0 ? '+' : ''}${pct(r.relLift)} relative)` },
      { label: `${pct(s.confidence, 0)} interval for the difference`, value: `${(100 * r.lo).toFixed(2)} to ${(100 * r.hi).toFixed(2)} points` },
      { label: 'z, two-sided p-value', value: `${r.z.toFixed(2)}, ${fmtP(r.pValue)}`, status: r.pValue < 1 - s.confidence ? 'ok' : undefined },
    ],
  };
}

// ---------- 12b. The peeking trap ----------

export const PEEK_EXPERIMENTS = 200;
export const PEEK_RATE = 0.1;
export const PEEK_SHOWN = 8;

export interface PeekState {
  perDay: number;
  days: number;
  rule: 'end' | 'daily';
  seed: number;
}

export interface PeekResult {
  runs: PeekRun[];
  /** Experiments declared a "winner" under the chosen rule. All are false positives: both arms are identical. */
  falsePositives: number;
  rate: number;
  endOnly: number;
  daily: number;
}

export function peekResult(s: PeekState): PeekResult {
  const runs = simulateAATests(PEEK_EXPERIMENTS, s.days, s.perDay, PEEK_RATE, 0.05, s.seed);
  const endOnly = runs.filter((r) => r.pValues.at(-1)! < 0.05).length;
  const daily = runs.filter((r) => r.firstSignificant !== null).length;
  const falsePositives = s.rule === 'end' ? endOnly : daily;
  return { runs, falsePositives, rate: falsePositives / PEEK_EXPERIMENTS, endOnly, daily };
}

export function peekExperiment(id: string): ExperimentDef<PeekState, PeekResult> {
  return {
    id,
    initial: { perDay: 500, days: 20, rule: 'daily', seed: 2 },
    controls: [
      { kind: 'select', id: 'rule', label: 'Stopping rule', options: opts([['daily', 'check every day, stop at the first p < 0.05'], ['end', 'look once, on the planned last day']]), get: (s) => s.rule, set: (s, v) => ({ ...s, rule: v as PeekState['rule'] }) },
      { kind: 'slider', id: 'days', label: 'Planned days', min: 2, max: 30, step: 1, get: (s) => s.days, set: (s, v) => ({ ...s, days: v }) },
      { kind: 'slider', id: 'perDay', label: 'Visitors per group per day', min: 100, max: 2000, step: 100, get: (s) => s.perDay, set: (s, v) => ({ ...s, perDay: v }) },
      { kind: 'slider', id: 'seed', label: 'Random seed', min: 1, max: 20, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: peekResult,
    readout: (s, r) => [
      { label: 'A/A tests (no real difference)', value: String(PEEK_EXPERIMENTS) },
      { label: s.rule === 'daily' ? 'Declared a winner on some day' : 'Declared a winner on the last day', value: `${r.falsePositives} = ${pct(r.rate)}`, status: r.rate > 0.07 ? 'error' : 'ok' },
      { label: 'The promise of α', value: '5.0%' },
      { label: 'Same tests, other rule', value: s.rule === 'daily' ? `${pct(r.endOnly / PEEK_EXPERIMENTS)} if you look once` : `${pct(r.daily / PEEK_EXPERIMENTS)} if you peek daily` },
    ],
  };
}

// ---------- 13. Bayesian updating with a Beta prior ----------

export const PRIORS: Record<string, { label: string; a: number; b: number }> = {
  flat: { label: 'Flat: every rate from 0 to 1 equally plausible, Beta(1, 1)', a: 1, b: 1 },
  weak: { label: 'Weak: "around 5%", worth about 20 emails, Beta(1, 19)', a: 1, b: 19 },
  strong: { label: 'Strong: "around 5%", worth about 200 emails, Beta(10, 190)', a: 10, b: 190 },
};

export interface UpdateState {
  prior: string;
  trials: number;
  successes: number;
}

export interface UpdateResult {
  a: number;
  b: number;
  postA: number;
  postB: number;
  priorMean: number;
  dataRate: number;
  postMean: number;
  lo: number;
  hi: number;
  /** P(rate > 10%) under the posterior. */
  pAbove10: number;
}

export function updateResult(s: UpdateState): UpdateResult {
  const pr = PRIORS[s.prior] ?? PRIORS.flat!;
  const k = Math.min(s.successes, s.trials);
  const postA = pr.a + k;
  const postB = pr.b + s.trials - k;
  return {
    a: pr.a,
    b: pr.b,
    postA,
    postB,
    priorMean: pr.a / (pr.a + pr.b),
    dataRate: s.trials ? k / s.trials : 0,
    postMean: postA / (postA + postB),
    lo: betaQuantile(0.025, postA, postB),
    hi: betaQuantile(0.975, postA, postB),
    pAbove10: 1 - betaCdf(0.1, postA, postB),
  };
}

/** Density curves for plotting, on [0, xMax]. */
export function betaCurve(a: number, b: number, xMax = 1, steps = 200): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * xMax;
    const y = betaPdf(Math.min(1 - 1e-9, Math.max(1e-9, x)), a, b);
    pts.push([x, Number.isFinite(y) ? y : 0]);
  }
  return pts;
}

export function updateExperiment(id: string): ExperimentDef<UpdateState, UpdateResult> {
  return {
    id,
    initial: { prior: 'weak', trials: 50, successes: 6 },
    controls: [
      { kind: 'select', id: 'prior', label: 'Prior belief', options: Object.entries(PRIORS).map(([value, p]) => ({ value, label: p.label })), get: (s) => s.prior, set: (s, v) => ({ ...s, prior: v }) },
      { kind: 'slider', id: 'trials', label: 'Emails sent', min: 0, max: 1000, step: 10, get: (s) => s.trials, set: (s, v) => ({ ...s, trials: v, successes: Math.min(s.successes, v) }) },
      { kind: 'slider', id: 'successes', label: 'Clicks', min: 0, max: 200, step: 1, get: (s) => s.successes, set: (s, v) => ({ ...s, successes: Math.min(v, s.trials) }) },
    ],
    compute: updateResult,
    readout: (s, r) => [
      { label: 'Prior → posterior', value: `Beta(${r.a}, ${r.b}) → Beta(${r.a} + ${Math.min(s.successes, s.trials)}, ${r.b} + ${s.trials - Math.min(s.successes, s.trials)}) = Beta(${r.postA}, ${r.postB})` },
      { label: 'Prior mean', value: pct(r.priorMean) },
      { label: 'Clicks / emails', value: s.trials ? pct(r.dataRate) : 'no data yet' },
      { label: 'Posterior mean', value: pct(r.postMean, 2) },
      { label: '95% credible interval', value: `${pct(r.lo, 2)} to ${pct(r.hi, 2)}` },
      { label: 'P(rate > 10%)', value: fix(r.pAbove10, 3) },
    ],
  };
}

// ---------- 14. Bayesian A/B testing ----------

export const BAYES_DRAWS = 20000;

export interface BayesAbState {
  nA: number;
  convA: number;
  nB: number;
  convB: number;
  seed: number;
}

export interface BayesAbResult {
  aA: number;
  bA: number;
  aB: number;
  bB: number;
  /** P(rate B > rate A), integrated numerically. */
  probB: number;
  /** E[max(rate A − rate B, 0)]: the conversion we expect to give up by shipping B, from the draws. */
  lossB: number;
  lossA: number;
  /** Relative lift (B − A) / A for each draw, summarised. */
  liftLo: number;
  liftMid: number;
  liftHi: number;
  lifts: number[];
  pValue: number;
}

const quantile = (sorted: readonly number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))]!;

export function bayesAbResult(s: BayesAbState): BayesAbResult {
  const aA = 1 + s.convA;
  const bA = 1 + s.nA - s.convA;
  const aB = 1 + s.convB;
  const bB = 1 + s.nB - s.convB;
  const rand = seededRandom(s.seed);
  let lossA = 0;
  let lossB = 0;
  const lifts: number[] = [];
  for (let i = 0; i < BAYES_DRAWS; i++) {
    const pa = betaDraw(aA, bA, rand);
    const pb = betaDraw(aB, bB, rand);
    lossB += Math.max(pa - pb, 0);
    lossA += Math.max(pb - pa, 0);
    lifts.push((pb - pa) / pa);
  }
  const sorted = [...lifts].sort((x, y) => x - y);
  return {
    aA,
    bA,
    aB,
    bB,
    probB: probBetaGreater(aA, bA, aB, bB),
    lossB: lossB / BAYES_DRAWS,
    lossA: lossA / BAYES_DRAWS,
    liftLo: quantile(sorted, 0.025),
    liftMid: quantile(sorted, 0.5),
    liftHi: quantile(sorted, 0.975),
    lifts,
    pValue: abResult({ ...s, confidence: 0.95 }).pValue,
  };
}

export function bayesAbExperiment(id: string): ExperimentDef<BayesAbState, BayesAbResult> {
  return {
    id,
    initial: { nA: 2000, convA: 100, nB: 2000, convB: 120, seed: 1 },
    controls: [
      { kind: 'number', id: 'nA', label: 'A visitors', min: 10, max: 200000, step: 1, get: (s) => s.nA, set: (s, v) => ({ ...s, nA: Math.max(10, Math.round(v)), convA: Math.min(s.convA, Math.max(10, Math.round(v))) }) },
      { kind: 'number', id: 'convA', label: 'A conversions', min: 0, max: 200000, step: 1, get: (s) => s.convA, set: (s, v) => ({ ...s, convA: Math.min(s.nA, Math.max(0, Math.round(v))) }) },
      { kind: 'number', id: 'nB', label: 'B visitors', min: 10, max: 200000, step: 1, get: (s) => s.nB, set: (s, v) => ({ ...s, nB: Math.max(10, Math.round(v)), convB: Math.min(s.convB, Math.max(10, Math.round(v))) }) },
      { kind: 'number', id: 'convB', label: 'B conversions', min: 0, max: 200000, step: 1, get: (s) => s.convB, set: (s, v) => ({ ...s, convB: Math.min(s.nB, Math.max(0, Math.round(v))) }) },
      { kind: 'slider', id: 'seed', label: 'Random seed (for the draws)', min: 1, max: 20, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: bayesAbResult,
    readout: (_s, r) => [
      { label: 'Posteriors (flat prior)', value: `A ~ Beta(${r.aA}, ${r.bA}), B ~ Beta(${r.aB}, ${r.bB})` },
      { label: 'P(B beats A)', value: pct(r.probB) },
      { label: 'Expected loss if we ship B', value: `${(100 * r.lossB).toFixed(3)} points` },
      { label: 'Expected loss if we keep A', value: `${(100 * r.lossA).toFixed(3)} points` },
      { label: '95% credible interval, relative lift', value: `${pct(r.liftLo)} to ${pct(r.liftHi)}` },
      { label: 'Frequentist two-sided p (same data)', value: fmtP(r.pValue) },
    ],
  };
}

// ---------- 15. Capstone: an experiment report ----------

export interface ReportArm {
  visitors: number;
  orders: number;
  refunds: number;
}

export const REPORT_SCENARIOS: Record<string, { label: string; a: ReportArm; b: ReportArm }> = {
  win: { label: 'Week 1: the new checkout', a: { visitors: 20000, orders: 1000, refunds: 40 }, b: { visitors: 20100, orders: 1120, refunds: 46 } },
  srm: { label: 'Week 2: a redirect bug', a: { visitors: 20000, orders: 1000, refunds: 40 }, b: { visitors: 18700, orders: 1060, refunds: 41 } },
  guardrail: { label: 'Week 3: a pushier upsell', a: { visitors: 20000, orders: 1000, refunds: 40 }, b: { visitors: 19950, orders: 1110, refunds: 78 } },
  flat: { label: 'Week 4: a new button colour', a: { visitors: 20000, orders: 1000, refunds: 40 }, b: { visitors: 20050, orders: 1012, refunds: 41 } },
};

export const SRM_THRESHOLD = 0.001;
export const LOSS_THRESHOLD = 0.0005;

export interface ReportResult {
  srmChi2: number;
  srmP: number;
  srmOk: boolean;
  primary: AbResult;
  probB: number;
  lossB: number;
  /** Refunds per order. */
  guard: AbResult;
  guardOk: boolean;
  decision: 'ship' | 'stop' | 'keep' | 'investigate';
  reason: string;
}

/** χ² for a 50/50 split with 1 degree of freedom; p = P(χ²₁ ≥ x) = 2·(1 − Φ(√x)). */
export function srmTest(nA: number, nB: number): { chi2: number; p: number } {
  const expected = (nA + nB) / 2;
  const chi2 = ((nA - expected) ** 2 + (nB - expected) ** 2) / expected;
  return { chi2, p: 2 * (1 - normalCdf(Math.sqrt(chi2))) };
}

export function reportResult(s: { scenario: string }): ReportResult {
  const sc = REPORT_SCENARIOS[s.scenario] ?? REPORT_SCENARIOS.win!;
  const { chi2, p } = srmTest(sc.a.visitors, sc.b.visitors);
  const primary = abResult({ nA: sc.a.visitors, convA: sc.a.orders, nB: sc.b.visitors, convB: sc.b.orders, confidence: 0.95 });
  const bayes = bayesAbResult({ nA: sc.a.visitors, convA: sc.a.orders, nB: sc.b.visitors, convB: sc.b.orders, seed: 1 });
  const guard = abResult({ nA: sc.a.orders, convA: sc.a.refunds, nB: sc.b.orders, convB: sc.b.refunds, confidence: 0.95 });
  // A guardrail fails when it got significantly worse (one-sided at 5%, so z > 1.645).
  const guardOk = !(guard.diff > 0 && guard.z > normalQuantile(0.95));
  const srmOk = p >= SRM_THRESHOLD;
  let decision: ReportResult['decision'];
  let reason: string;
  if (!srmOk) {
    decision = 'investigate';
    reason = 'The split is not 50/50, so the groups are not comparable. Find the bug before reading any metric.';
  } else if (!guardOk) {
    decision = 'stop';
    reason = 'The primary metric may be up, but a guardrail got significantly worse. Do not ship as is.';
  } else if (primary.lo > 0 && bayes.lossB < LOSS_THRESHOLD) {
    decision = 'ship';
    reason = 'The interval for the lift is above zero, the guardrail held, and shipping B risks little.';
  } else {
    decision = 'keep';
    reason = 'The interval includes zero: the data cannot tell B from A. Keep A, or rerun with more traffic if the lift you hoped for is still plausible.';
  }
  return { srmChi2: chi2, srmP: p, srmOk, primary, probB: bayes.probB, lossB: bayes.lossB, guard, guardOk, decision, reason };
}

export function reportExperiment(id: string): ExperimentDef<{ scenario: string }, ReportResult> {
  return {
    id,
    initial: { scenario: 'win' },
    controls: [{ kind: 'select', id: 'scenario', label: 'Experiment', options: Object.entries(REPORT_SCENARIOS).map(([value, x]) => ({ value, label: x.label })), get: (s) => s.scenario, set: (_s, v) => ({ scenario: v }) }],
    compute: reportResult,
    readout: (_s, r) => [
      { label: 'Sample ratio check', value: `χ² = ${r.srmChi2.toFixed(2)}, p = ${fmtP(r.srmP)}`, status: r.srmOk ? 'ok' : 'error' },
      { label: 'Orders per visitor, B − A', value: `${(100 * r.primary.diff).toFixed(2)} points, 95% CI ${(100 * r.primary.lo).toFixed(2)} to ${(100 * r.primary.hi).toFixed(2)}` },
      { label: 'Refunds per order, B − A', value: `${(100 * r.guard.diff).toFixed(2)} points`, status: r.guardOk ? 'ok' : 'error' },
      { label: 'Decision', value: r.decision },
    ],
  };
}

