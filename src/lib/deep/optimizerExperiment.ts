import type { ExperimentDef, ReadoutItem } from '../types';
import { buildAdamTrace } from './adamTrace';
import { isolines, sampleGrid, type Segment } from './contour';
import {
  ADAM_EPS,
  fmt,
  fmtVec,
  OPTIMIZER_IDS,
  OPTIMIZER_LABEL,
  runOptimizer,
  surfaceOf,
  SURFACES,
  type Hyper,
  type OptimizerId,
  type OptRun,
  type Surface,
} from './optimizers';

export interface RaceState {
  surface: string;
  lr: number;
  beta: number;
  adamLr: number;
  beta1: number;
  beta2: number;
  steps: number;
  /** The 1-based update whose equations and Adam code are inspected. Clamped to `steps`. */
  inspect: number;
}

export type RaceResult = Record<OptimizerId, OptRun>;

/** Learning rates span four orders of magnitude, so the sliders move through these values. */
export const LR_CHOICES = [
  0.0001, 0.0002, 0.0005, 0.001, 0.0015, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1,
];
export const BETA2_CHOICES = [0.9, 0.99, 0.999];
export const MAX_RACE_STEPS = 500;

/** Index of the choice nearest to lr (on a log scale). */
export const lrIndex = (lr: number) =>
  LR_CHOICES.reduce(
    (best, c, i) => (Math.abs(Math.log(c / lr)) < Math.abs(Math.log(LR_CHOICES[best]! / lr)) ? i : best),
    0,
  );

export const hyperOf = (s: RaceState): Hyper => ({
  lr: s.lr,
  beta: s.beta,
  adamLr: s.adamLr,
  beta1: s.beta1,
  beta2: s.beta2,
  eps: ADAM_EPS,
});

export function runRace(s: RaceState): RaceResult {
  const surface = surfaceOf(s.surface);
  const h = hyperOf(s);
  return Object.fromEntries(
    OPTIMIZER_IDS.map((id) => [id, runOptimizer(surface, id, h, s.steps)]),
  ) as RaceResult;
}

/** The inspected step of a run, clamped to the steps it took (a diverged run stops early). */
export const inspectedStep = (run: OptRun, inspect: number) =>
  run.steps[Math.min(inspect, run.steps.length) - 1]!;

const lrSlider = (id: 'lr' | 'adamLr', label: string) =>
  ({
    kind: 'slider',
    id,
    label,
    min: 0,
    max: LR_CHOICES.length - 1,
    get: (s: RaceState) => lrIndex(s[id]),
    set: (s: RaceState, i: number) => ({ ...s, [id]: LR_CHOICES[Math.round(i)]! }),
    format: (i: number) => String(LR_CHOICES[Math.round(i)]),
  }) as const;

/** The optimizer race: three optimizers from one start point on one surface, sharing one state. */
export function optimizerRaceExperiment(
  id: string,
  traceExample: string,
): ExperimentDef<RaceState, RaceResult> {
  const d = SURFACES.bowl.defaults;
  return {
    id,
    initial: {
      surface: 'bowl',
      lr: d.lr,
      beta: 0.9,
      adamLr: d.adamLr,
      beta1: 0.9,
      beta2: 0.999,
      steps: d.steps,
      inspect: 1,
    },
    controls: [
      {
        kind: 'select',
        id: 'surface',
        label: 'Loss surface',
        options: Object.values(SURFACES).map((s) => ({ value: s.id, label: s.label })),
        get: (s) => s.surface,
        set: (s, v) => {
          const def = surfaceOf(v).defaults;
          return {
            ...s,
            surface: v,
            lr: def.lr,
            adamLr: def.adamLr,
            steps: def.steps,
            inspect: Math.min(s.inspect, def.steps),
          };
        },
      },
      lrSlider('lr', 'Learning rate η (SGD and momentum)'),
      {
        kind: 'slider',
        id: 'beta',
        label: 'Momentum β',
        min: 0,
        max: 0.99,
        step: 0.01,
        get: (s) => s.beta,
        set: (s, beta) => ({ ...s, beta }),
      },
      lrSlider('adamLr', 'Adam learning rate η'),
      {
        kind: 'slider',
        id: 'beta1',
        label: 'Adam β₁',
        min: 0,
        max: 0.99,
        step: 0.01,
        get: (s) => s.beta1,
        set: (s, beta1) => ({ ...s, beta1 }),
      },
      {
        kind: 'select',
        id: 'beta2',
        label: 'Adam β₂',
        options: BETA2_CHOICES.map((b) => ({ value: String(b), label: String(b) })),
        get: (s) => String(s.beta2),
        set: (s, v) => ({ ...s, beta2: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'steps',
        label: 'Steps',
        min: 1,
        max: MAX_RACE_STEPS,
        get: (s) => s.steps,
        set: (s, steps) => ({ ...s, steps, inspect: Math.min(s.inspect, steps) }),
      },
      {
        kind: 'slider',
        id: 'inspect',
        label: 'Inspect step t',
        min: 1,
        max: MAX_RACE_STEPS,
        get: (s) => s.inspect,
        set: (s, inspect) => ({ ...s, inspect: Math.min(inspect, s.steps) }),
      },
    ],
    compute: runRace,
    trace: (s) => buildAdamTrace(surfaceOf(s.surface), hyperOf(s), runRace(s).adam, s.inspect),
    traceExample,
    readout: (s, r) => {
      const surface = surfaceOf(s.surface);
      return OPTIMIZER_IDS.map((id): ReadoutItem => {
        const run = r[id];
        if (run.status === 'diverged')
          return {
            label: OPTIMIZER_LABEL[id],
            value: `left the safe range (|value| > 1e6) at step ${run.divergedAt}`,
            status: 'diverged',
          };
        const end = run.path.at(-1)!;
        return {
          label: `${OPTIMIZER_LABEL[id]} after ${run.steps.length} steps`,
          value: `θ = ${fmtVec(end)}, f = ${fmt(surface.f(...end))}`,
        };
      });
    },
  };
}

const CONTOUR_GRID = { x: 61, y: 49 };
const contourCache = new Map<string, { level: number; segments: Segment[] }[]>();

/** The surface's contour lines at its levels, computed once per surface. */
export function surfaceContours(surface: Surface) {
  let found = contourCache.get(surface.id);
  if (!found) {
    const grid = sampleGrid(surface.f, surface.x, surface.y, CONTOUR_GRID.x, CONTOUR_GRID.y);
    found = surface.levels.map((level) => ({ level, segments: isolines(grid, level) }));
    contourCache.set(surface.id, found);
  }
  return found;
}
