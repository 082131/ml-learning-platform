/**
 * The orchestration lesson's pipeline DAG, run by a tiny scheduler: tasks start when their upstream tasks
 * finish, a chosen task fails a chosen number of times, failed attempts are retried after a delay that
 * doubles each time, and tasks downstream of a failure are marked upstream_failed (except notify, whose
 * trigger rule is all_done). dag.test.ts checks every setting against DAG_SOURCE run with CPython 3.13.
 */
import type { FlowEdge, FlowNode, NodeStatus } from '../viz/flow';
import type { ExperimentDef } from '../types';

export interface TaskDef {
  name: string;
  minutes: number;
  upstream: string[];
}

export const TASKS: TaskDef[] = [
  { name: 'extract_orders', minutes: 2, upstream: [] },
  { name: 'extract_customers', minutes: 1, upstream: [] },
  { name: 'validate', minutes: 1, upstream: ['extract_orders', 'extract_customers'] },
  { name: 'transform', minutes: 3, upstream: ['validate'] },
  { name: 'load_warehouse', minutes: 2, upstream: ['transform'] },
  { name: 'report', minutes: 1, upstream: ['load_warehouse'] },
  { name: 'features', minutes: 2, upstream: ['load_warehouse'] },
  { name: 'notify', minutes: 1, upstream: ['report', 'features'] },
];
export const ALL_DONE = new Set(['notify']);
export const RETRY_DELAY = 1;
export const RETRIES_MAX = 3;
/** Tasks the learner can make fail (notify is the alerting step). */
export const FAILABLE = TASKS.map((t) => t.name).filter((n) => n !== 'notify');

export interface DagState {
  failing: string;
  fails: number;
  retries: number;
}

export type TaskState = 'success' | 'failed' | 'upstream_failed';

export interface Attempt {
  start: number;
  end: number;
  ok: boolean;
  /** Minutes waited after this attempt before the next one (0 after the last). */
  wait: number;
}

export interface TaskRun {
  name: string;
  state: TaskState;
  start: number;
  end: number;
  attempts: Attempt[];
}

export interface DagRun {
  tasks: TaskRun[];
  finishedAt: number;
}

export function runDag({ failing, fails, retries }: DagState): DagRun {
  const byName = new Map<string, TaskRun>();
  const tasks: TaskRun[] = [];
  for (const def of TASKS) {
    const ups = def.upstream.map((u) => byName.get(u)!);
    let t = Math.max(0, ...ups.map((u) => u.end));
    let run: TaskRun;
    if (!ALL_DONE.has(def.name) && ups.some((u) => u.state !== 'success')) {
      run = { name: def.name, state: 'upstream_failed', start: t, end: t, attempts: [] };
    } else {
      const start = t;
      const attempts: Attempt[] = [];
      let state: TaskState = 'failed';
      for (let attempt = 0; attempt <= retries; attempt++) {
        const a = { start: t, end: t + def.minutes, ok: false, wait: 0 };
        t += def.minutes;
        attempts.push(a);
        if (!(def.name === failing && attempt < fails)) {
          a.ok = true;
          state = 'success';
          break;
        }
        if (attempt < retries) {
          a.wait = RETRY_DELAY * 2 ** attempt;
          t += a.wait;
        }
      }
      run = { name: def.name, state, start, end: t, attempts };
    }
    byName.set(def.name, run);
    tasks.push(run);
  }
  return { tasks, finishedAt: Math.max(...tasks.map((r) => r.end)) };
}

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
const padStart = (v: number, n: number) => String(v).padStart(n, ' ');

/** What DAG_SOURCE prints. */
export function dagPrintout(r: DagRun): string {
  return [
    ...r.tasks.map((t) =>
      t.state === 'upstream_failed'
        ? `${pad(t.name, 18)} upstream_failed`
        : `${pad(t.name, 18)} ${pad(t.state, 8)} attempts=${t.attempts.length} start=${padStart(t.start, 2)} end=${padStart(t.end, 2)}`,
    ),
    `run finished at minute ${r.finishedAt}`,
  ].join('\n');
}

