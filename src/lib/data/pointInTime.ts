/**
 * The training-serving lesson's point-in-time join. A daily feature job writes, at the end of each day, each
 * customer's order count over the last WINDOW days. Training examples are predictions made at the start of a
 * day; the join picks which snapshot each example gets. Only the as-of join (the snapshot from the day before)
 * gives the value the model would have seen in production. pointInTime.test.ts checks every setting against
 * POINT_SOURCE run with CPython 3.13.
 */
import type { ExperimentDef } from '../types';

export const ORDERS: Record<string, number[]> = {
  A: [2, 5, 9, 12, 13, 20],
  B: [1, 15, 16, 17, 18],
  C: [3, 4, 22],
};
export const LATEST_RUN = 25;
export const EXAMPLES: [string, number][] = [
  ['A', 10],
  ['A', 14],
  ['B', 15],
  ['B', 19],
  ['C', 5],
  ['C', 21],
];
export const WINDOWS = [3, 7] as const;
export const JOINS = ['as-of', 'same-day', 'latest'] as const;
export type Window = (typeof WINDOWS)[number];
export type Join = (typeof JOINS)[number];

export interface PointState {
  window: Window;
  join: Join;
}

export interface PointRow {
  customer: string;
  day: number;
  label: number;
  /** The day whose end-of-day snapshot the join picked. */
  snap: number;
  value: number;
  /** The value at prediction time: the snapshot from the end of the previous day. */
  correct: number;
  leak: boolean;
}

export interface PointResult {
  rows: PointRow[];
  leaks: number;
}

/** The value the daily job wrote at the end of `day`: orders in (day - window, day]. */
export function snapshot(customer: string, day: number, window: number): number {
  return ORDERS[customer]!.filter((d) => day - window < d && d <= day).length;
}

export function snapDay(join: Join, day: number): number {
  return join === 'as-of' ? day - 1 : join === 'same-day' ? day : LATEST_RUN;
}

export function pointInTime({ window, join }: PointState): PointResult {
  const rows = EXAMPLES.map(([customer, day]) => {
    const label = ORDERS[customer]!.some((d) => day <= d && d < day + 7) ? 1 : 0;
    const snap = snapDay(join, day);
    const value = snapshot(customer, snap, window);
    const correct = snapshot(customer, day - 1, window);
    return { customer, day, label, snap, value, correct, leak: value !== correct };
  });
  return { rows, leaks: rows.filter((r) => r.leak).length };
}

/** What POINT_SOURCE prints. */
export function pointPrintout(r: PointResult): string {
  const lines = r.rows.map((x) => {
    const note = x.leak ? `  <- from day ${x.snap}; at prediction time it was ${x.correct}` : '';
    return `${x.customer} day ${String(x.day).padStart(2)}: feature=${x.value} label=${x.label}${note}`;
  });
  lines.push(`${r.leaks} of ${r.rows.length} training rows use information from the future`);
  return lines.join('\n');
}

export const POINT_SOURCE = `ORDERS = {"A": [2, 5, 9, 12, 13, 20], "B": [1, 15, 16, 17, 18], "C": [3, 4, 22]}  # order days
WINDOW = {{window}}  # feature: orders in the last WINDOW days
JOIN = "{{join}}"  # as-of, same-day or latest
LATEST_RUN = 25  # the feature job last ran at the end of day 25


def snapshot(customer, day):  # the value the daily feature job wrote at the end of \`day\`
    return sum(1 for d in ORDERS[customer] if day - WINDOW < d <= day)


examples = [("A", 10), ("A", 14), ("B", 15), ("B", 19), ("C", 5), ("C", 21)]  # predict at the start of a day
leaks = 0
for customer, day in examples:
    label = int(any(day <= d < day + 7 for d in ORDERS[customer]))  # orders in the next 7 days?
    snap = {"as-of": day - 1, "same-day": day, "latest": LATEST_RUN}[JOIN]
    value, correct = snapshot(customer, snap), snapshot(customer, day - 1)
    note = "" if value == correct else f"  <- from day {snap}; at prediction time it was {correct}"
    leaks += value != correct
    print(f"{customer} day {day:2}: feature={value} label={label}{note}")
print(f"{leaks} of {len(examples)} training rows use information from the future")`;

export const pointSlots = (s: PointState) => ({ window: String(s.window), join: s.join });

const JOIN_LABEL: Record<Join, string> = {
  'as-of': 'As of the day before',
  'same-day': 'Same day',
  latest: 'Latest value',
};

export function pointExperiment(id: string): ExperimentDef<PointState, PointResult> {
  return {
    id,
    initial: { window: 7, join: 'latest' },
    controls: [
      {
        kind: 'select',
        id: 'join',
        label: 'Training rows get the snapshot',
        options: JOINS.map((j) => ({ value: j, label: JOIN_LABEL[j] })),
        get: (s) => s.join,
        set: (s, v) => ({ ...s, join: v as Join }),
      },
      {
        kind: 'select',
        id: 'window',
        label: 'Feature window',
        options: WINDOWS.map((w) => ({ value: String(w), label: `Orders in the last ${w} days` })),
        get: (s) => String(s.window),
        set: (s, v) => ({ ...s, window: Number(v) as Window }),
      },
    ],
    compute: pointInTime,
    readout: (_s, r) => [
      { label: 'Python: what features.py prints', value: pointPrintout(r) },
      {
        label: 'Rows that leak the future',
        value: `${r.leaks} of ${r.rows.length}`,
        status: r.leaks ? 'error' : 'ok',
      },
    ],
  };
}
