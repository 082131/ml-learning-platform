import type { ExperimentDef } from '../types';
import {
  leakageCurve,
  leakageRun,
  noiseDataset,
  NOISE_DATA_SEED,
  NOISE_ROWS,
  selectionRows,
  type CurvePoint,
  type LeakScore,
  type NoiseData,
} from './leakage';
import { assignSplits, splitCounts, type SplitCounts, type SplitName } from './splits';

/** State shared by the split bar, the leakage scores, the slotted split code and the readout. */
export interface SplitState {
  validationPct: number;
  testPct: number;
  seed: number;
  /** Number of features the selection step keeps. */
  k: number;
  /** Whether feature selection sees every row (the leak) or the training rows only. */
  leak: 'off' | 'on';
}

export interface SplitResult {
  counts: SplitCounts;
  assignment: SplitName[];
  /** Rows the feature selection looks at in the current mode. */
  selection: number[];
  honest: LeakScore;
  leaked: LeakScore;
  /** Mean test accuracy over split seeds CURVE_SEEDS, for k = 1..K_MAX. */
  curve: CurvePoint[];
}

export const K_MAX = 30;
export const SEED_MAX = 99;
/** The averaged curve uses split seeds 1 to 50. */
export const CURVE_SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

const data: { value?: NoiseData } = {};
/** Built on first use (60 × 300 normal draws), then reused. */
export const noiseData = () => (data.value ??= noiseDataset(NOISE_DATA_SEED));

// The curve depends only on the split sizes, so it is cached per (validation, test) count pair.
const curves = new Map<string, CurvePoint[]>();
function curveFor(counts: SplitCounts) {
  const key = `${counts.validation}/${counts.test}`;
  let c = curves.get(key);
  if (!c) curves.set(key, (c = leakageCurve(noiseData(), counts, CURVE_SEEDS, K_MAX)));
  return c;
}

export function computeSplits(s: SplitState): SplitResult {
  const counts = splitCounts(NOISE_ROWS, s.validationPct, s.testPct);
  const assignment = assignSplits(counts, s.seed);
  const run = leakageRun(noiseData(), assignment, s.k);
  return {
    counts,
    assignment,
    selection: selectionRows(assignment, s.leak === 'on'),
    honest: run.honest,
    leaked: run.leaked,
    curve: curveFor(counts),
  };
}

/** "9 / 18 = 50.0%" */
export const formatScore = (sc: Pick<LeakScore, 'correct' | 'total'>) =>
  `${sc.correct} / ${sc.total} = ${((100 * sc.correct) / sc.total).toFixed(1)}%`;
/** "+38.9 percentage points": a difference in correct test rows, as a share of the test rows. */
export const signedPoints = (diff: number, total: number) => {
  const v = ((100 * diff) / total).toFixed(1);
  return `${diff > 0 ? '+' : ''}${v} percentage points`;
};
export const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

export function splitsExperiment(id: string): ExperimentDef<SplitState, SplitResult> {
  return {
    id,
    initial: { validationPct: 15, testPct: 30, seed: 1, k: 10, leak: 'off' },
    controls: [
      {
        kind: 'slider',
        id: 'validationPct',
        label: 'Validation share (%)',
        min: 5,
        max: 30,
        step: 5,
        get: (s) => s.validationPct,
        set: (s, validationPct) => ({ ...s, validationPct }),
      },
      {
        kind: 'slider',
        id: 'testPct',
        label: 'Test share (%)',
        min: 10,
        max: 40,
        step: 5,
        get: (s) => s.testPct,
        set: (s, testPct) => ({ ...s, testPct }),
      },
      {
        kind: 'slider',
        id: 'seed',
        label: 'Shuffle seed',
        min: 0,
        max: SEED_MAX,
        get: (s) => s.seed,
        set: (s, seed) => ({ ...s, seed }),
      },
      {
        kind: 'slider',
        id: 'k',
        label: 'Features kept (k)',
        min: 1,
        max: K_MAX,
        get: (s) => s.k,
        set: (s, k) => ({ ...s, k }),
      },
      {
        kind: 'select',
        id: 'leak',
        label: 'Feature selection sees',
        options: [
          { value: 'off', label: 'Training rows only' },
          { value: 'on', label: 'All rows (leak)' },
        ],
        get: (s) => s.leak,
        set: (s, leak) => ({ ...s, leak: leak === 'on' ? 'on' : 'off' }),
      },
    ],
    compute: computeSplits,
    readout: (s, r) => {
      const mean = r.curve[s.k - 1]!;
      const chosen = s.leak === 'on' ? r.leaked : r.honest;
      return [
        {
          label: 'print(len(train), len(val), len(test))',
          value: `${r.counts.train} ${r.counts.validation} ${r.counts.test}`,
        },
        {
          label: `Test accuracy, current mode (${s.leak === 'on' ? 'leak' : 'no leak'})`,
          value: formatScore(chosen),
        },
        { label: 'Test accuracy without the leak', value: formatScore(r.honest) },
        { label: 'Test accuracy with the leak', value: formatScore(r.leaked) },
        {
          label: `Change caused by the leak (seed ${s.seed})`,
          value: signedPoints(r.leaked.correct - r.honest.correct, r.counts.test),
        },
        {
          label: `Mean over split seeds 1–50, k = ${s.k}`,
          value: `no leak ${pct(mean.honest)}, leak ${pct(mean.leaked)}`,
        },
      ];
    },
  };
}
