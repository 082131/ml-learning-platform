// Experiment definitions for the Automation track. The logic lives in the modules they import, each unit-tested in
// automation.test.ts.
import type { ExperimentDef } from '../types';
import { runAgent, type AgentPolicy, type AgentRun, type Autonomy } from './agent';
import { describeField, formatUtc, nextRuns, parseCron, type CronParse } from './cron';
import { scheduleDag, type DagResult, type DagTask } from './dag';
import { evaluateGates, type GateInput, type GateResult } from './gates';
import { DAY_MS, dagRuns, fmt, HOUR_MS, type DagRunInfo, type Timetable } from './intervals';
import { planMoves, type Plan, type Rule } from './organize';
import { simulateRerun, type RerunResult, type WriteStrategy } from './rerun';
import { herd, simulateRetries, type RetryPolicy, type RetryRun, type ServerReply, type Strategy } from './retry';
import { signatureHeader, simulateDeliveries, verifySignature, type DeliveryInput, type DeliveryResult } from './webhook';
import { runWorkflow, type Job, type WorkflowInput, type WorkflowResult } from './workflow';
import { worthIt, type WorthInput, type WorthResult } from './worth';

const yesNo = [
  { value: 'yes', label: 'yes' },
  { value: 'no', label: 'no' },
];
const opts = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- is it worth automating? ----------

export function worthExperiment(id: string): ExperimentDef<WorthInput, WorthResult> {
  return {
    id,
    initial: { manualMinutes: 20, automatedMinutes: 2, runsPerWeek: 5, buildHours: 12, maintainHoursPerMonth: 1.5, horizonMonths: 12 },
    controls: [
      { kind: 'slider', id: 'manual', label: 'Manual minutes per run', min: 1, max: 120, step: 1, get: (s) => s.manualMinutes, set: (s, v) => ({ ...s, manualMinutes: v }) },
      { kind: 'slider', id: 'auto', label: 'Minutes still spent per automated run', min: 0, max: 30, step: 1, get: (s) => s.automatedMinutes, set: (s, v) => ({ ...s, automatedMinutes: v }) },
      { kind: 'slider', id: 'runs', label: 'Runs per week', min: 0.25, max: 35, step: 0.25, get: (s) => s.runsPerWeek, set: (s, v) => ({ ...s, runsPerWeek: v }) },
      { kind: 'slider', id: 'build', label: 'Hours to build', min: 1, max: 80, step: 1, get: (s) => s.buildHours, set: (s, v) => ({ ...s, buildHours: v }) },
      { kind: 'slider', id: 'maintain', label: 'Maintenance hours per month', min: 0, max: 10, step: 0.5, get: (s) => s.maintainHoursPerMonth, set: (s, v) => ({ ...s, maintainHoursPerMonth: v }) },
    ],
    compute: worthIt,
    readout: (_s, r) => [
      { label: 'Saved per month', value: `${r.savedPerMonth} h` },
      { label: 'Net per month (after maintenance)', value: `${r.netPerMonth} h`, status: r.netPerMonth > 0 ? 'ok' : 'error' },
      { label: 'Pays back', value: r.breakEvenMonth === null ? 'not within 12 months' : `in month ${r.breakEvenMonth}`, status: r.breakEvenMonth === null ? 'error' : 'ok' },
      { label: 'Net after 12 months', value: `${r.totalNet} h` },
    ],
  };
}

// ---------- file organizer dry run ----------

export const ORGANIZE_RULES: Rule[] = [
  { extensions: ['csv', 'parquet'], folder: 'data' },
  { extensions: ['ipynb', 'py'], folder: 'code' },
  { extensions: ['png', 'jpg'], folder: 'figures' },
];

export const DOWNLOADS: Record<string, string[]> = {
  messy: ['sales_2026-11.csv', 'churn.ipynb', 'loss_curve.png', 'README.txt', 'train.py', 'events.parquet', 'data/old_sales.csv'],
  clash: ['sales.csv', 'data/sales.csv', 'plot.PNG', 'figures/plot.PNG', 'model.py'],
};

export interface OrganizeState {
  folder: 'messy' | 'clash' | 'after';
  overwrite: boolean;
}

