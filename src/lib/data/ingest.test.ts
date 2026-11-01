import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/ingest-python.json';
import {
  idCounts,
  INGEST_SOURCE,
  ingestExperiment,
  ingestPrintout,
  ingestSlots,
  RETRIES_MAX,
  simulateIngest,
  type Fault,
  type WriteMode,
} from './ingest';

describe('simulateIngest', () => {
  it('backs off 1 s then 2 s on a flaky page and still loads everything once', () => {
    const r = simulateIngest({ pageSize: 5, fault: 'flaky', mode: 'append', retries: 2 });
    expect(r.events.filter((e) => e.kind === 'retry').map((e) => (e.kind === 'retry' ? e.wait : 0))).toEqual([
      1, 2,
    ]);
    expect(r.waited).toBe(3);
    expect(r.table).toHaveLength(23);
    expect(r.succeeded).toBe(true);
  });

  it('a rerun after a crash appends pages 1 to 3 twice, and an upsert does not', () => {
    // Page size 5: pages 1 to 3 hold ids 1 to 15, so the rerun writes 15 rows again: 23 + 15 = 38.
    const append = simulateIngest({ pageSize: 5, fault: 'crash', mode: 'append', retries: 0 });
    expect(append.table).toHaveLength(38);
    expect(idCounts(append).slice(0, 16)).toEqual([...Array(15).fill(2), 1]);
    const upsert = simulateIngest({ pageSize: 5, fault: 'crash', mode: 'upsert', retries: 0 });
    expect(upsert.table).toHaveLength(23);
  });

  it('gives up when the retries run out', () => {
    const r = simulateIngest({ pageSize: 10, fault: 'rate-limit', mode: 'append', retries: 0 });
    expect(r.succeeded).toBe(false);
    expect(r.table).toHaveLength(10);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const pageSize of [5, 10])
      for (const fault of ['none', 'rate-limit', 'flaky', 'crash'] as Fault[])
        for (const mode of ['append', 'upsert'] as WriteMode[])
          for (let retries = 0; retries <= RETRIES_MAX; retries++) {
            const r = simulateIngest({ pageSize, fault, mode, retries });
            expect(ingestPrintout(r, retries)).toBe(table[`${pageSize},${fault},${mode},${retries}`]);
            n++;
          }
    expect(n).toBe(64);
  });
});

describe('ingestExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = ingestExperiment('ingest');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(INGEST_SOURCE, [], ingestSlots(def.initial));
    expect(source).toContain('PAGE_SIZE = 5\n');
    expect(source).toContain('FAULT = "flaky"');
  });

  it('embeds INGEST_SOURCE verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/ingest.py?raw')).default;
    expect(script).toContain(`SOURCE = """${INGEST_SOURCE}"""`);
  });
});
