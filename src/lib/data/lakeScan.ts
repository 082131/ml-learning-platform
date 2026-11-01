/**
 * How many bytes a query must read from one month of events stored three ways: one CSV file, one Parquet
 * file, and Parquet files partitioned by day (Hive style, day=YYYY-MM-DD/part-0.parquet). The sizes are
 * real: fixtures/lake_sizes.py wrote the files with pyarrow 26.0.0 and recorded each column chunk's
 * compressed size from the Parquet metadata. A Parquet read is counted as the needed column chunks plus
 * the file's footer and header (file size minus all column chunks); readers may fetch somewhat more.
 */
import type { ExperimentDef } from '../types';
import sizes from './fixtures/lake-sizes.json';

export type Projection = 'two' | 'all';
export type Layout = 'csv' | 'single' | 'partitioned';

export interface LakeState {
  days: number;
  select: Projection;
}

type ColumnSizes = Record<string, number>;
const SIZES = sizes as {
  rows: number;
  csv: number;
  single: { columns: ColumnSizes; file: number; row_groups: number };
  partitioned: Record<string, { columns: ColumnSizes; file: number }>;
};

export const TOTAL_ROWS = SIZES.rows;
export const CSV_BYTES = SIZES.csv;
export const DAY_KEYS = Object.keys(SIZES.partitioned).sort();
export const DAYS_MAX = DAY_KEYS.length;
export const ROWS_PER_DAY = TOTAL_ROWS / DAYS_MAX;
export const LAYOUTS: Layout[] = ['csv', 'single', 'partitioned'];
export const LAYOUT_LABEL: Record<Layout, string> = {
  csv: 'CSV, one file',
  single: 'Parquet, one file',
  partitioned: 'Parquet, partitioned by day',
};

/** Columns the query reads. `day` is a column in the single file but only a folder name when partitioned. */
export function neededColumns(select: Projection, layout: Layout): string[] {
  const all = Object.keys(SIZES.single.columns);
  const data = select === 'all' ? all.filter((c) => c !== 'day') : ['country', 'amount'];
  return layout === 'single' ? [...data, 'day'] : data;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const footer = (f: { columns: ColumnSizes; file: number }) => f.file - sum(Object.values(f.columns));

export interface LayoutScan {
  layout: Layout;
  bytes: number;
  files: number;
  rowsScanned: number;
  columns: string[];
}

export interface LakeResult {
  /** The first day the query keeps (the last `days` days of the month). */
  start: string;
  scans: LayoutScan[];
  rowsMatched: number;
}

export function scanLake({ days, select }: LakeState): LakeResult {
  const kept = DAY_KEYS.slice(DAYS_MAX - days);
  const scans: LayoutScan[] = LAYOUTS.map((layout) => {
    const columns = neededColumns(select, layout);
    if (layout === 'csv')
      return { layout, bytes: CSV_BYTES, files: 1, rowsScanned: TOTAL_ROWS, columns: ['every column'] };
    if (layout === 'single') {
      // One row group spans the whole month, so its min/max statistics cannot skip anything.
      const f = SIZES.single;
      return {
        layout,
        bytes: sum(columns.map((c) => f.columns[c]!)) + footer(f),
        files: 1,
        rowsScanned: TOTAL_ROWS,
        columns,
      };
    }
    const files = kept.map((d) => SIZES.partitioned[d]!);
    return {
      layout,
      bytes: sum(files.map((f) => sum(columns.map((c) => f.columns[c]!)) + footer(f))),
      files: files.length,
      rowsScanned: kept.length * ROWS_PER_DAY,
      columns,
    };
  });
  return { start: kept[0]!, scans, rowsMatched: kept.length * ROWS_PER_DAY };
}

export const formatBytes = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} MB` : `${(n / 1000).toFixed(1)} kB`;

export const startDay = (days: number) => DAY_KEYS[DAYS_MAX - days]!;

export const lakeSlots = (s: LakeState) => ({
  select: s.select === 'all' ? '*' : 'country, SUM(amount) AS revenue',
  start: startDay(s.days),
  groupBy: s.select === 'all' ? '-- no GROUP BY: every column of every matching row' : 'GROUP BY country',
});

export function lakeExperiment(id: string): ExperimentDef<LakeState, LakeResult> {
  return {
    id,
    initial: { days: 7, select: 'two' },
    controls: [
      {
        kind: 'slider',
        id: 'days',
        label: 'Days the query covers (ending 30 October)',
        min: 1,
        max: DAYS_MAX,
        get: (s) => s.days,
        set: (s, v) => ({ ...s, days: v }),
      },
      {
        kind: 'select',
        id: 'select',
        label: 'Columns',
        options: [
          { value: 'two', label: 'country, SUM(amount)' },
          { value: 'all', label: 'SELECT * (all 7 columns)' },
        ],
        get: (s) => s.select,
        set: (s, v) => ({ ...s, select: v as Projection }),
      },
    ],
    compute: scanLake,
    readout: (_s, r) => [
      {
        label: 'Rows the query needs',
        value: `${r.rowsMatched.toLocaleString('en-US')} of ${TOTAL_ROWS.toLocaleString('en-US')}`,
      },
      ...r.scans.map((sc) => ({
        label: `${LAYOUT_LABEL[sc.layout]}: bytes read`,
        value: `${sc.bytes.toLocaleString('en-US')} bytes (${formatBytes(sc.bytes)}) from ${sc.files} file${sc.files === 1 ? '' : 's'}`,
      })),
    ],
  };
}
