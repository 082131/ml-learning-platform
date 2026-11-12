/**
 * The data-centric ML lesson's experiment: a k-nearest-neighbour classifier trained on points whose labels were
 * partly flipped by "annotators", tested on clean labels. The learner compares two fixes for a weak model: more
 * data, or cleaner labels. Every number comes from running the classifier; dataCentric.test.ts checks every
 * setting against DATA_CENTRIC_SOURCE run with CPython.
 */
import { LCG } from '../practice/lcg';
import { pyFixed } from '../practice/pyFormat';
import type { ExperimentDef } from '../types';

export const SIZES = [100, 200, 400, 800, 1600] as const;
export const NOISES = [0, 0.1, 0.2, 0.3, 0.4] as const;
export const KS = [1, 15] as const;
export const TRAIN_SEED = 7;
export const TEST_SEED = 99;
export const N_TEST = 400;
/** Class 1 is the inside of a circle of this radius around (0.5, 0.5). */
const RADIUS_SQ = 0.09;

export interface DataCentricState {
  n: (typeof SIZES)[number];
  noise: (typeof NOISES)[number];
  k: (typeof KS)[number];
}

interface Point {
  x: number;
  y: number;
  label: number;
  /** Decides whether an annotator flips this label: flipped when u < noise. */
  u: number;
}

/** The same points the lesson's make_points(count, seed) returns. */
export function makePoints(count: number, seed: number): Point[] {
  const rng = new LCG(seed);
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng.random();
    const y = rng.random();
    const label = (x - 0.5) ** 2 + (y - 0.5) ** 2 < RADIUS_SQ ? 1 : 0;
    points.push({ x, y, label, u: rng.random() });
  }
  return points;
}

const MAX_N = Math.max(...SIZES);
let cache: { pool: Point[]; test: Point[]; order: Int32Array[] } | undefined;

/**
 * The training pool (the largest size; smaller sets are its first n points, as in the Python) and, for each test
 * point, every pool index sorted by distance. Sorting once makes every grid cell a cheap scan.
 */
function neighbours() {
  if (cache) return cache;
  const pool = makePoints(MAX_N, TRAIN_SEED);
  const test = makePoints(N_TEST, TEST_SEED);
  const order = test.map((t) => {
    const d = pool.map((p) => (p.x - t.x) ** 2 + (p.y - t.y) ** 2);
    return Int32Array.from(
      pool.map((_, i) => i).sort((a, b) => d[a]! - d[b]!),
    );
  });
  cache = { pool, test, order };
  return cache;
}

export interface CellResult {
  n: number;
  noise: number;
  flipped: number;
  correct: number;
  accuracy: number;
}

/** Trains on the first n pool points with flipped labels and scores the clean test set. */
export function runCell(n: number, noise: number, k: number): CellResult {
  const { pool, test, order } = neighbours();
  const label = (p: Point) => (p.u < noise ? 1 - p.label : p.label);
  let flipped = 0;
  for (let i = 0; i < n; i++) if (pool[i]!.u < noise) flipped++;
  let correct = 0;
  test.forEach((t, ti) => {
    let votes = 0;
    let found = 0;
    for (const idx of order[ti]!) {
      if (idx >= n) continue;
      votes += label(pool[idx]!);
      if (++found === k) break;
    }
    const predicted = 2 * votes > k ? 1 : 0;
    if (predicted === t.label) correct++;
  });
  return { n, noise, flipped, correct, accuracy: correct / N_TEST };
}

export interface DataCentricResult {
  current: CellResult;
  /** Accuracy for every size (columns) and noise level (rows) at the current k. */
  grid: CellResult[][];
  /** The same noise with twice the data, if that size is offered. */
  moreData?: CellResult;
  /** The same data with 10 points less noise, if the noise is above zero. */
  cleaner?: CellResult;
}

export function dataCentric({ n, noise, k }: DataCentricState): DataCentricResult {
  const grid = NOISES.map((p) => SIZES.map((size) => runCell(size, p, k)));
  const si = SIZES.indexOf(n);
  const ni = NOISES.indexOf(noise);
  return {
    current: grid[ni]![si]!,
    grid,
    moreData: si + 1 < SIZES.length ? grid[ni]![si + 1] : undefined,
    cleaner: ni > 0 ? grid[ni - 1]![si] : undefined,
  };
}

