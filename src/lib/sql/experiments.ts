// Experiment definitions for the SQL track's visualizations. Logic lives in the pure modules they call.
import type { ExperimentDef } from '../types';
import { fanout, fanoutSql, type FanoutResult, type FanoutState } from './fanout';
import { INDEX_CHOICES, INDEX_QUERIES, PLANS, indexLabSql, whyPlan, type IndexChoice, type IndexLabState, type IndexQuery, type PlanFacts } from './indexlab';
import { CUTOFFS, trainingRows, trainingSql, type TrainingRow, type TrainingSpec } from './mlfeatures';
import { sessionize, sessionsSql, type SessionResult } from './sessions';
import { USER_NAMES, funnel, funnelSql, WINDOW_LABEL, type FunnelResult, type FunnelSpec, type FunnelWindow } from './funnel';
import { joinTables, type FilterPlace, type JoinKind, type JoinResult } from './joins';
import { EMPLOYEES, recurse, type Direction, type RecursionResult } from './recursion';
import { computeWindow, windowSql, type WindowFn, type WindowRow, type WindowSpec } from './window';
import { NULL_CONDITIONS, nullFilter, type NullFilterResult } from './nulls';
import { groupedPipeline, groupedSql, plainPipeline, plainSql, type PipelineState, type Stage } from './pipeline';

export interface PipelineResult {
  stages: Stage[];
  sql: string;
  grouped: boolean;
}

/** The logical-order pipeline. `grouped` adds GROUP BY and HAVING (the aggregation lesson). */
export function pipelineExperiment(id: string, grouped: boolean): ExperimentDef<PipelineState, PipelineResult> {
  return {
    id,
    initial: { minPrice: grouped ? 5 : 10, limit: 2, minCount: 2 },
    controls: [
      { kind: 'slider', id: 'min', label: 'WHERE price >=', min: 0, max: 60, step: 1, get: (s) => s.minPrice, set: (s, v) => ({ ...s, minPrice: v }) },
      grouped
        ? { kind: 'slider', id: 'having', label: 'HAVING COUNT(*) >=', min: 1, max: 3, step: 1, get: (s) => s.minCount, set: (s, v) => ({ ...s, minCount: v }) }
        : { kind: 'slider', id: 'limit', label: 'LIMIT', min: 1, max: 7, step: 1, get: (s) => s.limit, set: (s, v) => ({ ...s, limit: v }) },
    ],
    compute: (s) => ({ stages: grouped ? groupedPipeline(s) : plainPipeline(s), sql: grouped ? groupedSql(s) : plainSql(s), grouped }),
    readout: (_s, r) => r.stages.map((st) => ({ label: `Rows after ${st.clause}`, value: String(st.out) })),
  };
}

export function nullExperiment(id: string): ExperimentDef<{ condition: string }, NullFilterResult> {
  return {
    id,
    initial: { condition: 'ne' },
    controls: [
      {
        kind: 'select',
        id: 'condition',
        label: 'WHERE',
        options: NULL_CONDITIONS.map((c) => ({ value: c.id, label: c.sql })),
        get: (s) => s.condition,
        set: (_s, v) => ({ condition: v }),
      },
    ],
    compute: (s) => nullFilter(s.condition),
    readout: (_s, r) => [
      { label: 'Rows kept (TRUE)', value: `${r.kept} of ${r.rows.length}` },
      { label: 'Rows where the test is UNKNOWN', value: String(r.unknown), status: r.unknown ? 'error' : 'ok' },
    ],
  };
}

export interface JoinLabState {
  kind: JoinKind;
  place: FilterPlace;
}

export function joinExperimentSql(id: string): ExperimentDef<JoinLabState, JoinResult> {
  return {
    id,
    initial: { kind: 'left', place: 'none' },
    controls: [
      {
        kind: 'select',
        id: 'kind',
        label: 'Join type',
        options: [
          { value: 'inner', label: 'INNER JOIN' },
          { value: 'left', label: 'LEFT JOIN' },
          { value: 'right', label: 'RIGHT JOIN' },
          { value: 'full', label: 'FULL JOIN' },
        ],
        get: (s) => s.kind,
        set: (s, v) => ({ ...s, kind: v as JoinKind }),
      },
      {
        kind: 'select',
        id: 'place',
        label: "status = 'shipped' goes in",
        options: [
          { value: 'none', label: 'nowhere (no filter)' },
          { value: 'on', label: 'the ON clause' },
          { value: 'where', label: 'the WHERE clause' },
        ],
        get: (s) => s.place,
        set: (s, v) => ({ ...s, place: v as FilterPlace }),
      },
    ],
    compute: (s) => joinTables(s.kind, s.place),
    readout: (_s, r) => [
      { label: 'Result rows', value: String(r.rows.length) },
      { label: 'Matched customer-order pairs', value: String(r.matchedPairs) },
      { label: 'Kept with no match (NULL-padded)', value: String(r.keptCustomersWithoutMatch + r.keptOrdersWithoutMatch) },
      { label: 'Removed afterwards by WHERE', value: String(r.removedByWhere), status: r.removedByWhere ? 'error' : 'ok' },
    ],
  };
}

