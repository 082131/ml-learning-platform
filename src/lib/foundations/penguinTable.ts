import { NUMERIC_COLUMNS, PENGUINS, SPECIES, type NumericColumn, type Penguin } from '../classical/penguins';
import type { ExperimentDef, ReadoutItem } from '../types';

// Filter, group and summarize the penguins table the way pandas does, for the table explorer.
// Every combination the explorer offers is checked against pandas in penguinTable.test.ts.

export const ISLANDS = ['Biscoe', 'Dream', 'Torgersen'] as const;
export const GROUPS = ['none', 'species', 'island', 'sex'] as const;
export const STATS = ['mean', 'count', 'min', 'max'] as const;
export type GroupBy = (typeof GROUPS)[number];
export type Stat = (typeof STATS)[number];

export interface TableState {
  species: 'all' | Penguin['species'];
  island: 'all' | Penguin['island'];
  by: GroupBy;
  column: NumericColumn;
  stat: Stat;
}

export interface GroupRow {
  /** The group's key, or null for the whole (filtered) table. */
  key: string | null;
  /** Rows in the group (including rows where the column is missing). */
  rows: number;
  /** The statistic over the non-missing values; null when there are none (pandas shows NaN). */
  value: number | null;
}

export interface TableResult {
  /** Rows that pass the filter, in file order (index labels are Penguin.row). */
  rows: Penguin[];
  groups: GroupRow[];
  /** Rows left out of the groups because their group key is missing (pandas groupby drops NaN keys). */
  droppedKeys: number;
}

const q = (s: string) => `"${s}"`;

/** The filter as pandas code: penguins, or penguins[(penguins["species"] == "Gentoo") & ...]. */
export function filterText(s: TableState): string {
  const parts = [
    s.species !== 'all' && `penguins["species"] == ${q(s.species)}`,
    s.island !== 'all' && `penguins["island"] == ${q(s.island)}`,
  ].filter((p): p is string => !!p);
  if (parts.length === 0) return 'penguins';
  if (parts.length === 1) return `penguins[${parts[0]}]`;
  return `penguins[${parts.map((p) => `(${p})`).join(' & ')}]`;
}

/** The summary as pandas code, for example df.groupby("species")["body_mass_g"].mean(). */
export const summaryText = (s: TableState) =>
  `df${s.by === 'none' ? '' : `.groupby(${q(s.by)})`}[${q(s.column)}].${s.stat}()`;

function stat(values: number[], kind: Stat): number | null {
  if (kind === 'count') return values.length;
  if (values.length === 0) return null;
  if (kind === 'min') return Math.min(...values);
  if (kind === 'max') return Math.max(...values);
  // pandas sums with pairwise/Kahan-style accuracy; for at most 344 values with 1 decimal the plain sum
  // agrees to well below the rounding shown (the test allows 1e-9 relative difference).
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeTable(s: TableState): TableResult {
  const rows = PENGUINS.filter(
    (p) => (s.species === 'all' || p.species === s.species) && (s.island === 'all' || p.island === s.island),
  );
  const valuesOf = (rs: Penguin[]) => rs.flatMap((r) => (r[s.column] === null ? [] : [r[s.column]!]));
  if (s.by === 'none')
    return {
      rows,
      groups: [{ key: null, rows: rows.length, value: stat(valuesOf(rows), s.stat) }],
      droppedKeys: 0,
    };

  const by = s.by;
  const keyed = rows.filter((r) => r[by] !== null);
  // pandas sorts group keys; all keys here are strings, sorted by code point.
  const keys = [...new Set(keyed.map((r) => String(r[by])))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    rows,
    groups: keys.map((key) => {
      const rs = keyed.filter((r) => String(r[by]) === key);
      return { key, rows: rs.length, value: stat(valuesOf(rs), s.stat) };
    }),
    droppedKeys: rows.length - keyed.length,
  };
}

/** A value as the explorer shows it: means to 1 decimal, everything else as is. NaN when missing. */
export function formatValue(v: number | null, kind: Stat): string {
  if (v === null) return 'NaN';
  return kind === 'mean' ? v.toFixed(1) : String(v);
}

export function tableReadout(s: TableState, r: TableResult): ReadoutItem[] {
  return [
    { label: 'len(df)', value: String(r.rows.length) },
    ...r.groups.map((g) => ({
      label: g.key === null ? summaryText(s) : `${s.by} = ${g.key}`,
      value: formatValue(g.value, s.stat),
    })),
  ];
}

const opt = (v: string, label = v) => ({ value: v, label });

export function tableExperiment(id: string, initial: TableState): ExperimentDef<TableState, TableResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'species',
        label: 'Keep species',
        options: [opt('all', 'all species'), ...SPECIES.map((v) => opt(v))],
        get: (s) => s.species,
        set: (s, v) => ({ ...s, species: v as TableState['species'] }),
      },
      {
        kind: 'select',
        id: 'island',
        label: 'Keep island',
        options: [opt('all', 'all islands'), ...ISLANDS.map((v) => opt(v))],
        get: (s) => s.island,
        set: (s, v) => ({ ...s, island: v as TableState['island'] }),
      },
      {
        kind: 'select',
        id: 'by',
        label: 'Group by',
        options: GROUPS.map((v) => opt(v, v === 'none' ? 'no grouping' : v)),
        get: (s) => s.by,
        set: (s, v) => ({ ...s, by: v as GroupBy }),
      },
      {
        kind: 'select',
        id: 'column',
        label: 'Column',
        options: NUMERIC_COLUMNS.map((v) => opt(v)),
        get: (s) => s.column,
        set: (s, v) => ({ ...s, column: v as NumericColumn }),
      },
      {
        kind: 'select',
        id: 'stat',
        label: 'Statistic',
        options: STATS.map((v) => opt(v)),
        get: (s) => s.stat,
        set: (s, v) => ({ ...s, stat: v as Stat }),
      },
    ],
    compute: computeTable,
    readout: tableReadout,
  };
}
