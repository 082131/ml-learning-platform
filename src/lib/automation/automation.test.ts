// Unit tests for the Automation track's logic, with hand-worked numbers. Cron results are compared with croniter
// 7.0.0 (recorded below); SHA-256 and HMAC with Node's crypto module.
import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { agentScript, runAgent, type AgentPolicy } from './agent';
import { cronMatches, describeField, formatUtc, nextRuns, parseCron } from './cron';
import { leaves, scheduleDag, topoOrder, type DagTask } from './dag';
import { evaluateGates, type GateInput } from './gates';
import { DAY_MS, dagRuns, fmt, HOUR_MS } from './intervals';
import { extensionOf, planMoves, type Rule } from './organize';
import { simulateRerun } from './rerun';
import { backoffDelay, herd, mulberry32, simulateRetries, type RetryPolicy } from './retry';
import { hex, hmacSha256, sha256, utf8 } from './sha256';
import { constantTimeEqual, signatureHeader, simulateDeliveries, verifySignature } from './webhook';
import { runWorkflow, type Job } from './workflow';
import { worthIt, WEEKS_PER_MONTH } from './worth';

describe('worthIt', () => {
  it('computes savings, net and break-even by hand', () => {
    // (20 - 2) min × 5 runs/week × 52/12 weeks/month / 60 = 6.5 h/month saved; net 6.5 - 1.5 = 5 h/month.
    const r = worthIt({ manualMinutes: 20, automatedMinutes: 2, runsPerWeek: 5, buildHours: 12, maintainHoursPerMonth: 1.5, horizonMonths: 6 });
    expect(WEEKS_PER_MONTH).toBeCloseTo(4.3333, 4);
    expect(r.savedPerMonth).toBe(6.5);
    expect(r.netPerMonth).toBe(5);
    expect(r.cumulative).toEqual([-12, -7, -2, 3, 8, 13, 18]);
    expect(r.breakEvenMonth).toBe(3);
    expect(r.totalNet).toBe(18);
  });
  it('never pays back when maintenance eats the savings', () => {
    const r = worthIt({ manualMinutes: 5, automatedMinutes: 0, runsPerWeek: 1, buildHours: 4, maintainHoursPerMonth: 1, horizonMonths: 12 });
    expect(r.netPerMonth).toBeLessThan(0);
    expect(r.breakEvenMonth).toBeNull();
  });
});

describe('planMoves', () => {
  const rules: Rule[] = [
    { extensions: ['pdf'], folder: 'docs' },
    { extensions: ['jpg', 'png'], folder: 'images' },
  ];
  it('moves by extension, skips unknown files and never overwrites', () => {
    const p = planMoves(['a.pdf', 'B.JPG', 'notes.txt', 'docs/c.pdf', 'c.pdf'], rules);
    expect(extensionOf('B.JPG')).toBe('jpg');
    expect(extensionOf('.bashrc')).toBe('');
    expect(p.moves).toBe(2);
    expect(p.conflicts).toBe(1);
    expect(p.actions).toContainEqual({ kind: 'conflict', from: 'c.pdf', to: 'docs/c.pdf' });
    expect(p.after).toEqual(['c.pdf', 'docs/a.pdf', 'docs/c.pdf', 'images/B.JPG', 'notes.txt']);
    expect(p.lost).toBe(0);
  });
  it('is idempotent: the second run moves nothing', () => {
    const first = planMoves(['a.pdf', 'x.png', 'notes.txt'], rules);
    expect(planMoves(first.after, rules).moves).toBe(0);
  });
  it('overwrite destroys the existing file', () => {
    const p = planMoves(['c.pdf', 'docs/c.pdf'], rules, true);
    expect(p.lost).toBe(1);
    expect(p.after).toEqual(['docs/c.pdf']);
  });
});

