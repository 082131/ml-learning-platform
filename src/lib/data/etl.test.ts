import { describe, expect, it } from 'vitest';
import pythonSource from './fixtures/etl.py?raw';
import fixture from './fixtures/etl-python.json';
import {
  BAD_RECORDS,
  fateOf,
  problem,
  countIds,
  pyFloat,
  pyFromIsoformat,
  runPipeline,
  sqliteCastReal,
  sqliteDatetimeValid,
  type BadRecord,
} from './etl';
import { ETL_PYTHON, ELT_SQL, ELT_UNVALIDATED_SQL } from './etlSources';

interface Expected {
  raw: number;
  loaded: number;
  stored: [number, number][];
  quarantine: [string, string][];
  error: [string, string] | null;
  revenue: [string, number][];
}

describe('runPipeline matches the real pipeline (CPython 3.13, SQLite 3.45.1)', () => {
  const table = fixture as unknown as Record<string, Expected>;
  for (const mode of ['etl', 'elt'] as const)
    for (const bad of Object.keys(BAD_RECORDS) as BadRecord[])
      for (const validation of [true, false])
        it(`${mode}, ${bad}, validation ${validation ? 'on' : 'off'}`, () => {
          const want = table[`${mode},${bad},${validation ? 'on' : 'off'}`]!;
          const got = runPipeline(mode, bad, validation);
          expect(got.raw).toBe(want.raw);
          expect(got.stored).toEqual(want.stored);
          expect(got.quarantine.map((q) => [q.orderId, q.reason]).sort()).toEqual(want.quarantine);
          expect(got.failure && [got.failure.stage, got.failure.error]).toEqual(want.error);
          expect(got.revenue).toEqual(want.revenue);
        });
});

describe('Python and SQLite behaviors', () => {
  it('float() and fromisoformat() raise like Python', () => {
    expect(pyFloat('45.50')).toBe(45.5);
    expect(pyFloat('-20.00')).toBe(-20);
    expect(() => pyFloat('12,50')).toThrow("ValueError: could not convert string to float: '12,50'");
    expect(pyFromIsoformat('2026-10-01T09:15:00Z')).toBe('2026-10-01T09:15:00+00:00');
    expect(() => pyFromIsoformat('2026-13-01T14:10:00Z')).toThrow('month must be in 1..12');
    expect(() => pyFromIsoformat('2026-02-30T14:10:00Z')).toThrow('day is out of range for month');
  });
  it('CAST AS REAL keeps the numeric prefix, and datetime() checks the ranges', () => {
    expect(sqliteCastReal('12,50')).toBe(12);
    expect(sqliteCastReal('abc')).toBe(0);
    expect(sqliteCastReal('4550')).toBe(4550);
    expect(sqliteDatetimeValid('2026-10-01T09:15:00Z')).toBe(true);
    expect(sqliteDatetimeValid('2026-13-01T14:10:00Z')).toBe(false);
  });
  it('flags both copies of a duplicate id', () => {
    const rows = [
      { order_id: '1', email: 'a@b', amount: '1', country: 'GB', ordered_at: '2026-10-01T09:15:00Z' },
      { order_id: '1', email: 'c@d', amount: '2', country: 'GB', ordered_at: '2026-10-01T09:15:00Z' },
    ];
    const counts = countIds(rows);
    expect(rows.map((r) => problem(r, counts))).toEqual(['duplicate order_id', 'duplicate order_id']);
  });
  it('describes what happened to the injected record', () => {
    expect(fateOf(runPipeline('elt', 'comma', false), 'comma')).toEqual({
      fate: 'loaded-wrong',
      text: expect.stringContaining('with amount 12.0'),
    });
    expect(fateOf(runPipeline('etl', 'comma', false), 'comma').fate).toBe('failed');
    expect(fateOf(runPipeline('etl', 'comma', true), 'comma').fate).toBe('quarantined');
    expect(fateOf(runPipeline('etl', 'none', true), 'none').fate).toBe('clean');
  });
});

describe('the code shown in the lesson is the code that ran', () => {
  const block = (name: string) => {
    const start = pythonSource.indexOf(`# --- lesson: ${name} ---\n`);
    const end = pythonSource.indexOf('# --- end lesson ---', start);
    return pythonSource.slice(start, end).split('\n').slice(1).join('\n').trim();
  };
  const sqlOf = (py: string) => py.slice(py.indexOf('"""') + 3, py.lastIndexOf('"""')).trim();
  it('matches fixtures/etl.py', () => {
    expect(ETL_PYTHON).toBe(block('validate'));
    expect(ELT_SQL).toBe(sqlOf(block('elt-sql')));
    expect(ELT_UNVALIDATED_SQL).toBe(sqlOf(block('elt-unvalidated')));
  });
});

describe('etlExperiment and its diagram', async () => {
  const { etlExperiment, pipelineDiagram, recordRows } = await import('./etlExperiment');
  const { validateExperiment } = await import('../experiment');
  it('is valid', () => expect(validateExperiment(etlExperiment('etl'))).toEqual([]));
  it('marks the failing step and the quarantine', () => {
    const failed = pipelineDiagram(runPipeline('etl', 'comma', false), 'comma');
    expect(failed.nodes.find((n) => n.id === 'transform')!.status).toBe('error');
    expect(failed.nodes.find((n) => n.id === 'orders')!.detail).toBe('no rows loaded');
    expect(failed.nodes.some((n) => n.id === 'quarantine')).toBe(false);
    const caught = pipelineDiagram(runPipeline('elt', 'country', true), 'country');
    expect(caught.nodes.find((n) => n.id === 'quarantine')).toMatchObject({
      status: 'warn',
      detail: '1 row',
    });
    expect(caught.nodes.find((n) => n.id === 'raw')!.detail).toBe('warehouse · 6 rows');
    const wrong = pipelineDiagram(runPipeline('elt', 'comma', false), 'comma');
    expect(wrong.nodes.find((n) => n.id === 'orders')!.status).toBe('warn');
  });
  it('says where each record went', () => {
    const rows = recordRows(runPipeline('elt', 'comma', false), 'comma');
    expect(rows[5]!.where).toBe('orders (amount 12.0)');
    expect(recordRows(runPipeline('etl', 'duplicate', false), 'duplicate')[0]!.where).toBe(
      'not loaded: the batch failed',
    );
  });
});
