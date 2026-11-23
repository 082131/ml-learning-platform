// Which scheduled runs a pipeline scheduler creates when a DAG is switched on, following Airflow 3's two cron
// timetables (Airflow 3.4 docs, "Timetables" and "Dag Runs"):
// - trigger timetable (CronTriggerTimetable, the Airflow 3 default): a run at each tick; logical date = the tick;
//   the data interval is the single point (tick, tick).
// - data-interval timetable (CronDataIntervalTimetable, the Airflow 2 default): a run per completed interval
//   [start, end); it is triggered at the interval's end; logical date = the interval's start.
// With catchup=True the scheduler creates every run since start_date; with catchup=False (the default) only the
// most recent tick, or the most recently completed interval.

export type Timetable = 'trigger' | 'interval';

export interface IntervalInput {
  timetable: Timetable;
  every: 'hour' | 'day';
  /** Milliseconds since the epoch, UTC. Aligned to the schedule. */
  startDate: number;
  now: number;
  catchup: boolean;
  /** At most this many runs at once (max_active_runs); later ones queue. */
  maxActiveRuns: number;
}

export interface DagRunInfo {
  logicalDate: number;
  intervalStart: number;
  intervalEnd: number;
  /** When the scheduler may start the run (run_after). */
  runAfter: number;
  /** 0-based wave: runs in the same wave execute at the same time under max_active_runs. */
  wave: number;
}

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
/** Safety limit on how many runs a view lists. */
export const MAX_RUNS = 400;

export function dagRuns(i: IntervalInput): DagRunInfo[] {
  const step = i.every === 'hour' ? HOUR_MS : DAY_MS;
  const all: Omit<DagRunInfo, 'wave'>[] = [];
  for (let s = i.startDate; all.length < MAX_RUNS; s += step) {
    if (i.timetable === 'trigger') {
      if (s > i.now) break;
      all.push({ logicalDate: s, intervalStart: s, intervalEnd: s, runAfter: s });
    } else {
      if (s + step > i.now) break;
      all.push({ logicalDate: s, intervalStart: s, intervalEnd: s + step, runAfter: s + step });
    }
  }
  const chosen = i.catchup ? all : all.slice(-1);
  return chosen.map((r, k) => ({ ...r, wave: Math.floor(k / Math.max(1, i.maxActiveRuns)) }));
}

const pad = (n: number) => String(n).padStart(2, '0');
/** "2026-11-21 00:00" (UTC). */
export function fmt(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