describe('cron', () => {
  const FROM = new Date(Date.UTC(2026, 10, 23, 14, 0));
  const CRONITER: Record<string, string[]> = {
    '*/15 9-17 * * 1-5': ['2026-11-23T14:15', '2026-11-23T14:30', '2026-11-23T14:45', '2026-11-23T15:00', '2026-11-23T15:15'],
    '0 2 * * *': ['2026-11-24T02:00', '2026-11-25T02:00', '2026-11-26T02:00', '2026-11-27T02:00', '2026-11-28T02:00'],
    '30 6 1,15 * *': ['2026-12-01T06:30', '2026-12-15T06:30', '2027-01-01T06:30', '2027-01-15T06:30', '2027-02-01T06:30'],
    '0 0 13 * 5': ['2026-11-27T00:00', '2026-12-04T00:00', '2026-12-11T00:00', '2026-12-13T00:00', '2026-12-18T00:00'],
    '0 9 * * MON-FRI': ['2026-11-24T09:00', '2026-11-25T09:00', '2026-11-26T09:00', '2026-11-27T09:00', '2026-11-30T09:00'],
    '0 0 1 JAN,JUL *': ['2027-01-01T00:00', '2027-07-01T00:00', '2028-01-01T00:00', '2028-07-01T00:00', '2029-01-01T00:00'],
    '0 */6 * * *': ['2026-11-23T18:00', '2026-11-24T00:00', '2026-11-24T06:00', '2026-11-24T12:00', '2026-11-24T18:00'],
    '5 4 * * 0': ['2026-11-29T04:05', '2026-12-06T04:05', '2026-12-13T04:05', '2026-12-20T04:05', '2026-12-27T04:05'],
    '0 0 * * 7': ['2026-11-29T00:00', '2026-12-06T00:00', '2026-12-13T00:00', '2026-12-20T00:00', '2026-12-27T00:00'],
    '45 23 31 * *': ['2026-12-31T23:45', '2027-01-31T23:45', '2027-03-31T23:45', '2027-05-31T23:45', '2027-07-31T23:45'],
    '0 8-18/2 * * SAT': ['2026-11-28T08:00', '2026-11-28T10:00', '2026-11-28T12:00', '2026-11-28T14:00', '2026-11-28T16:00'],
  };
  for (const [expr, want] of Object.entries(CRONITER))
    it(`${expr} matches croniter`, () => {
      const p = parseCron(expr);
      if (!p.ok) throw new Error(p.error);
      expect(nextRuns(p.spec, FROM, 5).map((d) => d.toISOString().slice(0, 16))).toEqual(want);
    });
  it('day of month OR day of week when both are restricted; AND when one starts with *', () => {
    const or = parseCron('0 0 13 * 5');
    const and = parseCron('0 0 */2 * 1');
    if (!or.ok || !and.ok) throw new Error('parse');
    expect(or.spec.dayOr).toBe(true);
    expect(and.spec.dayOr).toBe(false); // Vixie cron: "*/2" counts as a star, so odd days that are also Mondays
    expect(nextRuns(and.spec, FROM, 2).map(formatUtc)).toEqual(['Mon 2026-12-07 00:00', 'Mon 2026-12-21 00:00']);
  });
  it('macros, names and errors', () => {
    const d = parseCron('@daily');
    expect(d.ok && d.spec.fields.map((f) => f.source).join(' ')).toBe('0 0 * * *');
    expect(parseCron('0 0 * *')).toEqual({ ok: false, error: 'expected 5 fields (minute hour day-of-month month day-of-week), got 4' });
    expect(parseCron('60 * * * *')).toMatchObject({ ok: false });
    expect(parseCron('5/10 * * * *')).toMatchObject({ ok: false });
    expect(parseCron('@sometimes')).toMatchObject({ ok: false });
    const w = parseCron('0 9 * * MON-FRI');
    if (!w.ok) throw new Error('parse');
    expect(describeField(w.spec.fields[4]!)).toBe('day of week Mon, Tue, Wed, Thu, Fri');
    expect(describeField(w.spec.fields[0]!)).toBe('minute 0');
    expect(describeField(w.spec.fields[2]!)).toBe('every day of month');
    expect(cronMatches(w.spec, new Date(Date.UTC(2026, 10, 23, 9, 0)))).toBe(true);
    expect(cronMatches(w.spec, new Date(Date.UTC(2026, 10, 22, 9, 0)))).toBe(false);
  });
  it('February 29 fires once in the search window; February 30 never', () => {
    const leap = parseCron('0 12 29 2 *');
    const never = parseCron('0 0 30 2 *');
    if (!leap.ok || !never.ok) throw new Error('parse');
    expect(nextRuns(leap.spec, FROM, 5).map(formatUtc)).toEqual(['Tue 2028-02-29 12:00']);
    expect(nextRuns(never.spec, FROM, 5)).toEqual([]);
  });
});

