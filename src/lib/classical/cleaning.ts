/**
 * Data cleaning on a small, named subset of the penguins: missing-value strategies, an injectable
 * data-entry typo, and the 1.5·IQR outlier rule. Everything mirrors the pandas code in the
 * ml/classical/data-cleaning lesson; cleaning.test.ts checks every state against pandas 3.0.2 output.
 */
import { pyRepr } from '../linalg/pyFormat';
import type { ExperimentDef, ReadoutItem, Trace, TraceStep } from '../types';
import { array, scalar, text } from '../trace/values';
import { NUMERIC_COLUMNS, PENGUINS, type NumericColumn, type Penguin } from './penguins';
import { mean, median, quantile, std } from './stats';

/** File rows used in the lesson: two all-NA rows (3, 271), three rows with only `sex` missing (8, 9, 268). */
export const CLEANING_ROWS = [0, 1, 2, 3, 4, 8, 9, 152, 267, 268, 271, 273, 300, 301] as const;

export const cleaningSubset = (): Penguin[] => CLEANING_ROWS.map((r) => PENGUINS[r]!);

/** The injected data-entry typo: row 0's body mass typed as 37500 g instead of 3750 g. Not in the real data. */
export const TYPO = { row: 0, value: 37500, real: 3750 } as const;
/** Tukey's fence multiplier. */
export const IQR_K = 1.5;

export type NumericStrategy = 'drop' | 'median' | 'mean';
export type SexStrategy = 'drop' | 'unknown';

export interface CleaningState {
  numeric: NumericStrategy;
  sex: SexStrategy;
  typo: boolean;
}

/** A cleaned row: values after filling, which cells were filled, and whether (and why) it was dropped. */
export interface CleanedRow {
  row: number;
  species: Penguin['species'];
  island: Penguin['island'];
  values: Record<NumericColumn, number | null>;
  sex: string | null;
  filled: NumericColumn[];
  sexFilled: boolean;
  dropped: null | 'numeric' | 'sex';
  typo: boolean;
}

export interface CleaningResult {
  rows: CleanedRow[];
  /** The fill value per numeric column (null when the strategy drops rows). */
  fills: Record<NumericColumn, number> | null;
  kept: CleanedRow[];
  /** body_mass_g of the kept rows, in row order (clean["body_mass_g"].tolist()). */
  masses: number[];
  stats: MassStats;
}

export interface MassStats {
  n: number;
  mean: number;
  median: number;
  /** pandas' default: sample standard deviation, ddof = 1. */
  std: number;
  q1: number;
  q3: number;
  iqr: number;
  low: number;
  high: number;
  /** Row numbers outside the fences. */
  outliers: number[];
}

/** Row values after the optional typo, before any cleaning. */
function withTypo(p: Penguin, typo: boolean): Record<NumericColumn, number | null> {
  const values = Object.fromEntries(NUMERIC_COLUMNS.map((c) => [c, p[c]])) as Record<
    NumericColumn,
    number | null
  >;
  if (typo && p.row === TYPO.row) values.body_mass_g = TYPO.value;
  return values;
}

/** 1.5·IQR fences with quantiles as pandas computes them (linear interpolation). */
export function iqrStats(values: readonly number[], rows: readonly number[]): MassStats {
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const low = q1 - IQR_K * iqr;
  const high = q3 + IQR_K * iqr;
  return {
    n: values.length,
    mean: mean(values),
    median: median(values),
    std: std(values, 1),
    q1,
    q3,
    iqr,
    low,
    high,
    outliers: rows.filter((_, i) => values[i]! < low || values[i]! > high),
  };
}