export function fanoutExperiment(id: string): ExperimentDef<FanoutState, FanoutResult & { sql: string }> {
  return {
    id,
    initial: { items: 2, payments: 2, method: 'join-both' },
    controls: [
      { kind: 'slider', id: 'items', label: 'Items in the order', min: 1, max: 4, step: 1, get: (s) => s.items, set: (s, v) => ({ ...s, items: v }) },
      { kind: 'slider', id: 'payments', label: 'Payments for the order', min: 1, max: 4, step: 1, get: (s) => s.payments, set: (s, v) => ({ ...s, payments: v }) },
      {
        kind: 'select',
        id: 'method',
        label: 'Query',
        options: [
          { value: 'join-both', label: 'join items and payments, then SUM' },
          { value: 'pre-aggregate', label: 'SUM each side first, then join' },
        ],
        get: (s) => s.method,
        set: (s, v) => ({ ...s, method: v as FanoutState['method'] }),
      },
    ],
    compute: (s) => ({ ...fanout(s), sql: fanoutSql(s) }),
    readout: (_s, r) => [
      { label: 'Rows after the joins', value: String(r.pairs.length) },
      { label: 'items_total reported (true)', value: `${r.reportedItems} (${r.trueItems})`, status: r.reportedItems === r.trueItems ? 'ok' : 'error' },
      { label: 'paid reported (true)', value: `${r.reportedPaid} (${r.truePaid})`, status: r.reportedPaid === r.truePaid ? 'ok' : 'error' },
    ],
  };
}

export function recursionExperiment(id: string): ExperimentDef<{ start: string; dir: Direction }, RecursionResult> {
  return {
    id,
    initial: { start: 'Rosa', dir: 'down' },
    controls: [
      { kind: 'select', id: 'start', label: 'Anchor (start from)', options: EMPLOYEES.map((e) => ({ value: e.name, label: e.name })), get: (s) => s.start, set: (s, v) => ({ ...s, start: v }) },
      {
        kind: 'select',
        id: 'dir',
        label: 'Step',
        options: [
          { value: 'down', label: 'down: people who report to the last rows' },
          { value: 'up', label: 'up: the manager of the last rows' },
        ],
        get: (s) => s.dir,
        set: (s, v) => ({ ...s, dir: v as Direction }),
      },
    ],
    compute: (s) => recurse(s.start, s.dir),
    readout: (_s, r) => [
      { label: 'Iterations (including the empty last one)', value: String(r.iterations.length) },
      { label: 'Rows in the result', value: String(r.total) },
    ],
  };
}

export interface WindowResult {
  rows: WindowRow[];
  sql: string;
  spec: WindowSpec;
}

const FN_LABEL: Record<WindowFn, string> = {
  row_number: 'ROW_NUMBER()',
  rank: 'RANK()',
  dense_rank: 'DENSE_RANK()',
  partition_sum: 'SUM(total) per partition',
  running_sum: 'running SUM(total)',
  moving_avg: 'moving AVG(total)',
  lag: 'LAG(total)',
  lead: 'LEAD(total)',
};

