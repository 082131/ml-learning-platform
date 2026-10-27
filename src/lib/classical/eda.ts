/**
 * Exploratory data analysis on the penguins: correlations overall and per species (Simpson's paradox),
 * least-squares lines for the scatter, and a hand computation of Pearson's r. eda.test.ts checks the
 * printed values against pandas 3.0.2 and CPython 3.13 output.
 */
import { pyRepr } from '../linalg/pyFormat';
import type { ExperimentDef, ReadoutItem, Trace, TraceStep } from '../types';
import { array, scalar, text } from '../trace/values';
import {
  complete,
  NUMERIC_COLUMNS,
  PENGUINS,
  SPECIES,
  type NumericColumn,
  type Penguin,
  type Species,
} from './penguins';
import { mean, pearson } from './stats';

/** The Python examples' subset: every 12th row of penguins.csv (rows 0, 12, …, 336), 29 penguins, none missing. */
export const EDA_STEP = 12;
export const edaSubset = (): Penguin[] => PENGUINS.filter((p) => p.row % EDA_STEP === 0);
/** The subset's Chinstrap penguins (rows 276, 288, …, 336): the hand computation of r uses them. */
export const HAND_SPECIES: Species = 'Chinstrap';
export const handRows = (): Penguin[] => edaSubset().filter((p) => p.species === HAND_SPECIES);

export interface EdaState {
  x: NumericColumn;
  y: NumericColumn;
}

export interface Fit {
  slope: number;
  intercept: number;
  /** x range the line is drawn over. */
  from: number;
  to: number;
}

export interface GroupStats {
  group: 'all' | Species;
  n: number;
  r: number;
  fit: Fit;
}

export interface EdaResult {
  points: { x: number; y: number; species: Species; row: number }[];
  groups: GroupStats[];
}

/** Least-squares line y = a + b·x: b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)². */
export function leastSquares(xs: readonly number[], ys: readonly number[]): Fit {
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i]! - my);
    sxx += (x - mx) ** 2;
  });
  const slope = sxx === 0 ? 0 : sxy / sxx;
  return { slope, intercept: my - slope * mx, from: Math.min(...xs), to: Math.max(...xs) };
}

function groupStats(group: GroupStats['group'], pts: EdaResult['points']): GroupStats {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { group, n: pts.length, r: pearson(xs, ys), fit: leastSquares(xs, ys) };
}

export function computeEda(s: EdaState): EdaResult {
  const rows = complete(PENGUINS, [s.x, s.y]);
  const points = rows.map((p) => ({ x: p[s.x]!, y: p[s.y]!, species: p.species, row: p.row }));
  return {
    points,
    groups: [
      groupStats('all', points),
      ...SPECIES.map((sp) =>
        groupStats(
          sp,
          points.filter((p) => p.species === sp),
        ),
      ),
    ],
  };
}

/** Python's round(r, 3) as print shows it. */
export const round3 = (r: number) => pyRepr(Number(r.toFixed(3)));

/** What the lesson's pandas correlation code prints. */
export function edaPrintout(r: EdaResult): string {
  return r.groups.map((g) => `${g.group} ${g.n} ${round3(g.r)}`).join('\n');
}

/** CPython 3.12+ sum() of floats: Neumaier compensated summation. */
export function pySum(xs: readonly number[]): number {
  let f = 0;
  let c = 0;
  for (const x of xs) {
    const t = f + x;
    c += Math.abs(f) >= Math.abs(x) ? f - t + x : x - t + f;
    f = t;
  }
  return c !== 0 && Number.isFinite(c) ? f + c : f;
}

export const PEARSON_LOOP_SOURCE = `import math

xs = {{xs}}
ys = {{ys}}
mx = sum(xs) / len(xs)
my = sum(ys) / len(ys)
sxy = sxx = syy = 0.0
for x, y in zip(xs, ys):
    sxy += (x - mx) * (y - my)
    sxx += (x - mx) * (x - mx)
    syy += (y - my) * (y - my)
r = sxy / math.sqrt(sxx * syy)
print(round(r, 3))`;

/** Flipper length and body mass are whole numbers in the CSV; the bill columns are decimals. */
const INT_COLUMNS: readonly NumericColumn[] = ['flipper_length_mm', 'body_mass_g'];

/** A column of the hand computation as a Python list literal: ints for whole-number columns, floats otherwise. */
const pyColumn = (c: NumericColumn, xs: readonly number[]) =>
  `[${xs.map((x) => (INT_COLUMNS.includes(c) ? String(x) : pyRepr(x))).join(', ')}]`;

/** The x and y lists of the hand computation, as Python literals. */
export function pearsonSlots(s: EdaState): { xs: string; ys: string } {
  const rows = handRows();
  return {
    xs: pyColumn(
      s.x,
      rows.map((p) => p[s.x]!),
    ),
    ys: pyColumn(
      s.y,
      rows.map((p) => p[s.y]!),
    ),
  };
}

const f4 = (v: number) => String(Number(v.toFixed(4)));