/** Applies the numeric strategy (to all four measurement columns), then the sex strategy, as the pandas code does. */
export function cleanSubset(subset: readonly Penguin[], s: CleaningState): CleaningResult {
  const raw = subset.map((p) => ({ p, values: withTypo(p, s.typo) }));
  const fills =
    s.numeric === 'drop'
      ? null
      : (Object.fromEntries(
          NUMERIC_COLUMNS.map((c) => {
            const present = raw.flatMap((r) => (r.values[c] === null ? [] : [r.values[c]]));
            return [c, s.numeric === 'median' ? median(present) : mean(present)];
          }),
        ) as Record<NumericColumn, number>);
  const rows: CleanedRow[] = raw.map(({ p, values }) => {
    const missing = NUMERIC_COLUMNS.filter((c) => values[c] === null);
    const filledValues = { ...values };
    if (fills) for (const c of missing) filledValues[c] = fills[c];
    const numericDrop = !fills && missing.length > 0;
    const sexDrop = !numericDrop && p.sex === null && s.sex === 'drop';
    return {
      row: p.row,
      species: p.species,
      island: p.island,
      values: filledValues,
      sex: p.sex ?? (s.sex === 'unknown' ? 'unknown' : null),
      filled: fills ? missing : [],
      sexFilled: p.sex === null && s.sex === 'unknown',
      dropped: numericDrop ? 'numeric' : sexDrop ? 'sex' : null,
      typo: s.typo && p.row === TYPO.row,
    };
  });
  const kept = rows.filter((r) => r.dropped === null);
  const masses = kept.map((r) => r.values.body_mass_g!);
  return {
    rows,
    fills,
    kept,
    masses,
    stats: iqrStats(
      masses,
      kept.map((r) => r.row),
    ),
  };
}

const NUMERIC_CODE: Record<NumericStrategy, string> = {
  drop: 'df.dropna(subset=num_cols)',
  median: 'df.fillna(df[num_cols].median())',
  mean: 'df.fillna(df[num_cols].mean())',
};
const SEX_CODE: Record<SexStrategy, string> = {
  drop: 'clean.dropna(subset=["sex"])',
  unknown: 'clean.fillna({"sex": "unknown"})',
};
const TYPO_CODE = {
  on: `df.loc[${TYPO.row}, "body_mass_g"] = ${pyRepr(TYPO.value)}  # injected typo, not in the real data`,
  off: `# no typo: df.loc[${TYPO.row}, "body_mass_g"] stays ${pyRepr(TYPO.real)}`,
};

/** Slot values for the pandas cleaning code. */
export function cleaningSlots(s: CleaningState): Record<'typo' | 'numeric' | 'sex', string> {
  return {
    typo: s.typo ? TYPO_CODE.on : TYPO_CODE.off,
    numeric: NUMERIC_CODE[s.numeric],
    sex: SEX_CODE[s.sex],
  };
}

const pyIntList = (xs: readonly number[]) => `[${xs.join(', ')}]`;

/** Exactly what the pandas cleaning code prints for this state (four lines). */
export function cleaningPrintout(subsetSize: number, r: CleaningResult): string {
  const st = r.stats;
  return [
    `rows: ${subsetSize} -> ${r.kept.length}`,
    `mean: ${pyRepr(st.mean)} median: ${pyRepr(st.median)} std: ${pyRepr(Number(st.std.toFixed(1)))}`,
    `fences: ${pyRepr(st.low)} ${pyRepr(st.high)}`,
    `outliers: ${pyIntList(st.outliers)}`,
  ].join('\n');
}

export const NUMERIC_LABEL: Record<NumericStrategy, string> = {
  drop: 'Drop rows with a missing measurement',
  median: 'Fill with the column median',
  mean: 'Fill with the column mean',
};
export const SEX_LABEL: Record<SexStrategy, string> = {
  drop: 'Drop rows with missing sex',
  unknown: 'Fill with the category "unknown"',
};

/** The pure-Python IQR loop the step-through walks; `{{masses}}` is the cleaned body-mass list. */
export const IQR_LOOP_SOURCE = `masses = {{masses}}
s = sorted(masses)
pos1 = (len(s) - 1) * 0.25
pos3 = (len(s) - 1) * 0.75
q1 = s[int(pos1)] + (s[int(pos1) + 1] - s[int(pos1)]) * (pos1 - int(pos1))
q3 = s[int(pos3)] + (s[int(pos3) + 1] - s[int(pos3)]) * (pos3 - int(pos3))
iqr = q3 - q1
low = q1 - 1.5 * iqr
high = q3 + 1.5 * iqr
for m in masses:
    if m < low or m > high:
        print("outlier:", m)
print("fences:", low, high)`;