export function organizeExperiment(id: string): ExperimentDef<OrganizeState, Plan & { files: string[] }> {
  return {
    id,
    initial: { folder: 'messy', overwrite: false },
    controls: [
      {
        kind: 'select',
        id: 'folder',
        label: 'Folder',
        options: opts([
          ['messy', 'Downloads, first run'],
          ['after', 'Downloads, second run (after the first)'],
          ['clash', 'Downloads with name clashes'],
        ]),
        get: (s) => s.folder,
        set: (s, v) => ({ ...s, folder: v as OrganizeState['folder'] }),
      },
      { kind: 'select', id: 'overwrite', label: 'Overwrite existing files', options: yesNo, get: (s) => (s.overwrite ? 'yes' : 'no'), set: (s, v) => ({ ...s, overwrite: v === 'yes' }) },
    ],
    compute: (s) => {
      const files = s.folder === 'after' ? planMoves(DOWNLOADS.messy!, ORGANIZE_RULES).after : DOWNLOADS[s.folder]!;
      return { ...planMoves(files, ORGANIZE_RULES, s.overwrite), files };
    },
    readout: (_s, r) => [
      { label: 'Moves', value: String(r.moves) },
      { label: 'Conflicts (left alone)', value: String(r.conflicts) },
      { label: 'Files destroyed', value: String(r.lost), status: r.lost ? 'error' : 'ok' },
    ],
  };
}

// ---------- cron ----------

export const CRON_PRESETS: [string, string][] = [
  ['0 2 * * *', 'every day at 02:00'],
  ['*/15 9-17 * * 1-5', 'every 15 min, 9:00 to 17:45, Mon to Fri'],
  ['0 6 * * MON', 'Mondays at 06:00'],
  ['30 6 1,15 * *', '1st and 15th of the month, 06:30'],
  ['0 0 13 * 5', 'the 13th, and also every Friday'],
  ['0 0 */2 * 1', 'odd days that are Mondays (the * rule)'],
  ['@hourly', '@hourly'],
  ['0 0 30 2 *', 'February 30th (never)'],
];

export interface CronState {
  expr: string;
}

export interface CronResult {
  parse: CronParse;
  runs: string[];
  fields: string[];
}

/** The fixed "now" the explorer counts from, so the lesson's numbers stay the same for every reader. */
export const CRON_NOW = new Date(Date.UTC(2026, 10, 23, 14, 0));

export function cronResult(expr: string): CronResult {
  const parse = parseCron(expr);
  if (!parse.ok) return { parse, runs: [], fields: [] };
  return { parse, runs: nextRuns(parse.spec, CRON_NOW, 6).map(formatUtc), fields: parse.spec.fields.map(describeField) };
}

export function cronExperiment(id: string): ExperimentDef<CronState, CronResult> {
  return {
    id,
    initial: { expr: '0 2 * * *' },
    controls: [
      { kind: 'select', id: 'preset', label: 'Preset', options: [...CRON_PRESETS.map(([v, l]) => ({ value: v, label: `${v}  (${l})` })), { value: 'custom', label: 'custom (type below)' }], get: (s) => (CRON_PRESETS.some(([v]) => v === s.expr) ? s.expr : 'custom'), set: (s, v) => (v === 'custom' ? s : { ...s, expr: v }) },
      { kind: 'text', id: 'expr', label: 'Cron expression', maxLength: 60, get: (s) => s.expr, set: (s, v) => ({ ...s, expr: v }) },
    ],
    compute: (s) => cronResult(s.expr),
    readout: (_s, r) =>
      r.parse.ok
        ? [
            { label: 'Next run (UTC)', value: r.runs[0] ?? 'never within 5 years', status: r.runs.length ? 'ok' : 'error' },
            { label: 'Day rule', value: r.parse.spec.dayOr ? 'day of month OR day of week' : 'day of month AND day of week' },
          ]
        : [{ label: 'Error', value: r.parse.error, status: 'error' }],
  };
}

// ---------- retries ----------

export const REPLY_SCRIPTS: Record<string, { label: string; replies: ServerReply[] }> = {
  blip: { label: '503, 503, then 200', replies: [{ status: 503 }, { status: 503 }, { status: 200 }] },
  ratelimit: { label: '429 with Retry-After: 8, then 200', replies: [{ status: 429, retryAfter: 8 }, { status: 200 }] },
  outage: { label: 'down for good (500 forever)', replies: [{ status: 500 }] },
  bad: { label: '400 Bad Request', replies: [{ status: 400 }] },
  slow: { label: 'five 502s, then 200', replies: [{ status: 502 }, { status: 502 }, { status: 502 }, { status: 502 }, { status: 502 }, { status: 200 }] },
};