/** `ranking`: ranking functions ordered by total. `frames`: running sums, moving averages, LAG and LEAD in time order. */
export function windowExperiment(id: string, mode: 'ranking' | 'frames'): ExperimentDef<WindowSpec, WindowResult> {
  const fns: WindowFn[] = mode === 'ranking' ? ['row_number', 'rank', 'dense_rank', 'partition_sum'] : ['running_sum', 'moving_avg', 'lag', 'lead'];
  const controls: ExperimentDef<WindowSpec, WindowResult>['controls'] = [
    { kind: 'select', id: 'fn', label: 'Function', options: fns.map((f) => ({ value: f, label: FN_LABEL[f] })), get: (s) => s.fn, set: (s, v) => ({ ...s, fn: v as WindowFn }) },
    {
      kind: 'select',
      id: 'partition',
      label: 'PARTITION BY',
      options: [
        { value: 'none', label: '(none: one window for all rows)' },
        { value: 'month', label: 'month' },
      ],
      get: (s) => s.partition,
      set: (s, v) => ({ ...s, partition: v as WindowSpec['partition'] }),
    },
  ];
  if (mode === 'frames')
    controls.push(
      {
        kind: 'select',
        id: 'order',
        label: 'ORDER BY',
        options: [
          { value: 'order_date', label: 'order_date (every value different)' },
          { value: 'month', label: 'month (ties within a month)' },
        ],
        get: (s) => s.orderKey,
        set: (s, v) => ({ ...s, orderKey: v as WindowSpec['orderKey'] }),
      },
      {
        kind: 'select',
        id: 'frame',
        label: 'Running sum frame',
        options: [
          { value: 'range', label: 'RANGE (the default: ties count together)' },
          { value: 'rows', label: 'ROWS (one row at a time)' },
        ],
        get: (s) => s.frame,
        set: (s, v) => ({ ...s, frame: v as WindowSpec['frame'] }),
      },
      { kind: 'slider', id: 'preceding', label: 'Moving average: n PRECEDING', min: 1, max: 3, step: 1, get: (s) => s.preceding, set: (s, v) => ({ ...s, preceding: v }) },
    );
  return {
    id,
    initial: mode === 'ranking' ? { fn: 'rank', partition: 'none', orderKey: 'total', frame: 'range', preceding: 2 } : { fn: 'running_sum', partition: 'none', orderKey: 'order_date', frame: 'range', preceding: 2 },
    controls,
    compute: (s) => ({ rows: computeWindow(s), sql: windowSql(s), spec: s }),
    readout: (_s, r) => [
      { label: 'Rows in and rows out', value: `${r.rows.length} and ${r.rows.length}` },
      { label: 'Partitions', value: String(new Set(r.rows.map((x) => x.partitionKey)).size) },
      { label: 'NULL values (no row to look at)', value: String(r.rows.filter((x) => x.value === null).length) },
    ],
  };
}

export type FunnelLabResult = FunnelResult & { sql: string };

/** The purchase funnel of the event log under different definitions (time window, users or events). */
export function funnelExperiment(id: string): ExperimentDef<FunnelSpec, FunnelLabResult> {
  return {
    id,
    initial: { window: '7d', count: 'users' },
    controls: [
      {
        kind: 'select',
        id: 'count',
        label: 'Count',
        options: [
          { value: 'users', label: 'users who reached each step, in order' },
          { value: 'events', label: 'event rows (no order, no time limit)' },
        ],
        get: (s) => s.count,
        set: (s, v) => ({ ...s, count: v as FunnelSpec['count'] }),
      },
      {
        kind: 'select',
        id: 'window',
        label: 'Within ... of the first visit',
        options: (Object.keys(WINDOW_LABEL) as FunnelWindow[]).map((w) => ({ value: w, label: WINDOW_LABEL[w] })),
        get: (s) => s.window,
        set: (s, v) => ({ ...s, window: v as FunnelWindow }),
      },
    ],
    compute: (s) => ({ ...funnel(s), sql: funnelSql(s) }),
    readout: (s, r) => [
      { label: 'Definition', value: s.count === 'users' ? `users, in order, within ${WINDOW_LABEL[s.window]}` : 'event rows' },
      { label: 'visit to purchase', value: `${r.steps[4]!.value} of ${r.steps[0]!.value} = ${r.steps[4]!.pctFirst}%` },
      { label: 'Biggest drop', value: (() => { const w = r.steps.slice(1).reduce((a, b) => ((b.pctPrevious ?? 100) < (a.pctPrevious ?? 100) ? b : a)); return `into ${w.step} (${w.pctPrevious}% of previous)`; })() },
    ],
  };
}

export interface SessionLabState {
  timeout: number;
  user: number;
}
export type SessionLabResult = SessionResult & { sql: string };

