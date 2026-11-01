/**
 * The data quality lesson's checks on one daily load: schema, uniqueness, range (blocking) and freshness,
 * volume, null rate (warnings), on scripted incidents, plus the lineage that decides what a failure affects.
 * quality.test.ts checks every setting against QUALITY_SOURCE run with CPython 3.13.
 */
import type { FlowEdge, FlowNode, NodeStatus } from '../viz/flow';
import type { ExperimentDef } from '../types';

export const EXPECTED_COLUMNS = ['order_id', 'email', 'amount', 'country', 'ordered_at'];
export const HISTORY = [980, 1012, 1003, 995, 1040, 870, 1021];

export interface LoadMetrics {
  rows: number;
  lag_hours: number;
  null_email: number;
  negative: number;
  duplicates: number;
  columns: string[];
}

export const NORMAL: LoadMetrics = {
  rows: 902,
  lag_hours: 3,
  null_email: 0.004,
  negative: 0,
  duplicates: 0,
  columns: EXPECTED_COLUMNS,
};

export type Incident = 'none' | 'late' | 'volume' | 'nulls' | 'schema' | 'range' | 'duplicates';
export const INCIDENTS: Record<Incident, { label: string; change: Partial<LoadMetrics> }> = {
  none: { label: 'Nothing (a normal, slightly quiet day)', change: {} },
  late: { label: 'The source stopped sending 30 hours ago', change: { lag_hours: 30 } },
  volume: { label: 'Only 412 rows arrived', change: { rows: 412 } },
  nulls: { label: '18% of emails are empty', change: { null_email: 0.18 } },
  schema: {
    label: 'amount was renamed to amount_eur',
    change: { columns: ['order_id', 'email', 'amount_eur', 'country', 'ordered_at'] },
  },
  range: { label: '27 negative amounts', change: { negative: 27 } },
  duplicates: { label: '14 duplicate order ids', change: { duplicates: 14 } },
};
export const TOLERANCES = ['0.05', '0.1', '0.15', '0.2', '0.25', '0.3', '0.35', '0.4', '0.45', '0.5'];

export interface QualityState {
  incident: Incident;
  /** Index into TOLERANCES. */
  tol: number;
}

export interface Check {
  name: string;
  severity: 'block' | 'warn';
  passed: boolean;
  detail: string;
}

export type Decision = 'publish' | 'warn' | 'stop';

export interface QualityResult {
  today: LoadMetrics;
  checks: Check[];
  decision: Decision;
}

/** Python's statistics.median for a list of ints. */
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const pyList = (xs: string[]) => `[${xs.map((x) => `'${x}'`).join(', ')}]`;
const pct = (x: number, sign = false) => `${sign && x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;

export function runChecks({ incident, tol }: QualityState): QualityResult {
  const today = { ...NORMAL, ...INCIDENTS[incident].change };
  const base = median(HISTORY);
  const change = today.rows / base - 1;
  const cols = new Set(today.columns);
  const missing = EXPECTED_COLUMNS.filter((c) => !cols.has(c)).sort();
  const extra = today.columns.filter((c) => !EXPECTED_COLUMNS.includes(c)).sort();
  const tolerance = Number(TOLERANCES[tol]);
  const checks: Check[] = [
    {
      name: 'schema',
      severity: 'block',
      passed: !missing.length && !extra.length,
      detail: `missing ${pyList(missing)}, unexpected ${pyList(extra)}`,
    },
    {
      name: 'unique',
      severity: 'block',
      passed: today.duplicates === 0,
      detail: `${today.duplicates} duplicate order_id values`,
    },
    {
      name: 'range',
      severity: 'block',
      passed: today.negative === 0,
      detail: `${today.negative} negative amounts`,
    },
    {
      name: 'freshness',
      severity: 'warn',
      passed: today.lag_hours <= 26,
      detail: `newest order is ${today.lag_hours} h old (limit 26)`,
    },
    {
      name: 'volume',
      severity: 'warn',
      passed: Math.abs(change) <= tolerance,
      detail: `${today.rows} rows, ${pct(change, true)} vs median ${base}`,
    },
    {
      name: 'nulls',
      severity: 'warn',
      passed: today.null_email <= 0.01,
      detail: `${pct(today.null_email)} of emails empty (limit 1.0%)`,
    },
  ];
  const decision: Decision = checks.some((c) => !c.passed && c.severity === 'block')
    ? 'stop'
    : checks.some((c) => !c.passed)
      ? 'warn'
      : 'publish';
  return { today, checks, decision };
}

export const DECISION_LINE: Record<Decision, string> = {
  stop: "STOP: downstream tables keep yesterday's data; page the on-call engineer",
  warn: 'PUBLISH with a warning; alert the data owner',
  publish: 'PUBLISH',
};

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));

/** What QUALITY_SOURCE prints. */
export function qualityPrintout(r: QualityResult): string {
  return [
    ...r.checks.map(
      (c) => `${c.passed ? 'PASS' : 'FAIL'}  ${pad(c.name, 9)} ${pad(c.severity, 5)}  ${c.detail}`,
    ),
    DECISION_LINE[r.decision],
  ].join('\n');
}

/** Lineage: where orders_clean comes from and what reads it. */
export const LINEAGE: { id: string; x: number; y: number; upstream: string[] }[] = [
  { id: 'orders_raw', x: 0, y: 48, upstream: [] },
  { id: 'orders_clean', x: 190, y: 48, upstream: ['orders_raw'] },
  { id: 'daily_revenue', x: 380, y: 0, upstream: ['orders_clean'] },
  { id: 'features', x: 380, y: 96, upstream: ['orders_clean'] },
  { id: 'dashboard', x: 570, y: 0, upstream: ['daily_revenue'] },
  { id: 'churn_model', x: 570, y: 96, upstream: ['features'] },
];

export function lineageDiagram(r: QualityResult): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const downstream = (id: string): { status: NodeStatus; detail: string } =>
    r.decision === 'stop'
      ? { status: 'warn', detail: "stale: yesterday's data" }
      : r.decision === 'warn'
        ? { status: 'warn', detail: 'updated, flagged' }
        : { status: 'ok', detail: id === 'churn_model' ? 'retrained' : 'updated' };
  const nodes: FlowNode[] = LINEAGE.map((n) => {
    const base = { id: n.id, label: n.id, x: n.x, y: n.y, w: 150 };
    if (n.id === 'orders_raw') return { ...base, status: 'ok', detail: 'landed' };
    if (n.id === 'orders_clean') {
      const failed = r.checks.filter((c) => !c.passed);
      return {
        ...base,
        status: r.decision === 'stop' ? 'error' : r.decision === 'warn' ? 'warn' : 'ok',
        detail: failed.length ? `failed: ${failed.map((c) => c.name).join(', ')}` : 'all checks pass',
      };
    }
    return { ...base, ...downstream(n.id) };
  });
  const edges = LINEAGE.flatMap((n) => n.upstream.map((u) => ({ from: u, to: n.id })));
  return { nodes, edges };
}

export const QUALITY_SOURCE = `from statistics import median