export interface RetryState extends RetryPolicy {
  script: string;
  seed: number;
}

export interface RetryResult {
  run: RetryRun;
  herd: number[];
}

export const HERD_CLIENTS = 200;
export const HERD_SECONDS = 20;

export function retryExperiment(id: string): ExperimentDef<RetryState, RetryResult> {
  return {
    id,
    initial: { strategy: 'exponential', base: 1, cap: 30, maxAttempts: 5, respectRetryAfter: true, script: 'blip', seed: 1 },
    controls: [
      { kind: 'select', id: 'script', label: 'Server behaviour', options: Object.entries(REPLY_SCRIPTS).map(([v, x]) => ({ value: v, label: x.label })), get: (s) => s.script, set: (s, v) => ({ ...s, script: v }) },
      { kind: 'select', id: 'strategy', label: 'Strategy', options: opts([['none', 'no retries'], ['fixed', 'fixed delay'], ['exponential', 'exponential backoff'], ['jitter', 'exponential + full jitter']]), get: (s) => s.strategy, set: (s, v) => ({ ...s, strategy: v as Strategy }) },
      { kind: 'slider', id: 'base', label: 'Base delay (s)', min: 0.5, max: 5, step: 0.5, get: (s) => s.base, set: (s, v) => ({ ...s, base: v }) },
      { kind: 'slider', id: 'attempts', label: 'Max attempts', min: 1, max: 8, step: 1, get: (s) => s.maxAttempts, set: (s, v) => ({ ...s, maxAttempts: v }) },
      { kind: 'select', id: 'retryafter', label: 'Respect Retry-After', options: yesNo, get: (s) => (s.respectRetryAfter ? 'yes' : 'no'), set: (s, v) => ({ ...s, respectRetryAfter: v === 'yes' }) },
      { kind: 'slider', id: 'seed', label: 'Random seed (jitter)', min: 1, max: 20, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: (s) => ({
      run: simulateRetries(s, (REPLY_SCRIPTS[s.script] ?? REPLY_SCRIPTS.blip!).replies, s.seed),
      herd: herd(s, HERD_CLIENTS, HERD_SECONDS, s.seed),
    }),
    readout: (_s, r) => [
      { label: 'Result', value: r.run.ok ? 'succeeded' : 'failed', status: r.run.ok ? 'ok' : 'error' },
      { label: 'Attempts', value: String(r.run.attempts.length) },
      { label: 'Time spent waiting', value: `${r.run.elapsed} s` },
      { label: `Busiest second (${HERD_CLIENTS} clients)`, value: `${Math.max(...r.herd)} requests` },
    ],
  };
}

// ---------- reruns ----------

export interface RerunState {
  strategy: WriteStrategy;
  crashAfter: number;
  every: number;
}

export const RERUN_ITEMS = 12;

export function rerunExperiment(id: string): ExperimentDef<RerunState, RerunResult> {
  return {
    id,
    initial: { strategy: 'append', crashAfter: 8, every: 5 },
    controls: [
      {
        kind: 'select',
        id: 'strategy',
        label: 'Write strategy',
        options: opts([['append', 'append, rerun from the start'], ['upsert', 'upsert by key, rerun from the start'], ['checkpoint-append', 'append, resume from checkpoint'], ['checkpoint-upsert', 'upsert, resume from checkpoint']]),
        get: (s) => s.strategy,
        set: (s, v) => ({ ...s, strategy: v as WriteStrategy }),
      },
      { kind: 'slider', id: 'crash', label: 'First run crashes after item', min: 0, max: RERUN_ITEMS, step: 1, get: (s) => s.crashAfter, set: (s, v) => ({ ...s, crashAfter: v }) },
      { kind: 'slider', id: 'every', label: 'Checkpoint every n items', min: 1, max: 6, step: 1, get: (s) => s.every, set: (s, v) => ({ ...s, every: v }) },
    ],
    compute: (s) => simulateRerun({ ...s, items: RERUN_ITEMS }),
    readout: (_s, r) => [
      { label: 'Rows in the table', value: `${r.rows} (want ${RERUN_ITEMS})`, status: r.rows === RERUN_ITEMS ? 'ok' : 'error' },
      { label: 'Duplicates', value: String(r.duplicates), status: r.duplicates ? 'error' : 'ok' },
      { label: 'Items processed in total', value: String(r.processed) },
    ],
  };
}

// ---------- CI workflow ----------

export const ML_CI_JOBS: Job[] = [
  { id: 'lint', needs: [], minutes: 1, if: 'success' },
  { id: 'unit-tests', needs: [], minutes: 3, if: 'success' },
  { id: 'data-checks', needs: [], minutes: 2, if: 'success' },
  { id: 'train-smoke', needs: ['unit-tests', 'data-checks'], minutes: 4, if: 'success' },
  { id: 'evaluate', needs: ['train-smoke'], minutes: 2, if: 'success' },
  { id: 'build-image', needs: ['lint', 'evaluate'], minutes: 3, if: 'success' },
  { id: 'deploy-staging', needs: ['build-image'], minutes: 2, if: 'push-main' },
  { id: 'report', needs: ['deploy-staging'], minutes: 1, if: 'always' },
];

export function workflowExperiment(id: string): ExperimentDef<WorkflowInput, WorkflowResult> {
  return {
    id,
    initial: { event: 'pull_request', change: 'code', failing: 'none', pathsIgnore: true },
    controls: [
      { kind: 'select', id: 'event', label: 'Event', options: opts([['pull_request', 'pull_request'], ['push-main', 'push to main']]), get: (s) => s.event, set: (s, v) => ({ ...s, event: v as WorkflowInput['event'] }) },
      { kind: 'select', id: 'change', label: 'Files changed', options: opts([['code', 'code and data checks'], ['docs-only', 'docs only (README.md)']]), get: (s) => s.change, set: (s, v) => ({ ...s, change: v as WorkflowInput['change'] }) },
      { kind: 'select', id: 'failing', label: 'Job that fails', options: [{ value: 'none', label: 'none' }, ...ML_CI_JOBS.slice(0, 6).map((j) => ({ value: j.id, label: j.id }))], get: (s) => s.failing, set: (s, v) => ({ ...s, failing: v }) },
      { kind: 'select', id: 'paths', label: 'paths-ignore docs', options: yesNo, get: (s) => (s.pathsIgnore ? 'yes' : 'no'), set: (s, v) => ({ ...s, pathsIgnore: v === 'yes' }) },
    ],
    compute: (s) => runWorkflow(ML_CI_JOBS, s),
    readout: (_s, r) => [
      { label: 'Conclusion', value: r.conclusion, status: r.conclusion === 'failure' ? 'error' : 'ok' },
      { label: 'Wall clock (assumed durations)', value: `${r.wall} min` },
      { label: 'Runner minutes', value: `${r.billed} min` },
    ],
  };
}

// ---------- release gate ----------

export interface GateState {
  candidate: 'better' | 'slice' | 'slow' | 'same';
  minGain: number;
  dataOk: boolean;
  approved: boolean;
}

export const CHAMPION = { auc: 0.9, p95: 72, slices: [0.91, 0.89, 0.86] };
export const CANDIDATES: Record<GateState['candidate'], { label: string; m: GateInput['candidate'] }> = {
  better: { label: 'better everywhere', m: { auc: 0.912, p95: 74, slices: [0.92, 0.9, 0.87] } },
  slice: { label: 'better on average, worse on slice 3', m: { auc: 0.915, p95: 70, slices: [0.94, 0.92, 0.82] } },
  slow: { label: 'better but slower', m: { auc: 0.918, p95: 131, slices: [0.92, 0.91, 0.88] } },
  same: { label: 'about the same', m: { auc: 0.902, p95: 71, slices: [0.91, 0.89, 0.86] } },
};
export const LATENCY_BUDGET = 100;
export const SLICE_TOLERANCE = 0.02;

export function gateExperiment(id: string): ExperimentDef<GateState, GateResult> {
  return {
    id,
    initial: { candidate: 'better', minGain: 0.005, dataOk: true, approved: false },
    controls: [
      { kind: 'select', id: 'candidate', label: 'Retrained candidate', options: Object.entries(CANDIDATES).map(([v, c]) => ({ value: v, label: c.label })), get: (s) => s.candidate, set: (s, v) => ({ ...s, candidate: v as GateState['candidate'] }) },
      { kind: 'slider', id: 'gain', label: 'Minimum AUC gain', min: 0, max: 0.02, step: 0.001, format: (v) => v.toFixed(3), get: (s) => s.minGain, set: (s, v) => ({ ...s, minGain: v }) },
      { kind: 'select', id: 'data', label: 'Data checks passed', options: yesNo, get: (s) => (s.dataOk ? 'yes' : 'no'), set: (s, v) => ({ ...s, dataOk: v === 'yes' }) },
      { kind: 'select', id: 'approved', label: 'Reviewer approved production', options: yesNo, get: (s) => (s.approved ? 'yes' : 'no'), set: (s, v) => ({ ...s, approved: v === 'yes' }) },
    ],
    compute: (s) =>
      evaluateGates({ candidate: CANDIDATES[s.candidate].m, champion: CHAMPION, minGain: s.minGain, latencyBudget: LATENCY_BUDGET, sliceTolerance: SLICE_TOLERANCE, dataChecksPassed: s.dataOk, approved: s.approved }),
    readout: (_s, r) => [
      { label: 'Decision', value: r.decision, status: r.decision === 'blocked' ? 'error' : 'ok' },
      { label: 'Furthest stage', value: r.stage },
    ],
  };
}

// ---------- DAG scheduler ----------

export interface DagState {
  slots: number;
  retries: number;
  retryDelay: number;
  /** Attempts the flaky features task needs: 1, 2, 3, or 0 for never. */
  flaky: number;
  notifyRule: DagTask['trigger'];
}

export function dagTasks(s: Pick<DagState, 'flaky' | 'notifyRule'>): DagTask[] {
  return [
    { id: 'extract', upstream: [], minutes: 4, succeedsOn: 1, trigger: 'all_success' },
    { id: 'validate', upstream: ['extract'], minutes: 2, succeedsOn: 1, trigger: 'all_success' },
    { id: 'features', upstream: ['extract'], minutes: 5, succeedsOn: s.flaky, trigger: 'all_success' },
    { id: 'labels', upstream: ['extract'], minutes: 3, succeedsOn: 1, trigger: 'all_success' },
    { id: 'train', upstream: ['validate', 'features', 'labels'], minutes: 8, succeedsOn: 1, trigger: 'all_success' },
    { id: 'evaluate', upstream: ['train'], minutes: 3, succeedsOn: 1, trigger: 'all_success' },
    { id: 'report', upstream: ['validate'], minutes: 2, succeedsOn: 1, trigger: 'all_success' },
    { id: 'notify', upstream: ['evaluate', 'report'], minutes: 1, succeedsOn: 1, trigger: s.notifyRule },
  ];
}

export function dagExperiment(id: string): ExperimentDef<DagState, DagResult> {
  return {
    id,
    initial: { slots: 2, retries: 2, retryDelay: 3, flaky: 2, notifyRule: 'all_success' },
    controls: [
      { kind: 'slider', id: 'slots', label: 'Worker slots', min: 1, max: 4, step: 1, get: (s) => s.slots, set: (s, v) => ({ ...s, slots: v }) },
      { kind: 'select', id: 'flaky', label: 'features succeeds on attempt', options: opts([['1', '1 (no flakiness)'], ['2', '2'], ['3', '3'], ['0', 'never (broken)']]), get: (s) => String(s.flaky), set: (s, v) => ({ ...s, flaky: Number(v) }) },
      { kind: 'slider', id: 'retries', label: 'retries', min: 0, max: 3, step: 1, get: (s) => s.retries, set: (s, v) => ({ ...s, retries: v }) },
      { kind: 'slider', id: 'delay', label: 'retry_delay (min)', min: 0, max: 10, step: 1, get: (s) => s.retryDelay, set: (s, v) => ({ ...s, retryDelay: v }) },
      { kind: 'select', id: 'rule', label: 'notify trigger_rule', options: opts([['all_success', 'all_success'], ['all_done', 'all_done']]), get: (s) => s.notifyRule, set: (s, v) => ({ ...s, notifyRule: v as DagTask['trigger'] }) },
    ],
    compute: (s) => scheduleDag(dagTasks(s), s),
    readout: (_s, r) => [
      { label: 'DAG run', value: r.dagState, status: r.dagState === 'success' ? 'ok' : 'error' },
      { label: 'Makespan', value: `${r.makespan} min` },
      { label: 'Failed or upstream_failed', value: Object.entries(r.states).filter(([, v]) => v !== 'success').map(([k]) => k).join(', ') || 'none' },
    ],
  };
}

// ---------- schedules and backfills ----------

export interface IntervalState {
  timetable: Timetable;
  every: 'hour' | 'day';
  /** How far back start_date is, in schedule units. */
  back: number;
  catchup: boolean;
  maxActiveRuns: number;
}

/** "Now" for the interval explorer: 2026-11-23 14:00 UTC. */
export const INTERVAL_NOW = Date.UTC(2026, 10, 23, 14, 0);

export function intervalStart(s: Pick<IntervalState, 'every' | 'back'>): number {
  const unit = s.every === 'hour' ? HOUR_MS : DAY_MS;
  const aligned = Math.floor(INTERVAL_NOW / unit) * unit;
  return aligned - s.back * unit;
}

export function intervalExperiment(id: string): ExperimentDef<IntervalState, DagRunInfo[]> {
  return {
    id,
    initial: { timetable: 'trigger', every: 'day', back: 5, catchup: false, maxActiveRuns: 2 },
    controls: [
      { kind: 'select', id: 'timetable', label: 'Timetable', options: opts([['trigger', 'trigger (Airflow 3 default)'], ['interval', 'data interval (Airflow 2 default)']]), get: (s) => s.timetable, set: (s, v) => ({ ...s, timetable: v as Timetable }) },
      { kind: 'select', id: 'every', label: 'Schedule', options: opts([['day', '@daily'], ['hour', '@hourly']]), get: (s) => s.every, set: (s, v) => ({ ...s, every: v as IntervalState['every'] }) },
      { kind: 'slider', id: 'back', label: 'start_date, periods ago', min: 0, max: 12, step: 1, get: (s) => s.back, set: (s, v) => ({ ...s, back: v }) },
      { kind: 'select', id: 'catchup', label: 'catchup', options: opts([['yes', 'True'], ['no', 'False']]), get: (s) => (s.catchup ? 'yes' : 'no'), set: (s, v) => ({ ...s, catchup: v === 'yes' }) },
      { kind: 'slider', id: 'active', label: 'max_active_runs', min: 1, max: 8, step: 1, get: (s) => s.maxActiveRuns, set: (s, v) => ({ ...s, maxActiveRuns: v }) },
    ],
    compute: (s) => dagRuns({ ...s, startDate: intervalStart(s), now: INTERVAL_NOW }),
    readout: (s, r) => [
      { label: 'Runs created', value: String(r.length) },
      { label: 'start_date', value: fmt(intervalStart(s)) },
      { label: 'Waves (max_active_runs)', value: String(r.length ? r[r.length - 1]!.wave + 1 : 0) },
    ],
  };
}

// ---------- webhooks ----------

export interface SignatureState {
  secret: string;
  body: string;
  /** The body as it arrives: possibly re-serialised or tampered with in transit. */
  received: 'same' | 'reformatted' | 'tampered';
}

export interface SignatureResult {
  header: string;
  receivedBody: string;
  recomputed: string;
  valid: boolean;
}

export function receivedBody(body: string, how: SignatureState['received']): string {
  if (how === 'same') return body;
  if (how === 'reformatted') return body.replace(/":/g, '": ').replace(/,"/g, ', "');
  return body.replace(/"main"/, '"attacker-branch"').replace(/"opened"/, '"closed"');
}

export function signatureExperiment(id: string): ExperimentDef<SignatureState, SignatureResult> {
  return {
    id,
    initial: { secret: 'whsec-demo-1234', body: '{"action":"opened","ref":"main"}', received: 'same' },
    controls: [
      { kind: 'text', id: 'secret', label: 'Shared secret', maxLength: 64, get: (s) => s.secret, set: (s, v) => ({ ...s, secret: v }) },
      { kind: 'text', id: 'body', label: 'Raw body sent', maxLength: 200, get: (s) => s.body, set: (s, v) => ({ ...s, body: v }) },
      { kind: 'select', id: 'received', label: 'Body the receiver checks', options: opts([['same', 'the raw bytes, unchanged'], ['reformatted', 'parsed and re-serialised JSON'], ['tampered', 'changed in transit']]), get: (s) => s.received, set: (s, v) => ({ ...s, received: v as SignatureState['received'] }) },
    ],
    compute: (s) => {
      const header = signatureHeader(s.secret, s.body);
      const rb = receivedBody(s.body, s.received);
      return { header, receivedBody: rb, recomputed: signatureHeader(s.secret, rb), valid: verifySignature(s.secret, rb, header) };
    },
    readout: (_s, r) => [{ label: 'Signature check', value: r.valid ? 'valid: process it' : 'invalid: reject with 401', status: r.valid ? 'ok' : 'error' }],
  };
}

export function deliveryExperiment(id: string): ExperimentDef<DeliveryInput, DeliveryResult> {
  return {
    id,
    initial: { mode: 'sync', workSeconds: 25, timeout: 10, senderRetries: 2, dedup: false, events: 3 },
    controls: [
      { kind: 'select', id: 'mode', label: 'Handler', options: opts([['sync', 'do the work, then answer'], ['queue', 'enqueue, answer 202, work later']]), get: (s) => s.mode, set: (s, v) => ({ ...s, mode: v as DeliveryInput['mode'] }) },
      { kind: 'slider', id: 'work', label: 'Work takes (s)', min: 1, max: 60, step: 1, get: (s) => s.workSeconds, set: (s, v) => ({ ...s, workSeconds: v }) },
      { kind: 'slider', id: 'retries', label: 'Sender retries', min: 0, max: 4, step: 1, get: (s) => s.senderRetries, set: (s, v) => ({ ...s, senderRetries: v }) },
      { kind: 'select', id: 'dedup', label: 'Deduplicate by delivery id', options: yesNo, get: (s) => (s.dedup ? 'yes' : 'no'), set: (s, v) => ({ ...s, dedup: v === 'yes' }) },
    ],
    compute: simulateDeliveries,
    readout: (_s, r) => [
      { label: 'Deliveries', value: String(r.attempts.length) },
      { label: 'Retraining jobs started', value: `${r.effects.reduce((a, b) => a + b, 0)} (want ${r.effects.length})`, status: r.duplicates ? 'error' : 'ok' },
      { label: 'Timed out (sender’s view)', value: String(r.attempts.filter((a) => a.recorded === 'timed out').length) },
    ],
  };
}

// ---------- agent guardrails ----------

export function agentExperiment(id: string): ExperimentDef<AgentPolicy, AgentRun> {
  return {
    id,
    initial: { autonomy: 'full-auto', allowlist: false, maxSteps: 10, approver: 'careful', injection: true },
    controls: [
      { kind: 'select', id: 'autonomy', label: 'Autonomy', options: opts([['read-only', 'read-only (suggest fixes)'], ['approve-risky', 'approve destructive and external'], ['full-auto', 'fully autonomous']]), get: (s) => s.autonomy, set: (s, v) => ({ ...s, autonomy: v as Autonomy }) },
      { kind: 'select', id: 'injection', label: 'Inbox contains an injected instruction', options: yesNo, get: (s) => (s.injection ? 'yes' : 'no'), set: (s, v) => ({ ...s, injection: v === 'yes' }) },
      { kind: 'select', id: 'allowlist', label: 'Recipient allowlist (example.com)', options: yesNo, get: (s) => (s.allowlist ? 'yes' : 'no'), set: (s, v) => ({ ...s, allowlist: v === 'yes' }) },
      { kind: 'select', id: 'approver', label: 'The approver', options: opts([['careful', 'reads each request'], ['rubber-stamp', 'approves everything']]), get: (s) => s.approver, set: (s, v) => ({ ...s, approver: v as AgentPolicy['approver'] }) },
      { kind: 'slider', id: 'steps', label: 'Step budget', min: 1, max: 10, step: 1, get: (s) => s.maxSteps, set: (s, v) => ({ ...s, maxSteps: v }) },
    ],
    compute: runAgent,
    readout: (_s, r) => [
      { label: 'Secrets leaked', value: r.leaked ? 'yes' : 'no', status: r.leaked ? 'error' : 'ok' },
      { label: 'Approval requests', value: String(r.approvalsAsked) },
      { label: 'Work done', value: r.done.join(', ') || 'none (suggestions only)' },
    ],
  };
}

export { plural };
