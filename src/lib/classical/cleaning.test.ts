import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  buildIqrTrace,
  cleaningCsv,
  cleaningExperiment,
  cleaningPrintout,
  cleaningSlots,
  cleaningSubset,
  cleanSubset,
  iqrLoopPrintout,
  iqrStats,
  type CleaningState,
  type NumericStrategy,
  type SexStrategy,
} from './cleaning';

// Produced by src/lib/classical/fixtures/gen_cleaning.py with ~/pyenv/bin/python (CPython 3.13,
// pandas 3.0.2): what the lesson's pandas code prints for every state of the experiment.
const PANDAS: Record<string, string> = {
  'drop/drop/clean':
    'rows: 14 -> 9\nmean: 4200.0 median: 3800.0 std: 990.9\nfences: 1875.0 6075.0\noutliers: []',
  'drop/drop/typo':
    'rows: 14 -> 9\nmean: 7950.0 median: 4150.0 std: 11124.2\nfences: 0.0 9200.0\noutliers: [0]',
  'drop/unknown/clean':
    'rows: 14 -> 12\nmean: 4200.0 median: 3975.0 std: 896.4\nfences: 1781.25 6281.25\noutliers: []',
  'drop/unknown/typo':
    'rows: 14 -> 12\nmean: 7012.5 median: 4200.0 std: 9641.8\nfences: 1031.25 7531.25\noutliers: [0]',
  'median/drop/clean':
    'rows: 14 -> 9\nmean: 4200.0 median: 3800.0 std: 990.9\nfences: 1875.0 6075.0\noutliers: []',
  'median/drop/typo':
    'rows: 14 -> 9\nmean: 7950.0 median: 4150.0 std: 11124.2\nfences: 0.0 9200.0\noutliers: [0]',
  'median/unknown/clean':
    'rows: 14 -> 14\nmean: 4167.857142857143 median: 3975.0 std: 828.6\nfences: 2203.125 5778.125\noutliers: [267]',
  'median/unknown/typo':
    'rows: 14 -> 14\nmean: 6610.714285714285 median: 4200.0 std: 8927.8\nfences: 1718.75 6618.75\noutliers: [0]',
  'mean/drop/clean':
    'rows: 14 -> 9\nmean: 4200.0 median: 3800.0 std: 990.9\nfences: 1875.0 6075.0\noutliers: []',
  'mean/drop/typo':
    'rows: 14 -> 9\nmean: 7950.0 median: 4150.0 std: 11124.2\nfences: 0.0 9200.0\noutliers: [0]',
  'mean/unknown/clean':
    'rows: 14 -> 14\nmean: 4200.0 median: 4175.0 std: 824.6\nfences: 2203.125 5778.125\noutliers: [267]',
  'mean/unknown/typo':
    'rows: 14 -> 14\nmean: 7012.5 median: 4375.0 std: 8869.2\nfences: 153.125 9228.125\noutliers: [0]',
};

// The pure-Python IQR loop (IQR_LOOP_SOURCE) run with CPython 3.13 on each state's cleaned masses.
const PURE_PYTHON: Record<string, string> = {
  'drop/drop/clean': 'fences: 1875.0 6075.0',
  'drop/drop/typo': 'outlier: 37500.0\nfences: 0.0 9200.0',
  'drop/unknown/clean': 'fences: 1781.25 6281.25',
  'drop/unknown/typo': 'outlier: 37500.0\nfences: 1031.25 7531.25',
  'median/unknown/clean': 'outlier: 5850.0\nfences: 2203.125 5778.125',
  'median/unknown/typo': 'outlier: 37500.0\nfences: 1718.75 6618.75',
  'mean/unknown/clean': 'outlier: 5850.0\nfences: 2203.125 5778.125',
  'mean/unknown/typo': 'outlier: 37500.0\nfences: 153.125 9228.125',
};

const states = (['drop', 'median', 'mean'] as NumericStrategy[]).flatMap((numeric) =>
  (['drop', 'unknown'] as SexStrategy[]).flatMap((sex) =>
    [false, true].map((typo): [string, CleaningState] => [
      `${numeric}/${sex}/${typo ? 'typo' : 'clean'}`,
      { numeric, sex, typo },
    ]),
  ),
);