describe('retries', () => {
  const p: RetryPolicy = { strategy: 'exponential', base: 1, cap: 30, maxAttempts: 6, respectRetryAfter: true };
  it('exponential delays double and cap', () => {
    const rand = mulberry32(1);
    expect([1, 2, 3, 4, 5, 6].map((n) => backoffDelay({ ...p, cap: 10 }, n, rand))).toEqual([1, 2, 4, 8, 10, 10]);
    expect(backoffDelay({ ...p, strategy: 'fixed', base: 3 }, 4, rand)).toBe(3);
  });
  it('full jitter stays in [0, exponential] and is reproducible', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let n = 1; n <= 6; n++) {
      const d = backoffDelay({ ...p, strategy: 'jitter' }, n, a);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(Math.min(30, 2 ** (n - 1)));
      expect(backoffDelay({ ...p, strategy: 'jitter' }, n, b)).toBe(d);
    }
  });
  it('waits 1 + 2 + 4 then succeeds; Retry-After wins when longer', () => {
    const run = simulateRetries(p, [{ status: 503 }, { status: 503 }, { status: 429, retryAfter: 10 }, { status: 200 }]);
    expect(run.attempts.map((a) => a.wait)).toEqual([1, 2, 10, null]);
    expect(run.attempts.map((a) => a.at)).toEqual([0, 1, 3, 13]);
    expect(run.ok).toBe(true);
    expect(run.elapsed).toBe(13);
  });
  it('fails at once on a 400 and gives up after maxAttempts', () => {
    expect(simulateRetries(p, [{ status: 400 }]).attempts).toHaveLength(1);
    const out = simulateRetries({ ...p, maxAttempts: 3 }, [{ status: 500 }]);
    expect(out.attempts.map((a) => a.status)).toEqual([500, 500, 500]);
    expect(out.ok).toBe(false);
    expect(out.elapsed).toBe(3);
    expect(simulateRetries({ ...p, strategy: 'none' }, [{ status: 503 }, { status: 200 }]).ok).toBe(false);
  });
  it('without jitter every client retries in the same second', () => {
    const synced = herd({ ...p, maxAttempts: 4 }, 100, 10);
    expect(synced.slice(0, 8)).toEqual([100, 100, 0, 100, 0, 0, 0, 100]);
    const spread = herd({ ...p, strategy: 'jitter', maxAttempts: 4 }, 100, 10);
    expect(spread.reduce((a, b) => a + b, 0)).toBe(400);
    expect(Math.max(...spread.slice(1))).toBeLessThan(100);
  });
});

describe('simulateRerun', () => {
  const base = { items: 10, crashAfter: 7, every: 5 };
  it('append from the start duplicates everything written before the crash', () => {
    const r = simulateRerun({ ...base, strategy: 'append' });
    expect([r.rows, r.duplicates, r.missing, r.processed, r.resumeFrom]).toEqual([17, 7, 0, 17, 1]);
  });
  it('upsert from the start is correct but redoes the work', () => {
    const r = simulateRerun({ ...base, strategy: 'upsert' });
    expect([r.rows, r.duplicates, r.processed]).toEqual([10, 0, 17]);
  });
  it('checkpoint + append duplicates only the items after the last checkpoint', () => {
    const r = simulateRerun({ ...base, strategy: 'checkpoint-append' });
    expect([r.rows, r.duplicates, r.processed, r.resumeFrom]).toEqual([12, 2, 12, 6]);
  });
  it('checkpoint + upsert is correct and cheap; no crash needs no rerun', () => {
    const r = simulateRerun({ ...base, strategy: 'checkpoint-upsert' });
    expect([r.rows, r.duplicates, r.processed]).toEqual([10, 0, 12]);
    expect(simulateRerun({ ...base, crashAfter: 10, strategy: 'append' }).processed).toBe(10);
  });
});

