// A small DAG scheduler with Airflow's semantics: a task is queued when its trigger rule is met, runs in one of a
// fixed number of worker slots, retries after a delay when it fails, and is marked upstream_failed when an upstream
// task failed and its trigger rule is all_success. Discrete-event simulation in whole minutes.

export interface DagTask {
  id: string;
  upstream: string[];
  minutes: number;
  /** Attempt on which the task first succeeds: 1 = first try. 0 = it never succeeds. */
  succeedsOn: number;
  trigger: 'all_success' | 'all_done';
}

export interface DagSettings {
  /** Tasks that may run at the same time (worker slots / pool size). */
  slots: number;
  /** Retries after the first attempt. */
  retries: number;
  retryDelay: number;
}

export type TaskState = 'success' | 'failed' | 'upstream_failed';

export interface Segment {
  task: string;
  attempt: number;
  start: number;
  end: number;
  outcome: 'success' | 'failed' | 'retry';
}

export interface DagResult {
  order: string[];
  segments: Segment[];
  states: Record<string, TaskState>;
  /** When each task ended (or was marked upstream_failed). */
  finished: Record<string, number>;
  makespan: number;
  /** Airflow's rule: failed if any leaf task failed or is upstream_failed, success if every leaf succeeded. */
  dagState: 'success' | 'failed';
}

/** Topological order by Kahn's algorithm, ties broken by the order tasks are listed. Throws on a cycle. */
export function topoOrder(tasks: { id: string; upstream: string[] }[]): string[] {
  const ids = tasks.map((t) => t.id);
  for (const t of tasks) for (const u of t.upstream) if (!ids.includes(u)) throw new Error(`${t.id} depends on unknown task ${u}`);
  const remaining = new Map(tasks.map((t) => [t.id, new Set(t.upstream)]));
  const out: string[] = [];
  while (remaining.size) {
    const next = ids.find((id) => remaining.has(id) && (remaining.get(id) as Set<string>).size === 0);
    if (next === undefined) throw new Error(`cycle among: ${[...remaining.keys()].join(', ')}`);
    out.push(next);
    remaining.delete(next);
    for (const deps of remaining.values()) deps.delete(next);
  }
  return out;
}

/** Tasks nothing depends on. Airflow decides a DAG run's state from these alone. */
export function leaves(tasks: { id: string; upstream: string[] }[]): string[] {
  return tasks.filter((t) => !tasks.some((o) => o.upstream.includes(t.id))).map((t) => t.id);
}

export function scheduleDag(tasks: DagTask[], s: DagSettings): DagResult {
  const order = topoOrder(tasks);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const states: Record<string, TaskState> = {};
  const finished: Record<string, number> = {};
  const attempt = new Map<string, number>();
  const readyAt = new Map<string, number>(); // retry wait
  const running = new Map<string, { end: number; attempt: number; start: number }>();
  const segments: Segment[] = [];
  let t = 0;
  const maxAttempts = s.retries + 1;
  for (let guard = 0; guard < 10_000 && Object.keys(states).length < tasks.length; guard++) {
    // 1. Finish tasks ending now.
    for (const [id, r] of [...running]) {
      if (r.end !== t) continue;
      running.delete(id);
      const task = byId.get(id) as DagTask;
      const ok = task.succeedsOn !== 0 && r.attempt >= task.succeedsOn;
      if (ok) {
        segments.push({ task: id, attempt: r.attempt, start: r.start, end: t, outcome: 'success' });
        states[id] = 'success';
        finished[id] = t;
      } else if (r.attempt < maxAttempts) {
        segments.push({ task: id, attempt: r.attempt, start: r.start, end: t, outcome: 'retry' });
        readyAt.set(id, t + s.retryDelay);
      } else {
        segments.push({ task: id, attempt: r.attempt, start: r.start, end: t, outcome: 'failed' });
        states[id] = 'failed';
        finished[id] = t;
      }
    }
    // 2. Propagate upstream_failed (repeat until stable, in topological order).
    for (const id of order) {
      const task = byId.get(id) as DagTask;
      if (states[id] || running.has(id) || task.trigger !== 'all_success') continue;
      if (task.upstream.some((u) => states[u] === 'failed' || states[u] === 'upstream_failed')) {
        states[id] = 'upstream_failed';
        finished[id] = t;
      }
    }
    // 3. Start ready tasks in topological order while slots are free.
    for (const id of order) {
      if (running.size >= s.slots) break;
      const task = byId.get(id) as DagTask;
      if (states[id] || running.has(id)) continue;
      if ((readyAt.get(id) ?? 0) > t) continue;
      const upDone = task.upstream.every((u) => states[u] !== undefined);
      const upOk = task.upstream.every((u) => states[u] === 'success');
      if (!(task.trigger === 'all_done' ? upDone : upOk)) continue;
      const n = (attempt.get(id) ?? 0) + 1;
      attempt.set(id, n);
      running.set(id, { end: t + task.minutes, attempt: n, start: t });
    }
    if (Object.keys(states).length === tasks.length) break;
    // 4. Advance to the next event.
    const events = [...[...running.values()].map((r) => r.end), ...[...readyAt.values()].filter((x) => x > t)];
    if (!events.length) break;
    t = Math.min(...events);
  }
  const makespan = Math.max(0, ...Object.values(finished));
  return {
    order,
    segments,
    states,
    finished,
    makespan,
    dagState: leaves(tasks).some((id) => states[id] !== 'success') ? 'failed' : 'success',
  };
}