describe('cleaning experiment', () => {
  const subset = cleaningSubset();

  it('uses the 14 named rows, with two all-NA rows and three rows missing only sex', () => {
    expect(subset.map((p) => p.row)).toEqual([0, 1, 2, 3, 4, 8, 9, 152, 267, 268, 271, 273, 300, 301]);
    expect(subset.filter((p) => p.body_mass_g === null).map((p) => p.row)).toEqual([3, 271]);
    expect(subset.filter((p) => p.sex === null && p.body_mass_g !== null).map((p) => p.row)).toEqual([
      8, 9, 268,
    ]);
  });

  it.each(states)('prints what pandas prints for %s', (key, s) => {
    expect(cleaningPrintout(subset.length, cleanSubset(subset, s))).toBe(PANDAS[key]);
  });

  it.each(states.filter(([k]) => PURE_PYTHON[k]))(
    'the pure-Python IQR loop prints as CPython for %s',
    (key, s) => {
      expect(iqrLoopPrintout(cleanSubset(subset, s).masses)).toBe(PURE_PYTHON[key]);
    },
  );

  it('fills by hand-worked median: body mass median of the 12 present values is (3800 + 4150) / 2 = 3975', () => {
    const r = cleanSubset(subset, { numeric: 'median', sex: 'unknown', typo: false });
    expect(r.fills!.body_mass_g).toBe(3975);
    const row3 = r.rows.find((x) => x.row === 3)!;
    expect(row3.filled).toEqual(['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g']);
    expect(row3.sex).toBe('unknown');
    expect(row3.sexFilled).toBe(true);
  });

  it('drops a row for its first reason only', () => {
    const r = cleanSubset(subset, { numeric: 'drop', sex: 'drop', typo: false });
    expect(r.rows.filter((x) => x.dropped === 'numeric').map((x) => x.row)).toEqual([3, 271]);
    expect(r.rows.filter((x) => x.dropped === 'sex').map((x) => x.row)).toEqual([8, 9, 268]);
  });

  it('computes 1.5·IQR fences by hand: [1, 2, 3, 4, 100]', () => {
    // q1 at position 1 → 2, q3 at position 3 → 4, IQR 2, fences 2 − 3 = −1 and 4 + 3 = 7.
    const st = iqrStats([1, 2, 3, 4, 100], [10, 11, 12, 13, 14]);
    expect([st.q1, st.q3, st.iqr, st.low, st.high]).toEqual([2, 4, 2, -1, 7]);
    expect(st.outliers).toEqual([14]);
  });

  it('fills the code slots from state', () => {
    expect(cleaningSlots({ numeric: 'mean', sex: 'unknown', typo: true })).toEqual({
      typo: 'df.loc[0, "body_mass_g"] = 37500.0  # injected typo, not in the real data',
      numeric: 'df.fillna(df[num_cols].mean())',
      sex: 'clean.fillna({"sex": "unknown"})',
    });
  });

  it('traces the IQR loop line by line', () => {
    const t = buildIqrTrace([3750, 3800, 3250, 37500]);
    // sorted [3250, 3750, 3800, 37500]; pos1 = 0.75 → 3250 + 500·0.75 = 3625; pos3 = 2.25 → 3800 + 33700·0.25 = 12225
    expect(t.steps[4]!.note).toBe(
      'q1 = s[0] + (s[1] − s[0]) · 0.75 = 3250.0 + (3750.0 − 3250.0) · 0.75 = 3625.0.',
    );
    expect(t.steps[5]!.note).toContain('= 12225.0.');
    expect(t.steps.at(-1)!.vars.output).toEqual({
      kind: 'text',
      value: 'outlier: 37500.0\nfences: -9275.0 25125.0',
    });
    expect(t.steps.filter((s) => s.range.line === 12)).toHaveLength(1);
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(cleaningExperiment('x', 'loop'))).toEqual([]);
  });
});

describe('cleaningCsv', () => {
  it('reproduces the rows of penguins.csv as the Python examples inline them', () => {
    const lines = cleaningCsv().split('\n');
    expect(lines[0]).toBe(
      'row,species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex',
    );
    expect(lines[3]).toBe('2,Adelie,Torgersen,40.3,18,195,3250,female');
    expect(lines[4]).toBe('3,Adelie,Torgersen,NA,NA,NA,NA,NA');
    expect(lines[14]).toBe('301,Chinstrap,Dream,52,19,197,4150,male');
    expect(lines).toHaveLength(16);
  });
});