describe('runWorkflow', () => {
  const jobs: Job[] = [
    { id: 'lint', needs: [], minutes: 1, if: 'success' },
    { id: 'test', needs: [], minutes: 3, if: 'success' },
    { id: 'train', needs: ['lint', 'test'], minutes: 4, if: 'success' },
    { id: 'deploy', needs: ['train'], minutes: 2, if: 'push-main' },
    { id: 'notify', needs: ['deploy'], minutes: 1, if: 'always' },
  ];
  it('runs everything on a push to main', () => {
    const r = runWorkflow(jobs, { event: 'push-main', change: 'code', failing: 'none', pathsIgnore: true });
    expect(r.jobs.map((j) => j.status)).toEqual(['success', 'success', 'success', 'success', 'success']);
    expect(r.wall).toBe(3 + 4 + 2 + 1);
    expect(r.billed).toBe(11);
  });
  it('skips deploy on a pull request, and skipping cascades except for always()', () => {
    const r = runWorkflow(jobs, { event: 'pull_request', change: 'code', failing: 'none', pathsIgnore: true });
    expect(r.jobs.find((j) => j.id === 'deploy')?.status).toBe('skipped');
    expect(r.jobs.find((j) => j.id === 'notify')?.status).toBe('success');
    expect(r.conclusion).toBe('success');
  });
  it('a failure skips dependants', () => {
    const r = runWorkflow(jobs, { event: 'push-main', change: 'code', failing: 'test', pathsIgnore: true });
    expect(r.jobs.map((j) => j.status)).toEqual(['success', 'failure', 'skipped', 'skipped', 'success']);
    expect(r.jobs[2]!.why).toBe('test failed, so success() is false');
    expect(r.conclusion).toBe('failure');
  });
  it('paths-ignore stops a docs-only change from running at all', () => {
    expect(runWorkflow(jobs, { event: 'pull_request', change: 'docs-only', failing: 'none', pathsIgnore: true }).conclusion).toBe('not triggered');
    expect(runWorkflow(jobs, { event: 'pull_request', change: 'docs-only', failing: 'none', pathsIgnore: false }).triggered).toBe(true);
  });
});

describe('evaluateGates', () => {
  const g: GateInput = {
    candidate: { auc: 0.912, p95: 80, slices: [0.9, 0.88, 0.86] },
    champion: { auc: 0.9, p95: 75, slices: [0.89, 0.87, 0.87] },
    minGain: 0.005,
    latencyBudget: 100,
    sliceTolerance: 0.02,
    dataChecksPassed: true,
    approved: false,
  };
  it('passes the automatic gates and waits for a person', () => {
    const r = evaluateGates(g);
    expect(r.gates.map((x) => x.pass)).toEqual([true, true, true, true, false]);
    expect(r.decision).toBe('waiting for approval');
    expect(r.stage).toBe('staging');
    expect(evaluateGates({ ...g, approved: true }).stage).toBe('production');
  });
  it('blocks on a slice regression even when the average improves', () => {
    const r = evaluateGates({ ...g, candidate: { ...g.candidate, slices: [0.92, 0.9, 0.84] } });
    expect(r.decision).toBe('blocked');
    expect(r.gates[2]!.detail).toContain('slice 3');
  });
});