EXPECTED_COLUMNS = ["order_id", "email", "amount", "country", "ordered_at"]
HISTORY = [980, 1012, 1003, 995, 1040, 870, 1021]  # rows loaded on each of the last 7 days
NORMAL = {"rows": 902, "lag_hours": 3, "null_email": 0.004, "negative": 0, "duplicates": 0,
          "columns": EXPECTED_COLUMNS}
INCIDENTS = {
    "none": {},
    "late": {"lag_hours": 30},
    "volume": {"rows": 412},
    "nulls": {"null_email": 0.18},
    "schema": {"columns": ["order_id", "email", "amount_eur", "country", "ordered_at"]},
    "range": {"negative": 27},
    "duplicates": {"duplicates": 14},
}
INCIDENT = "{{incident}}"
TOLERANCE = {{tolerance}}  # allowed change in row count vs the 7-day median

today = {**NORMAL, **INCIDENTS[INCIDENT]}  # metrics of today's load of orders_clean
base = median(HISTORY)
change = today["rows"] / base - 1
missing = sorted(set(EXPECTED_COLUMNS) - set(today["columns"]))
extra = sorted(set(today["columns"]) - set(EXPECTED_COLUMNS))
checks = [  # (name, severity, passed, detail)
    ("schema", "block", not missing and not extra, f"missing {missing}, unexpected {extra}"),
    ("unique", "block", today["duplicates"] == 0, f"{today['duplicates']} duplicate order_id values"),
    ("range", "block", today["negative"] == 0, f"{today['negative']} negative amounts"),
    ("freshness", "warn", today["lag_hours"] <= 26, f"newest order is {today['lag_hours']} h old (limit 26)"),
    ("volume", "warn", abs(change) <= TOLERANCE, f"{today['rows']} rows, {change:+.1%} vs median {base}"),
    ("nulls", "warn", today["null_email"] <= 0.01, f"{today['null_email']:.1%} of emails empty (limit 1.0%)"),
]
for name, severity, passed, detail in checks:
    print(f"{'PASS' if passed else 'FAIL'}  {name:<9} {severity:<5}  {detail}")

if any(not passed and severity == "block" for _, severity, passed, _ in checks):
    print("STOP: downstream tables keep yesterday's data; page the on-call engineer")
elif any(not passed for _, _, passed, _ in checks):
    print("PUBLISH with a warning; alert the data owner")
else:
    print("PUBLISH")`;

export const qualitySlots = (s: QualityState) => ({ incident: s.incident, tolerance: TOLERANCES[s.tol]! });

export function qualityExperiment(id: string): ExperimentDef<QualityState, QualityResult> {
  return {
    id,
    initial: { incident: 'schema', tol: 3 },
    controls: [
      {
        kind: 'select',
        id: 'incident',
        label: 'What happened to today’s load',
        options: (Object.keys(INCIDENTS) as Incident[]).map((k) => ({ value: k, label: INCIDENTS[k].label })),
        get: (s) => s.incident,
        set: (s, v) => ({ ...s, incident: v as Incident }),
      },
      {
        kind: 'slider',
        id: 'tol',
        label: 'Volume tolerance (allowed change vs the 7-day median)',
        min: 0,
        max: TOLERANCES.length - 1,
        get: (s) => s.tol,
        set: (s, v) => ({ ...s, tol: v }),
        format: (v) => `±${Math.round(Number(TOLERANCES[v]) * 100)}%`,
      },
    ],
    compute: runChecks,
    readout: (_s, r) => [
      { label: 'Python: what checks.py prints', value: qualityPrintout(r) },
      {
        label: 'Decision',
        value: DECISION_LINE[r.decision],
        status: r.decision === 'stop' ? 'error' : 'ok',
      },
    ],
  };
}
