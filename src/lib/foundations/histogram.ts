import { NUMERIC_COLUMNS, PENGUINS, column, type NumericColumn } from '../classical/penguins';
import type { ExperimentDef, ReadoutItem } from '../types';
import { arrayStr } from './arrayIndexing';
import { floatRepr } from './pyValues';

// np.histogram(values, bins=n), reproduced step by step (linspace edges, then NumPy's bin-index rule with
// its corrections at the edges) so the explorer's bars equal what Matplotlib's ax.hist draws.
// Checked against NumPy for every column and bin count in histogram.test.ts.

/** np.linspace(start, stop, num): k * step + start, with the last value set to stop exactly. */
export function linspace(start: number, stop: number, num: number): number[] {
  const step = (stop - start) / (num - 1);
  return Array.from({ length: num }, (_, k) => (k === num - 1 ? stop : k * step + start));
}

export function histogram(values: readonly number[], bins: number): { counts: number[]; edges: number[] } {
  const first = Math.min(...values);
  const last = Math.max(...values);
  const edges = linspace(first, last, bins + 1);
  const counts = new Array<number>(bins).fill(0);
  for (const x of values) {
    let i = Math.trunc(((x - first) / (last - first)) * bins);
    if (i === bins) i -= 1;
    if (x < edges[i]!) i -= 1;
    if (x >= edges[i + 1]! && i !== bins - 1) i += 1;
    counts[i]! += 1;
  }
  return { counts, edges };
}

export interface HistState {
  column: NumericColumn;
  bins: number;
}

export interface HistResult {
  values: number[];
  counts: number[];
  edges: number[];
}

export const computeHist = (s: HistState): HistResult => {
  const values = column(PENGUINS, s.column);
  return { values, ...histogram(values, s.bins) };
};

export const UNITS: Record<NumericColumn, string> = {
  bill_length_mm: 'Bill length (mm)',
  bill_depth_mm: 'Bill depth (mm)',
  flipper_length_mm: 'Flipper length (mm)',
  body_mass_g: 'Body mass (g)',
};

/** A number rounded for reading, as Python's round(x, 2) prints it. */
export const round2 = (x: number) => floatRepr(Math.round(x * 100) / 100);

export function histReadout(_: HistState, r: HistResult): ReadoutItem[] {
  const tallest = r.counts.indexOf(Math.max(...r.counts));
  return [
    { label: 'len(values)', value: String(r.values.length) },
    { label: 'counts', value: arrayStr(r.counts) },
    { label: 'bin width', value: round2(r.edges[1]! - r.edges[0]!) },
    {
      label: 'tallest bar',
      value: `${r.counts[tallest]} penguins, from ${round2(r.edges[tallest]!)} to ${round2(r.edges[tallest + 1]!)}`,
    },
  ];
}

export function histExperiment(id: string, initial: HistState): ExperimentDef<HistState, HistResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'column',
        label: 'Column',
        options: NUMERIC_COLUMNS.map((c) => ({ value: c, label: c })),
        get: (s) => s.column,
        set: (s, v) => ({ ...s, column: v as NumericColumn }),
      },
      {
        kind: 'slider',
        id: 'bins',
        label: 'bins',
        min: 2,
        max: 40,
        get: (s) => s.bins,
        set: (s, v) => ({ ...s, bins: v }),
      },
    ],
    compute: computeHist,
    readout: histReadout,
  };
}