/** Sessions of the event log for an inactivity timeout, with one user's events shown in detail. */
export function sessionExperiment(id: string): ExperimentDef<SessionLabState, SessionLabResult> {
  return {
    id,
    initial: { timeout: 30, user: 1 },
    controls: [
      { kind: 'slider', id: 'timeout', label: 'New session after a gap of more than (minutes)', min: 1, max: 60, step: 1, get: (s) => s.timeout, set: (s, v) => ({ ...s, timeout: v }) },
      {
        kind: 'select',
        id: 'user',
        label: 'Show events of',
        options: Object.entries(USER_NAMES).map(([v, label]) => ({ value: v, label })),
        get: (s) => String(s.user),
        set: (s, v) => ({ ...s, user: Number(v) }),
      },
    ],
    compute: (s) => ({ ...sessionize(s.timeout), sql: sessionsSql(s.timeout) }),
    readout: (_s, r) => [
      { label: 'Sessions (from 74 events)', value: String(r.totalSessions) },
      { label: 'Sessions with a purchase', value: `${r.purchaseSessions} (${r.conversion}%)` },
      { label: 'Abandoned carts (cart, no purchase)', value: String(r.abandonedCarts) },
    ],
  };
}

export interface TrainingLabResult {
  rows: TrainingRow[];
  sql: string;
}

/** A training table at one cutoff, with point-in-time or leaky features. */
export function trainingExperiment(id: string): ExperimentDef<TrainingSpec, TrainingLabResult> {
  return {
    id,
    initial: { cutoff: '2026-02-01', features: 'leaky' },
    controls: [
      { kind: 'select', id: 'cutoff', label: 'Cutoff (predict from this date)', options: CUTOFFS.map((c) => ({ value: c, label: c })), get: (s) => s.cutoff, set: (s, v) => ({ ...s, cutoff: v as TrainingSpec['cutoff'] }) },
      {
        kind: 'select',
        id: 'features',
        label: 'Features use',
        options: [
          { value: 'leaky', label: 'all orders (no date filter)' },
          { value: 'point-in-time', label: 'orders before the cutoff only' },
        ],
        get: (s) => s.features,
        set: (s, v) => ({ ...s, features: v as TrainingSpec['features'] }),
      },
    ],
    compute: (s) => ({ rows: trainingRows(s), sql: trainingSql(s) }),
    readout: (_s, r) => {
      const leaked = r.rows.reduce((a, x) => a + Number(x.leaked.orders) + Number(x.leaked.spend) + Number(x.leaked.days), 0);
      const inside = r.rows.filter((x) => x.labelInFeatures).length;
      return [
        { label: 'Training rows (customers who existed)', value: String(r.rows.length) },
        { label: 'Positive labels', value: `${r.rows.filter((x) => x.label === 1).length} of ${r.rows.length}` },
        { label: 'Feature values that used the future', value: String(leaked), status: leaked ? 'error' : 'ok' },
        { label: 'Rows whose features contain the labelled order', value: String(inside), status: inside ? 'error' : 'ok' },
      ];
    },
  };
}

export type IndexLabResult = PlanFacts & { sql: string; why: string };

/** EXPLAIN QUERY PLAN and rows read for a query on big_orders under one index choice. */
export function indexExperiment(id: string): ExperimentDef<IndexLabState, IndexLabResult> {
  return {
    id,
    initial: { query: 'customer', index: 'none' },
    controls: [
      { kind: 'select', id: 'query', label: 'Query', options: (Object.keys(INDEX_QUERIES) as IndexQuery[]).map((q) => ({ value: q, label: INDEX_QUERIES[q].label })), get: (s) => s.query, set: (s, v) => ({ ...s, query: v as IndexQuery }) },
      { kind: 'select', id: 'index', label: 'Index on big_orders', options: (Object.keys(INDEX_CHOICES) as IndexChoice[]).map((i) => ({ value: i, label: INDEX_CHOICES[i].label })), get: (s) => s.index, set: (s, v) => ({ ...s, index: v as IndexChoice }) },
    ],
    compute: (s) => ({ ...PLANS[s.query][s.index], sql: indexLabSql(s), why: whyPlan(s) }),
    readout: (_s, r) => [
      { label: 'Plan', value: r.plan.startsWith('SCAN') ? 'SCAN (read everything)' : r.fetched === 0 ? 'SEARCH, covering index' : 'SEARCH with index' },
      { label: 'Entries read', value: r.entries.toLocaleString('en') },
      { label: 'Table rows looked up', value: r.fetched.toLocaleString('en') },
      { label: 'Rows matching', value: r.matching.toLocaleString('en') },
    ],
  };
}
