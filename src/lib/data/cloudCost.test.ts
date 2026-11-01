import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/cloud-cost-python.json';
import {
  COST_SOURCE,
  costExperiment,
  costPrintout,
  costSlots,
  estimateCost,
  type Lifecycle,
  type ScanMode,
} from './cloudCost';

describe('estimateCost', () => {
  it('works through month 12 by hand', () => {
    const r = estimateCost({ newGb: 500, lifecycle: 'infrequent', queries: 100, scan: 'recent' });
    // 1,500 GB × 0.023 + 4,500 GB × 0.0125 = 34.50 + 56.25 = 90.75.
    expect(r.storage).toBeCloseTo(90.75, 10);
    // 100 × 30 queries × (500 × 7 / 30 GB) / 1000 × $5 = 1,750.
    expect(r.queryCost).toBeCloseTo(1750, 9);
  });

  it('flags full scans over archived data', () => {
    expect(estimateCost({ newGb: 500, lifecycle: 'archive', queries: 0, scan: 'full' }).archiveConflict).toBe(
      true,
    );
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (let gb = 100; gb <= 1000; gb += 100)
      for (const lifecycle of ['none', 'infrequent', 'archive'] as Lifecycle[])
        for (const queries of [0, 50, 100, 150, 200])
          for (const scan of ['recent', 'full'] as ScanMode[]) {
            const r = estimateCost({ newGb: gb, lifecycle, queries, scan });
            expect(costPrintout(r)).toBe(table[`${gb},${lifecycle},${queries},${scan}`]);
            n++;
          }
    expect(n).toBe(300);
  });
});

describe('costExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = costExperiment('cost');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(COST_SOURCE, [], costSlots(def.initial));
    expect(source).toContain('NEW_GB = 500 ');
    expect(source).toContain('SCAN = "full"');
  });

  it('embeds COST_SOURCE verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/cloud_cost.py?raw')).default;
    expect(script).toContain(`SOURCE = """${COST_SOURCE}"""`);
  });
});