export const pyFloatList = (xs: readonly number[]) => `[${xs.map(pyRepr).join(', ')}]`;

/** Linear-interpolation quantile written as the pure-Python lines above compute it. */
function loopQuantile(sorted: readonly number[], p: number) {
  const pos = (sorted.length - 1) * p;
  const i = Math.trunc(pos);
  const frac = pos - i;
  const a = sorted[i]!;
  const b = sorted[i + 1]!;
  return { pos, i, frac, a, b, q: a + (b - a) * frac };
}

/** The printout of IQR_LOOP_SOURCE for these masses. */
export function iqrLoopPrintout(masses: readonly number[]): string {
  if (masses.length < 2) throw new Error('The IQR loop needs at least two values');
  const s = [...masses].sort((x, y) => x - y);
  const q1 = loopQuantile(s, 0.25).q;
  const q3 = loopQuantile(s, 0.75).q;
  const iqr = q3 - q1;
  const low = q1 - IQR_K * iqr;
  const high = q3 + IQR_K * iqr;
  const lines = masses.filter((m) => m < low || m > high).map((m) => `outlier: ${pyRepr(m)}`);
  return [...lines, `fences: ${pyRepr(low)} ${pyRepr(high)}`].join('\n');
}

/** A computed trace of IQR_LOOP_SOURCE: one step per executed line. */
export function buildIqrTrace(masses: readonly number[]): Trace {
  const s = [...masses].sort((x, y) => x - y);
  const n = s.length;
  const p1 = loopQuantile(s, 0.25);
  const p3 = loopQuantile(s, 0.75);
  const iqr = p3.q - p1.q;
  const low = p1.q - IQR_K * iqr;
  const high = p3.q + IQR_K * iqr;
  const r = pyRepr;
  const vars: TraceStep['vars'] = { masses: array([...masses]) };
  const steps: TraceStep[] = [];
  const push = (line: number, note: string, highlight?: TraceStep['highlight']) =>
    steps.push({ range: { line }, vars: { ...vars }, note, ...(highlight ? { highlight } : {}) });

  push(1, `masses holds the ${n} body masses (g) left after cleaning, in row order.`);
  vars.s = array(s);
  push(2, `s is a sorted copy: smallest ${r(s[0]!)}, largest ${r(s[n - 1]!)}. masses keeps its order.`);
  vars.pos1 = scalar(p1.pos);
  push(3, `The first quartile sits at position (${n} − 1) · 0.25 = ${r(p1.pos)} in the sorted list.`);
  vars.pos3 = scalar(p3.pos);
  push(4, `The third quartile sits at position (${n} − 1) · 0.75 = ${r(p3.pos)}.`);
  vars.q1 = scalar(p1.q);
  push(
    5,
    `q1 = s[${p1.i}] + (s[${p1.i + 1}] − s[${p1.i}]) · ${r(p1.frac)} = ${r(p1.a)} + (${r(p1.b)} − ${r(p1.a)}) · ${r(p1.frac)} = ${r(p1.q)}.`,
    { s: [[p1.i], [p1.i + 1]] },
  );
  vars.q3 = scalar(p3.q);
  push(
    6,
    `q3 = s[${p3.i}] + (s[${p3.i + 1}] − s[${p3.i}]) · ${r(p3.frac)} = ${r(p3.a)} + (${r(p3.b)} − ${r(p3.a)}) · ${r(p3.frac)} = ${r(p3.q)}.`,
    { s: [[p3.i], [p3.i + 1]] },
  );
  vars.iqr = scalar(iqr);
  push(7, `iqr = q3 − q1 = ${r(p3.q)} − ${r(p1.q)} = ${r(iqr)}: the width of the middle half of the data.`);
  vars.low = scalar(low);
  push(8, `low = q1 − 1.5 · iqr = ${r(p1.q)} − ${r(IQR_K * iqr)} = ${r(low)}.`);
  vars.high = scalar(high);
  push(9, `high = q3 + 1.5 · iqr = ${r(p3.q)} + ${r(IQR_K * iqr)} = ${r(high)}.`);
  const printed: string[] = [];
  masses.forEach((m, i) => {
    vars.m = scalar(m);
    push(10, `m = masses[${i}] = ${r(m)}.`, { masses: [[i]] });
    const out = m < low || m > high;
    push(
      11,
      out
        ? `${r(m)} is ${m < low ? `below low (${r(low)})` : `above high (${r(high)})`}: flag it.`
        : `${r(low)} ≤ ${r(m)} ≤ ${r(high)}: inside the fences.`,
      { masses: [[i]] },
    );
    if (out) {
      printed.push(`outlier: ${r(m)}`);
      vars.output = text(printed.join('\n'));
      push(12, `Print the flagged value ${r(m)}.`, { masses: [[i]] });
    }
  });
  printed.push(`fences: ${r(low)} ${r(high)}`);
  vars.output = text(printed.join('\n'));
  push(
    13,
    `Done. ${printed.length - 1} value(s) flagged. m keeps its last value, ${r(masses[masses.length - 1]!)}, after the loop.`,
  );
  return { source: 'computed', steps };
}

