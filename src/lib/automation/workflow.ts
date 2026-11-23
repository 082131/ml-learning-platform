// How GitHub Actions decides which jobs of a workflow run. Jobs start when every job they need has finished. A
// job's default condition is success(): all its needs succeeded. A job that fails or is skipped makes every job
// that needs it skip too, unless that job's `if:` uses always() (or another status function). An `if:` without a
// status function, such as a branch check, gets success() added implicitly. Workflow-level paths-ignore decides
// whether the workflow runs at all.

export type JobIf = 'success' | 'always' | 'push-main';

export interface Job {
  id: string;
  needs: string[];
  /** Assumed duration in minutes (for the timeline). */
  minutes: number;
  if: JobIf;
}

export type JobStatus = 'success' | 'failure' | 'skipped';

export interface JobRun {
  id: string;
  status: JobStatus;
  start: number;
  end: number;
  why: string;
}

export interface WorkflowInput {
  event: 'pull_request' | 'push-main';
  /** What the change touched. A docs-only change matches paths-ignore. */
  change: 'code' | 'docs-only';
  /** The job whose steps fail, or 'none'. */
  failing: string;
  /** Does the workflow have paths-ignore: ['docs/**', '**.md']? */
  pathsIgnore: boolean;
}

export interface WorkflowResult {
  triggered: boolean;
  jobs: JobRun[];
  /** Minutes from the first job starting to the last one ending. */
  wall: number;
  /** Sum of the minutes of jobs that ran: what the runners bill. */
  billed: number;
  conclusion: 'success' | 'failure' | 'not triggered';
}

/** Kahn's algorithm. Throws on an unknown need or a cycle (GitHub rejects such workflows). */
export function jobOrder(jobs: Job[]): Job[] {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  for (const j of jobs) for (const n of j.needs) if (!byId.has(n)) throw new Error(`${j.id} needs unknown job ${n}`);
  const indeg = new Map(jobs.map((j) => [j.id, j.needs.length]));
  const ready = jobs.filter((j) => j.needs.length === 0).map((j) => j.id);
  const out: Job[] = [];
  while (ready.length) {
    const id = ready.shift() as string;
    out.push(byId.get(id) as Job);
    for (const j of jobs)
      if (j.needs.includes(id)) {
        indeg.set(j.id, (indeg.get(j.id) as number) - 1);
        if (indeg.get(j.id) === 0) ready.push(j.id);
      }
  }
  if (out.length !== jobs.length) throw new Error('the needs form a cycle');
  return out;
}

export function runWorkflow(jobs: Job[], input: WorkflowInput): WorkflowResult {
  if (input.pathsIgnore && input.change === 'docs-only')
    return { triggered: false, jobs: [], wall: 0, billed: 0, conclusion: 'not triggered' };
  const done = new Map<string, JobRun>();
  for (const job of jobOrder(jobs)) {
    const needs = job.needs.map((n) => done.get(n) as JobRun);
    const start = Math.max(0, ...needs.map((n) => n.end));
    const allOk = needs.every((n) => n.status === 'success');
    let run = true;
    let why = 'all needs succeeded';
    if (job.if === 'always') why = 'if: always() runs whatever happened before';
    else if (!allOk) {
      run = false;
      const bad = needs.find((n) => n.status !== 'success') as JobRun;
      why = `${bad.id} ${bad.status === 'failure' ? 'failed' : 'was skipped'}, so success() is false`;
    } else if (job.if === 'push-main' && input.event !== 'push-main') {
      run = false;
      why = 'if: only on a push to main';
    }
    if (!run) {
      done.set(job.id, { id: job.id, status: 'skipped', start, end: start, why });
      continue;
    }
    const failed = input.failing === job.id;
    done.set(job.id, { id: job.id, status: failed ? 'failure' : 'success', start, end: start + job.minutes, why: failed ? 'a step exited with a non-zero code' : why });
  }
  const list = jobs.map((j) => done.get(j.id) as JobRun);
  const ran = list.filter((j) => j.status !== 'skipped');
  return {
    triggered: true,
    jobs: list,
    wall: Math.max(0, ...list.map((j) => j.end)),
    billed: jobs.filter((j) => done.get(j.id)?.status !== 'skipped').reduce((a, j) => a + j.minutes, 0),
    conclusion: ran.some((j) => j.status === 'failure') ? 'failure' : 'success',
  };
}