describe('DAG scheduler', () => {
  const tasks: DagTask[] = [
    { id: 'extract', upstream: [], minutes: 2, succeedsOn: 1, trigger: 'all_success' },
    { id: 'validate', upstream: ['extract'], minutes: 1, succeedsOn: 1, trigger: 'all_success' },
    { id: 'features', upstream: ['extract'], minutes: 3, succeedsOn: 2, trigger: 'all_success' },
    { id: 'train', upstream: ['validate', 'features'], minutes: 4, succeedsOn: 1, trigger: 'all_success' },
    { id: 'notify', upstream: ['train'], minutes: 1, succeedsOn: 1, trigger: 'all_done' },
  ];
  it('orders topologically and rejects cycles', () => {
    expect(topoOrder(tasks)).toEqual(['extract', 'validate', 'features', 'train', 'notify']);
    expect(() => topoOrder([{ id: 'a', upstream: ['b'] }, { id: 'b', upstream: ['a'] }])).toThrow(/cycle/);
    expect(leaves(tasks)).toEqual(['notify']);
  });
  it('retries a flaky task after the delay', () => {
    // extract 0-2; validate 2-3 and features 2-5 (fails), retry at 5+2=7, 7-10; train 10-14; notify 14-15.
    const r = scheduleDag(tasks, { slots: 2, retries: 1, retryDelay: 2 });
    expect(r.segments.filter((x) => x.task === 'features')).toEqual([
      { task: 'features', attempt: 1, start: 2, end: 5, outcome: 'retry' },
      { task: 'features', attempt: 2, start: 7, end: 10, outcome: 'success' },
    ]);
    expect(r.makespan).toBe(15);
    expect(r.dagState).toBe('success');
  });
  it('one slot serialises the work', () => {
    const r = scheduleDag(tasks.map((t) => ({ ...t, succeedsOn: 1 })), { slots: 1, retries: 0, retryDelay: 0 });
    expect(r.makespan).toBe(2 + 1 + 3 + 4 + 1);
  });
  it('without retries the failure marks train upstream_failed, and the all_done leaf hides it', () => {
    const r = scheduleDag(tasks, { slots: 2, retries: 0, retryDelay: 0 });
    expect(r.states).toMatchObject({ features: 'failed', train: 'upstream_failed', notify: 'success' });
    expect(r.dagState).toBe('success'); // Airflow decides from the leaves: the reason to make notify all_success or add a check
    const strict = scheduleDag(tasks.map((t) => ({ ...t, trigger: 'all_success' as const })), { slots: 2, retries: 0, retryDelay: 0 });
    expect(strict.states.notify).toBe('upstream_failed');
    expect(strict.dagState).toBe('failed');
  });
});

describe('dagRuns', () => {
  const start = Date.UTC(2026, 10, 20);
  const now = Date.UTC(2026, 10, 23, 14, 0);
  it('data intervals: one run per completed day, triggered at its end', () => {
    const runs = dagRuns({ timetable: 'interval', every: 'day', startDate: start, now, catchup: true, maxActiveRuns: 2 });
    expect(runs.map((r) => fmt(r.logicalDate))).toEqual(['2026-11-20 00:00', '2026-11-21 00:00', '2026-11-22 00:00']);
    expect(fmt(runs[2]!.runAfter)).toBe('2026-11-23 00:00');
    expect(runs.map((r) => r.wave)).toEqual([0, 0, 1]);
  });
  it('trigger timetable: a run at each tick including today', () => {
    const runs = dagRuns({ timetable: 'trigger', every: 'day', startDate: start, now, catchup: true, maxActiveRuns: 16 });
    expect(runs.map((r) => fmt(r.logicalDate))).toEqual(['2026-11-20 00:00', '2026-11-21 00:00', '2026-11-22 00:00', '2026-11-23 00:00']);
    expect(runs[0]!.intervalEnd - runs[0]!.intervalStart).toBe(0);
  });
  it('catchup off keeps only the latest; hourly counts hours', () => {
    expect(dagRuns({ timetable: 'interval', every: 'day', startDate: start, now, catchup: false, maxActiveRuns: 1 }).map((r) => fmt(r.logicalDate))).toEqual(['2026-11-22 00:00']);
    expect(dagRuns({ timetable: 'interval', every: 'hour', startDate: now - 5 * HOUR_MS, now, catchup: true, maxActiveRuns: 1 })).toHaveLength(5);
    expect(DAY_MS).toBe(24 * HOUR_MS);
  });
});