export interface CleaningExperimentResult extends CleaningResult {
  subsetSize: number;
}

/** The lesson's experiment: missing-value strategies and the typo toggle on the 14-row subset. */
export function cleaningExperiment(
  id: string,
  traceExample?: string,
): ExperimentDef<CleaningState, CleaningExperimentResult> {
  const subset = cleaningSubset();
  return {
    id,
    initial: { numeric: 'drop', sex: 'drop', typo: false },
    controls: [
      {
        kind: 'select',
        id: 'numeric',
        label: 'Missing measurements',
        options: (Object.keys(NUMERIC_LABEL) as NumericStrategy[]).map((v) => ({
          value: v,
          label: NUMERIC_LABEL[v],
        })),
        get: (s) => s.numeric,
        set: (s, v) => ({ ...s, numeric: v as NumericStrategy }),
      },
      {
        kind: 'select',
        id: 'sex',
        label: 'Missing sex (categorical)',
        options: (Object.keys(SEX_LABEL) as SexStrategy[]).map((v) => ({ value: v, label: SEX_LABEL[v] })),
        get: (s) => s.sex,
        set: (s, v) => ({ ...s, sex: v as SexStrategy }),
      },
      {
        kind: 'select',
        id: 'typo',
        label: 'Data-entry typo (not in the real data)',
        options: [
          { value: 'off', label: 'Off: row 0 weighs 3750 g' },
          { value: 'on', label: 'On: row 0 typed as 37500 g' },
        ],
        get: (s) => (s.typo ? 'on' : 'off'),
        set: (s, v) => ({ ...s, typo: v === 'on' }),
      },
    ],
    compute: (s) => ({ ...cleanSubset(subset, s), subsetSize: subset.length }),
    trace: (s) => buildIqrTrace(cleanSubset(subset, s).masses),
    traceExample,
    readout: (_s, r) => cleaningReadout(r),
  };
}

export function cleaningReadout(r: CleaningExperimentResult): ReadoutItem[] {
  const st = r.stats;
  return [
    { label: 'pandas prints', value: cleaningPrintout(r.subsetSize, r) },
    { label: 'Rows kept', value: `${r.kept.length} of ${r.subsetSize}` },
    {
      label: 'IQR rule',
      value: `IQR = ${pyRepr(st.q3)} − ${pyRepr(st.q1)} = ${pyRepr(st.iqr)}; fences ${pyRepr(st.low)} to ${pyRepr(st.high)}`,
    },
  ];
}

const csvValue = (v: number | string | null) => (v === null ? 'NA' : String(v));

/** The subset as CSV text, laid out as in penguins.csv (row number first, year left out). */
export function cleaningCsv(): string {
  const header = 'row,species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex';
  const lines = cleaningSubset().map((p) =>
    [p.row, p.species, p.island, ...NUMERIC_COLUMNS.map((c) => p[c]), p.sex].map(csvValue).join(','),
  );
  return `${[header, ...lines].join('\n')}\n`;
}
