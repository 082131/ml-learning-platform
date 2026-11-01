import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { CSV_BYTES, lakeExperiment, neededColumns, scanLake } from './lakeScan';

describe('scanLake', () => {
  it('reads one day’s two column chunks plus its footer from the partitioned layout', () => {
    const r = scanLake({ days: 1, select: 'two' });
    // day=2026-10-30: country 845 + amount 12,043 + footer (125,779 − 122,093 = 3,686) = 16,574 bytes.
    const part = r.scans.find((s) => s.layout === 'partitioned')!;
    expect(r.start).toBe('2026-10-30');
    expect(part.bytes).toBe(845 + 12043 + 3686);
    expect(part.files).toBe(1);
    expect(part.rowsScanned).toBe(2000);
  });

  it('the single Parquet file reads the same columns for every date range, and CSV reads everything', () => {
    const one = scanLake({ days: 1, select: 'two' }).scans;
    const all = scanLake({ days: 30, select: 'two' }).scans;
    // country 22,811 + amount 200,846 + day 409 + footer 3,886.
    expect(one[1]!.bytes).toBe(22811 + 200846 + 409 + 3886);
    expect(all[1]!.bytes).toBe(one[1]!.bytes);
    expect(one[0]!.bytes).toBe(CSV_BYTES);
  });

  it('SELECT * reads every data column and the whole single file', () => {
    expect(neededColumns('all', 'partitioned')).not.toContain('day');
    const r = scanLake({ days: 30, select: 'all' });
    expect(r.scans[1]!.bytes).toBe(3327233);
  });

  it('partitioning and column pruning shrink the read as the range narrows', () => {
    const bytes = [1, 7, 30].map((d) => scanLake({ days: d, select: 'two' }).scans[2]!.bytes);
    expect(bytes[0]! < bytes[1]! && bytes[1]! < bytes[2]!).toBe(true);
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(lakeExperiment('lake'))).toEqual([]);
  });
});