const POS: Record<string, [number, number]> = {
  extract_orders: [0, 0],
  extract_customers: [0, 96],
  validate: [200, 48],
  transform: [380, 48],
  load_warehouse: [560, 48],
  report: [760, 0],
  features: [760, 96],
  notify: [940, 48],
};
const NODE_STATUS: Record<TaskState, NodeStatus> = {
  success: 'ok',
  failed: 'error',
  upstream_failed: 'warn',
};

export function dagDiagram(r: DagRun): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes = r.tasks.map((t) => ({
    id: t.name,
    label: t.name,
    x: POS[t.name]![0],
    y: POS[t.name]![1],
    w: 160,
    detail:
      t.state === 'upstream_failed'
        ? 'upstream failed'
        : `${t.state}, ${t.attempts.length} attempt${t.attempts.length === 1 ? '' : 's'}`,
    status: NODE_STATUS[t.state],
  }));
  const edges = TASKS.flatMap((d) => d.upstream.map((u) => ({ from: u, to: d.name })));
  return { nodes, edges };
}

export const DAG_SOURCE = `TASKS = {  # name: (minutes it runs, upstream tasks), listed in dependency order
    "extract_orders": (2, []),
    "extract_customers": (1, []),
    "validate": (1, ["extract_orders", "extract_customers"]),
    "transform": (3, ["validate"]),
    "load_warehouse": (2, ["transform"]),
    "report": (1, ["load_warehouse"]),
    "features": (2, ["load_warehouse"]),
    "notify": (1, ["report", "features"]),
}
ALL_DONE = {"notify"}  # runs once its upstream tasks finish, whether they succeeded or not
RETRIES = {{retries}}
RETRY_DELAY = 1  # minutes; doubles after each failed attempt
FAILING = "{{failing}}"  # this task fails its first FAILS attempts
FAILS = {{fails}}

state, end = {}, {}
for name, (minutes, upstream) in TASKS.items():
    t = max((end[u] for u in upstream), default=0)
    if name not in ALL_DONE and any(state[u] != "success" for u in upstream):
        state[name], end[name] = "upstream_failed", t
        print(f"{name:<18} upstream_failed")
        continue
    start = t
    for attempt in range(RETRIES + 1):
        t += minutes
        if not (name == FAILING and attempt < FAILS):
            state[name] = "success"
            break
        if attempt < RETRIES:
            t += RETRY_DELAY * 2 ** attempt
    else:
        state[name] = "failed"
    end[name] = t
    print(f"{name:<18} {state[name]:<8} attempts={attempt + 1} start={start:>2} end={t:>2}")

print("run finished at minute", max(end.values()))`;

export const dagSlots = (s: DagState) => ({
  retries: String(s.retries),
  failing: s.failing,
  fails: String(s.fails),
});

export function dagExperiment(id: string): ExperimentDef<DagState, DagRun> {
  return {
    id,
    initial: { failing: 'transform', fails: 2, retries: 1 },
    controls: [
      {
        kind: 'select',
        id: 'failing',
        label: 'Task that fails',
        options: [{ value: 'none', label: 'None' }, ...FAILABLE.map((n) => ({ value: n, label: n }))],
        get: (s) => s.failing,
        set: (s, v) => ({ ...s, failing: v }),
      },
      {
        kind: 'select',
        id: 'fails',
        label: 'How often it fails',
        options: [
          { value: '1', label: 'Its first attempt only' },
          { value: '2', label: 'Its first 2 attempts' },
          { value: '3', label: 'Its first 3 attempts' },
          { value: '4', label: 'Every attempt (a real bug)' },
        ],
        get: (s) => String(s.fails),
        set: (s, v) => ({ ...s, fails: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'retries',
        label: 'Retries per task',
        min: 0,
        max: RETRIES_MAX,
        get: (s) => s.retries,
        set: (s, v) => ({ ...s, retries: v }),
      },
    ],
    compute: runDag,
    readout: (_s, r) => {
      const count = (st: TaskState) => r.tasks.filter((t) => t.state === st).length;
      return [
        { label: 'Python: what scheduler.py prints', value: dagPrintout(r) },
        {
          label: 'Run result',
          value: `${count('success')} succeeded, ${count('failed')} failed, ${count('upstream_failed')} not run (upstream failed); finished at minute ${r.finishedAt}`,
          status: count('failed') ? 'error' : 'ok',
        },
      ];
    },
  };
}
