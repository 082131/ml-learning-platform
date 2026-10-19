import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import harness from '../../workers/harness.py?raw';
import type { HarnessResult, WorkerMessage, WorkerRequest } from './protocol';
import { createPythonRunner, type WorkerLike } from './runner';
import { describeStep, toPyodideTrace } from './trace';
import { scalar } from '../trace/values';

class FakeWorker implements WorkerLike {
  onmessage: ((e: MessageEvent<WorkerMessage>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  requests: WorkerRequest[] = [];
  terminated = false;
  postMessage(message: WorkerRequest) {
    this.requests.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  send(data: WorkerMessage) {
    this.onmessage?.({ data } as MessageEvent<WorkerMessage>);
  }
}

const done = (id: number, result: Partial<HarnessResult> = {}): WorkerMessage => ({
  type: 'done',
  id,
  result: { error: null, test_failure: null, steps: null, truncated: false, images: [], ...result },
  version: { python: '3.14.2', pyodide: '314.0.7' },
});

describe('createPythonRunner', () => {
  let workers: FakeWorker[];
  const runner = () =>
    createPythonRunner(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    }, 10_000);

  beforeEach(() => {
    workers = [];
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('collects output and reports success with the runtime version', async () => {
    const r = runner();
    const phases: string[] = [];
    const result = r.run({ code: 'print(sum(range(5)))' }, { onPhase: (p) => phases.push(p) });
    await vi.waitFor(() => expect(workers[0]?.requests).toHaveLength(1));
    const w = workers[0]!;
    w.send({ type: 'phase', id: 1, phase: 'loading-runtime' });
    w.send({ type: 'phase', id: 1, phase: 'running' });
    w.send({ type: 'output', id: 1, stream: 'stdout', text: '10' });
    w.send(done(1));
    await expect(result).resolves.toMatchObject({
      status: 'ok',
      stdout: '10\n',
      version: { python: '3.14.2' },
    });
    expect(phases).toEqual(['loading-runtime', 'running']);
  });

  it('only starts the 10-second watchdog once code runs, then terminates and replaces the worker', async () => {
    const r = runner();
    const first = r.run({ code: 'while True: pass' });
    await vi.waitFor(() => expect(workers[0]?.requests).toHaveLength(1));
    workers[0]!.send({ type: 'phase', id: 1, phase: 'loading-runtime' });
    vi.advanceTimersByTime(60_000); // a slow download is not a timeout
    workers[0]!.send({ type: 'phase', id: 1, phase: 'running' });
    vi.advanceTimersByTime(10_000);
    await expect(first).resolves.toMatchObject({
      status: 'timeout',
      message: expect.stringMatching(/10 seconds/),
    });
    expect(workers[0]!.terminated).toBe(true);

    const second = r.run({ code: 'print(1)' });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    workers[1]!.send(done(2));
    await expect(second).resolves.toMatchObject({ status: 'ok' });
  });

  it('queues jobs so they run one at a time', async () => {
    const r = runner();
    const a = r.run({ code: 'a' });
    const b = r.run({ code: 'b' });
    await vi.waitFor(() => expect(workers[0]?.requests).toHaveLength(1));
    workers[0]!.send(done(1, { error: 'NameError' }));
    await expect(a).resolves.toMatchObject({ status: 'error', message: 'NameError' });
    await vi.waitFor(() => expect(workers[0]?.requests).toHaveLength(2));
    workers[0]!.send(done(2, { test_failure: 'expected 5' }));
    await expect(b).resolves.toMatchObject({ status: 'test-failed', message: 'expected 5' });
  });

  it('reports load failures (offline) and recreates the worker next time', async () => {
    const r = runner();
    const a = r.run({ code: 'x' });
    await vi.waitFor(() => expect(workers).toHaveLength(1));
    workers[0]!.send({ type: 'load-failed', id: 1, error: 'Python runtime couldn’t load (offline).' });
    await expect(a).resolves.toMatchObject({ status: 'load-failed' });
    const b = r.run({ code: 'x' });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    workers[1]!.onerror?.({ message: '' } as ErrorEvent);
    await expect(b).resolves.toMatchObject({
      status: 'load-failed',
      message: expect.stringMatching(/worker/),
    });
  });
});

describe('Pyodide traces', () => {
  it('describes what changed on each line', () => {
    const a = { range: { line: 1 }, note: '', vars: { total: scalar(0) } };
    const b = { range: { line: 2 }, note: '', vars: { total: scalar(3), x: scalar(3) } };
    expect(describeStep(undefined, a, '<module>')).toBe('Line 1 ran. Total is now 0.');
    expect(describeStep(a, b, 'f')).toBe('Line 2 ran inside f(). Total changed from 0 to 3; x is now 3.');
    expect(describeStep(b, b, '<module>')).toBe('Line 2 ran. No variable changed.');
    expect(describeStep(b, a, '<module>')).toMatch(/x is out of scope/);
  });
});

// The harness is plain Python, so it is checked here under CPython when python3 is installed.
function runHarness(code: string, tests: string | null, trace: boolean): HarnessResult {
  const script = `import json,sys\nexec(sys.stdin.read())\nprint(mlp_run(*json.loads(sys.argv[1])))`;
  const out = execFileSync('python3', ['-c', script, JSON.stringify([code, tests, trace])], {
    input: harness,
    encoding: 'utf8',
  });
  return JSON.parse(out.trim().split('\n').at(-1)!) as HarnessResult;
}
const hasPython = (() => {
  try {
    execFileSync('python3', ['--version']);
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasPython)('harness.py (CPython)', () => {
  it('records one step per executed line with variables after the line', () => {
    const r = runHarness('total = 0\nfor x in [3, 1]:\n    total = total + x', null, true);
    const trace = toPyodideTrace(r.steps!);
    expect(trace.steps.map((s) => s.range.line)).toEqual([1, 2, 3, 2, 3, 2]);
    expect(trace.steps.map((s) => s.vars.total)).toEqual([0, 0, 3, 3, 4, 4].map(scalar));
    expect(trace.steps[2]?.note).toBe('Line 3 ran. Total changed from 0 to 3.');
  });

  it('records arrays with shapes and skips functions and modules', () => {
    const r = runHarness('import math\ndef f(): pass\nm = [[1, 2, 3], [4, 5, 6]]\nname = "hi"', null, true);
    expect(r.steps!.at(-1)!.vars).toEqual({
      m: {
        kind: 'array',
        shape: [2, 3],
        data: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      },
      name: { kind: 'text', value: "'hi'" },
    });
  });

  it('stops tracing endless loops at the step limit', () => {
    const r = runHarness('i = 0\nwhile True:\n    i += 1', null, true);
    expect(r.truncated).toBe(true);
    expect(r.steps).toHaveLength(500);
  });

  it('reports errors with only the learner’s own frames', () => {
    const r = runHarness('x = 1\ny = x / 0', null, false);
    expect(r.error).toMatch(/File "<lesson>", line 2[\s\S]*ZeroDivisionError: division by zero$/);
    expect(r.error).not.toMatch(/harness/);
  });

  it('runs tests against the learner’s code and reports the failing assertion', () => {
    const code = 'def add(a, b):\n    return a - b';
    expect(runHarness(code, "assert add(2, 3) == 5, 'add(2, 3) should be 5'", false).test_failure).toBe(
      'add(2, 3) should be 5',
    );
    expect(runHarness(code, 'assert add(2, 3) == 5', false).test_failure).toBe('assert add(2, 3) == 5');
    expect(
      runHarness('def add(a, b):\n    return a + b', 'assert add(2, 3) == 5', false).test_failure,
    ).toBeNull();
  });
});