/** What DATA_CENTRIC_SOURCE prints. */
export function dataCentricPrintout(r: CellResult, k: number): string {
  return [
    `training examples: ${r.n}, labels flipped: ${r.flipped} (${pyFixed((r.flipped / r.n) * 100, 0)}%)`,
    `test accuracy with k=${k}: ${pyFixed(r.accuracy, 3)}`,
  ].join('\n');
}

export const DATA_CENTRIC_SOURCE = `class LCG:  # the same generator as the lesson's TypeScript, so both print identical numbers
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


def make_points(count, seed):
    rng = LCG(seed)
    points = []
    for _ in range(count):
        x, y = rng.random(), rng.random()
        label = int((x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.09)  # class 1 inside a circle of radius 0.3
        points.append((x, y, label, rng.random()))  # the last number decides if an annotator flips it
    return points


N_TRAIN = {{n}}  # training examples
NOISE = {{noise}}  # share of training labels the annotators got wrong
K = {{k}}  # neighbours that vote

train = [(x, y, 1 - lab if u < NOISE else lab) for x, y, lab, u in make_points(N_TRAIN, seed=7)]
flipped = sum(1 for _, _, _, u in make_points(N_TRAIN, seed=7) if u < NOISE)
test = [(x, y, lab) for x, y, lab, _ in make_points(400, seed=99)]  # clean labels


def predict(x, y):
    nearest = sorted(train, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)[:K]
    return int(2 * sum(p[2] for p in nearest) > K)  # majority vote


correct = sum(predict(x, y) == lab for x, y, lab in test)
print(f"training examples: {N_TRAIN}, labels flipped: {flipped} ({flipped / N_TRAIN:.0%})")
print(f"test accuracy with k={K}: {correct / len(test):.3f}")`;

export const dataCentricSlots = (s: DataCentricState) => ({
  n: String(s.n),
  noise: String(s.noise),
  k: String(s.k),
});

export function dataCentricExperiment(id: string): ExperimentDef<DataCentricState, DataCentricResult> {
  return {
    id,
    initial: { n: 200, noise: 0.3, k: 1 },
    controls: [
      {
        kind: 'select',
        id: 'n',
        label: 'Training examples',
        options: SIZES.map((v) => ({ value: String(v), label: String(v) })),
        get: (s) => String(s.n),
        set: (s, v) => ({ ...s, n: Number(v) as DataCentricState['n'] }),
      },
      {
        kind: 'select',
        id: 'noise',
        label: 'Wrong labels',
        options: NOISES.map((v) => ({ value: String(v), label: `${Math.round(v * 100)}%` })),
        get: (s) => String(s.noise),
        set: (s, v) => ({ ...s, noise: Number(v) as DataCentricState['noise'] }),
      },
      {
        kind: 'select',
        id: 'k',
        label: 'Model',
        options: KS.map((v) => ({ value: String(v), label: `${v}-nearest neighbour${v > 1 ? 's' : ''}` })),
        get: (s) => String(s.k),
        set: (s, v) => ({ ...s, k: Number(v) as DataCentricState['k'] }),
      },
    ],
    compute: dataCentric,
    readout: (s, r) => [
      { label: 'Python: what knn.py prints', value: dataCentricPrintout(r.current, s.k) },
      {
        label: 'Double the data',
        value: r.moreData
          ? `${pyFixed(r.current.accuracy, 3)} → ${pyFixed(r.moreData.accuracy, 3)} (${r.moreData.n} examples)`
          : 'already the largest size offered',
      },
      {
        label: 'Fix 10 points of label noise',
        value: r.cleaner
          ? `${pyFixed(r.current.accuracy, 3)} → ${pyFixed(r.cleaner.accuracy, 3)} (${Math.round(r.cleaner.noise * 100)}% wrong)`
          : 'labels are already clean',
      },
    ],
  };
}