/** Pearson's r computed exactly as PEARSON_LOOP_SOURCE does, with its trace. */
export function buildPearsonTrace(xs: readonly number[], ys: readonly number[]): { trace: Trace; r: number } {
  const n = xs.length;
  const vars: TraceStep['vars'] = {};
  const steps: TraceStep[] = [];
  const push = (line: number, note: string, highlight?: TraceStep['highlight']) =>
    steps.push({ range: { line }, vars: { ...vars }, note, ...(highlight ? { highlight } : {}) });
  push(1, 'Load the math module for math.sqrt.');
  vars.xs = array([...xs]);
  push(3, `xs: the x column for the ${n} ${HAND_SPECIES} penguins of the subset.`);
  vars.ys = array([...ys]);
  push(4, `ys: their y values, in the same order.`);
  const mx = pySum(xs) / n;
  vars.mx = scalar(mx);
  push(5, `mx = ${f4(pySum(xs))} / ${n} = ${f4(mx)} (shown to 4 decimals).`);
  const my = pySum(ys) / n;
  vars.my = scalar(my);
  push(6, `my = ${f4(pySum(ys))} / ${n} = ${f4(my)}.`);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  vars.sxy = scalar(0);
  vars.sxx = scalar(0);
  vars.syy = scalar(0);
  push(7, 'Three running sums start at 0.');
  xs.forEach((x, i) => {
    const y = ys[i]!;
    const dx = x - mx;
    const dy = y - my;
    vars.x = scalar(x);
    vars.y = scalar(y);
    push(8, `Penguin ${i}: x = ${pyRepr(x)}, y = ${pyRepr(y)}.`, { xs: [[i]], ys: [[i]] });
    sxy += dx * dy;
    vars.sxy = scalar(sxy);
    push(
      9,
      `(x − mx)(y − my) = ${f4(dx)} · ${f4(dy)} = ${f4(dx * dy)}: ${dx * dy >= 0 ? 'both on the same side of their means, so it adds' : 'on opposite sides, so it subtracts'}. sxy = ${f4(sxy)}.`,
      { xs: [[i]], ys: [[i]] },
    );
    sxx += dx * dx;
    vars.sxx = scalar(sxx);
    push(10, `sxx += ${f4(dx)}² = ${f4(dx * dx)}, so sxx = ${f4(sxx)}.`, { xs: [[i]] });
    syy += dy * dy;
    vars.syy = scalar(syy);
    push(11, `syy += ${f4(dy)}² = ${f4(dy * dy)}, so syy = ${f4(syy)}.`, { ys: [[i]] });
  });
  const r = sxy / Math.sqrt(sxx * syy);
  vars.r = scalar(r);
  push(12, `r = sxy / √(sxx · syy) = ${f4(sxy)} / √(${f4(sxx)} · ${f4(syy)}) = ${f4(r)}.`);
  vars.output = text(round3(r));
  push(
    13,
    `print(round(r, 3)) shows ${round3(r)}: ${r > 0 ? 'within this species, larger x goes with larger y' : r < 0 ? 'within this species, larger x goes with smaller y' : 'no linear trend'}. x and y keep their last values after the loop.`,
  );
  return { trace: { source: 'computed', steps }, r };
}

export function handTrace(s: EdaState) {
  const rows = handRows();
  return buildPearsonTrace(
    rows.map((p) => p[s.x]!),
    rows.map((p) => p[s.y]!),
  );
}

export const COLUMN_LABEL: Record<NumericColumn, string> = {
  bill_length_mm: 'Bill length (mm)',
  bill_depth_mm: 'Bill depth (mm)',
  flipper_length_mm: 'Flipper length (mm)',
  body_mass_g: 'Body mass (g)',
};

const sign = (r: number) => (r > 0 ? 'positive' : r < 0 ? 'negative' : 'zero');

export function edaReadout(s: EdaState, r: EdaResult): ReadoutItem[] {
  const all = r.groups[0]!;
  const within = r.groups.slice(1);
  const flips = within.every((g) => Math.sign(g.r) === -Math.sign(all.r) && all.r !== 0);
  return [
    { label: 'pandas prints', value: edaPrintout(r) },
    {
      label: 'Overall vs within species',
      value: flips
        ? `Overall r is ${sign(all.r)}, but it is ${sign(-all.r)} within every species: Simpson's paradox.`
        : `Overall r is ${sign(all.r)}; within species: ${within.map((g) => `${g.group} ${sign(g.r)}`).join(', ')}.`,
    },
    {
      label: `Hand computation (${HAND_SPECIES}, 6 penguins of the subset)`,
      value: `r = ${round3(handTrace(s).r)}`,
    },
  ];
}

export function edaExperiment(id: string, traceExample?: string): ExperimentDef<EdaState, EdaResult> {
  const select = (key: 'x' | 'y', label: string) =>
    ({
      kind: 'select',
      id: key,
      label,
      options: NUMERIC_COLUMNS.map((c) => ({ value: c, label: COLUMN_LABEL[c] })),
      get: (s: EdaState) => s[key],
      set: (s: EdaState, v: string) => ({ ...s, [key]: v as NumericColumn }),
    }) as const;
  return {
    id,
    initial: { x: 'bill_length_mm', y: 'bill_depth_mm' },
    controls: [select('x', 'x axis'), select('y', 'y axis')],
    compute: computeEda,
    trace: (s) => handTrace(s).trace,
    traceExample,
    readout: edaReadout,
  };
}
