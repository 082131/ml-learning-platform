import { describe, expect, it, vi } from 'vitest';
import { createSqlRunner, type SqlWorkerLike } from './client';
import type { SqlWorkerMessage, SqlWorkerRequest } from './protocol';

/** A fake worker that answers with `reply`, or never answers when `reply` returns null. */
function fakeWorker(reply: (req: SqlWorkerRequest) => SqlWorkerMessage[] | null) {
  const made: SqlWorkerLike[] = [];
  const create = () => {
    const w: SqlWorkerLike = {
      onmessage: null,
      onerror: null,
      terminate: vi.fn(),
      postMessage(req) {
        const out = reply(req);
        if (out) queueMicrotask(() => out.forEach((data) => w.onmessage?.({ data } as MessageEvent<SqlWorkerMessage>)));
      },
    };
    made.push(w);
    return w;
  };
  return { create, made };
}

describe('createSqlRunner', () => {
  it('returns the worker result and reuses the worker', async () => {
    const f = fakeWorker((r) => [{ id: r.id, type: 'running' }, { id: r.id, type: 'run', result: { status: 'ok', statements: [] } }]);
    const runner = createSqlRunner(f.create);
    expect((await runner.run('', 'SELECT 1')).status).toBe('ok');
    expect((await runner.run('', 'SELECT 2')).status).toBe('ok');
    expect(f.made).toHaveLength(1);
  });
  it('stops a job that runs too long and starts a new worker next time', async () => {
    vi.useFakeTimers();
    let first = true;
    const f = fakeWorker((r) => {
      if (first) {
        first = false;
        return [{ id: r.id, type: 'running' }];
      }
      return [{ id: r.id, type: 'running' }, { id: r.id, type: 'grade', result: { status: 'ok', checks: [] } }];
    });
    const runner = createSqlRunner(f.create, 1000);
    const pending = runner.grade('', 'WITH RECURSIVE ...', [{ name: 'a', tests: 'SELECT 1' }]);
    await vi.advanceTimersByTimeAsync(1001);
    const r = await pending;
    expect(r.status).toBe('timeout');
    expect(r.checks[0]).toMatchObject({ name: 'a', ok: false });
    expect(f.made[0]!.terminate).toHaveBeenCalled();
    expect((await runner.grade('', 'SELECT 1', [])).status).toBe('ok');
    expect(f.made).toHaveLength(2);
    vi.useRealTimers();
  });
  it('reports a worker that cannot load', async () => {
    const f = fakeWorker((r) => [{ id: r.id, type: 'load-failed', error: 'SQLite couldn’t load (404).' }]);
    const r = await createSqlRunner(f.create).run('', 'SELECT 1');
    expect(r).toMatchObject({ status: 'load-failed', message: 'SQLite couldn’t load (404).' });
  });
});
