// Runs SQL jobs one at a time in a worker, with a watchdog: a query that never ends (a recursive CTE without a
// stop condition, a huge cross join) is stopped, and the next job gets a fresh worker.
import { SQL_TIMEOUT_MS, type SqlJob, type SqlWorkerMessage, type SqlWorkerRequest } from './protocol';
import type { SqlCheck, SqlGradeResult, SqlRunResult } from './types';

export interface SqlWorkerLike {
  postMessage(message: SqlWorkerRequest): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<SqlWorkerMessage>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

export interface SqlRunner {
  run(setup: string, code: string, maxRows?: number): Promise<SqlRunResult>;
  grade(setup: string, code: string, checks: SqlCheck[]): Promise<SqlGradeResult>;
}

type Outcome = { kind: 'run'; result: SqlRunResult } | { kind: 'grade'; result: SqlGradeResult };

const stopped = (timeoutMs: number) =>
  `Stopped after ${timeoutMs / 1000} seconds. The query may never finish (for example a recursive CTE with no stop condition), so the database was restarted.`;

export function createSqlRunner(createWorker: () => SqlWorkerLike, timeoutMs = SQL_TIMEOUT_MS): SqlRunner {
  let worker: SqlWorkerLike | null = null;
  let nextId = 1;
  let queue: Promise<unknown> = Promise.resolve();

  const failed = (job: SqlJob, status: 'timeout' | 'load-failed', message: string): Outcome =>
    job.kind === 'run'
      ? { kind: 'run', result: { status, statements: [], message } }
      : { kind: 'grade', result: { status, message, checks: job.checks.map((c) => ({ name: c.name, ok: false, why: message })) } };

  const execute = (job: SqlJob) =>
    new Promise<Outcome>((resolve) => {
      const id = nextId++;
      const w = (worker ??= createWorker());
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (outcome: Outcome, kill = false) => {
        clearTimeout(timer);
        w.onmessage = null;
        w.onerror = null;
        if (kill) {
          w.terminate();
          if (worker === w) worker = null;
        }
        resolve(outcome);
      };
      w.onmessage = ({ data }) => {
        if (data.id !== id) return;
        if (data.type === 'running') timer = setTimeout(() => finish(failed(job, 'timeout', stopped(timeoutMs)), true), timeoutMs);
        else if (data.type === 'load-failed') finish(failed(job, 'load-failed', data.error), true);
        else if (data.type === 'run') finish({ kind: 'run', result: data.result });
        else finish({ kind: 'grade', result: data.result });
      };
      w.onerror = (e) => finish(failed(job, 'load-failed', e.message || 'The SQL worker failed to start.'), true);
      w.postMessage({ id, ...job });
    });

  const enqueue = (job: SqlJob) => {
    const next = queue.then(() => execute(job));
    queue = next;
    return next;
  };

  return {
    run: async (setup, code, maxRows) => ((await enqueue({ kind: 'run', setup, code, maxRows })) as { result: SqlRunResult }).result,
    grade: async (setup, code, checks) => ((await enqueue({ kind: 'grade', setup, code, checks })) as { result: SqlGradeResult }).result,
  };
}