describe('SHA-256, HMAC and webhooks', () => {
  for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'é ✓ 漢字', 'x'.repeat(1000)])
    it(`sha256 matches node for a ${s.length}-char string`, () => {
      expect(hex(sha256(utf8(s)))).toBe(createHash('sha256').update(s).digest('hex'));
    });
  it('hmac matches node, including keys longer than a block', () => {
    for (const key of ['secret', 'k'.repeat(100)])
      expect(hex(hmacSha256(utf8(key), utf8('{"action":"opened"}')))).toBe(createHmac('sha256', key).update('{"action":"opened"}').digest('hex'));
  });
  it('matches the example in GitHub’s webhook docs', () => {
    // docs.github.com, "Validating webhook deliveries": secret "It's a Secret to Everybody", payload "Hello, World!"
    expect(signatureHeader("It's a Secret to Everybody", 'Hello, World!')).toBe('sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17');
  });
  it('verifies, and rejects a changed body or secret', () => {
    const h = signatureHeader('s3cret', '{"a":1}');
    expect(verifySignature('s3cret', '{"a":1}', h)).toBe(true);
    expect(verifySignature('s3cret', '{"a": 1}', h)).toBe(false);
    expect(verifySignature('other', '{"a":1}', h)).toBe(false);
    expect(constantTimeEqual('ab', 'abc')).toBe(false);
  });
  it('slow synchronous handlers time out and duplicate; dedup or a queue fixes it', () => {
    const slow = simulateDeliveries({ mode: 'sync', workSeconds: 25, timeout: 10, senderRetries: 2, dedup: false, events: 2 });
    expect(slow.effects).toEqual([3, 3]);
    expect(slow.duplicates).toBe(4);
    const dedup = simulateDeliveries({ mode: 'sync', workSeconds: 25, timeout: 10, senderRetries: 2, dedup: true, events: 2 });
    expect(dedup.effects).toEqual([1, 1]);
    expect(dedup.attempts.map((a) => a.recorded)).toEqual(['timed out', 'delivered', 'timed out', 'delivered']);
    const queued = simulateDeliveries({ mode: 'queue', workSeconds: 25, timeout: 10, senderRetries: 2, dedup: false, events: 2 });
    expect(queued.attempts).toHaveLength(2);
    expect(queued.duplicates).toBe(0);
  });
});

describe('runAgent', () => {
  const base: AgentPolicy = { autonomy: 'approve-risky', allowlist: false, maxSteps: 10, approver: 'careful', injection: true };
  it('the script has the injected call only when the inbox carries one', () => {
    expect(agentScript(false)).toHaveLength(6);
    expect(agentScript(true).filter((c) => c.injected)).toHaveLength(1);
  });
  it('full autonomy leaks; approvals or an allowlist stop it', () => {
    expect(runAgent({ ...base, autonomy: 'full-auto' }).leaked).toBe(true);
    const careful = runAgent(base);
    expect(careful.leaked).toBe(false);
    expect(careful.approvalsAsked).toBe(3);
    expect(careful.done).toEqual(['rerun_task', 'delete_checkpoints', 'send_email']);
    expect(runAgent({ ...base, approver: 'rubber-stamp' }).leaked).toBe(true);
    expect(runAgent({ ...base, approver: 'rubber-stamp', allowlist: true }).leaked).toBe(false);
  });
  it('read-only refuses every write; the budget cuts the run short', () => {
    const ro = runAgent({ ...base, autonomy: 'read-only' });
    expect(ro.done).toEqual([]);
    expect(ro.steps.filter((s) => s.outcome === 'refused by policy')).toHaveLength(4);
    const short = runAgent({ ...base, autonomy: 'full-auto', maxSteps: 3 });
    expect(short.leaked).toBe(false);
    expect(short.steps.filter((s) => s.outcome === 'not reached (step budget)')).toHaveLength(4);
  });
});
