import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/snapshots-python.json';
import {
  FILE_SIZES,
  PATTERNS,
  SHARES,
  SNAPSHOT_SOURCE,
  snapshotExperiment,
  snapshotPrintout,
  snapshots,
  snapshotSlots,
} from './snapshots';

describe('snapshots', () => {
  it('rewrites one or two files for a clustered block (hand-worked)', () => {
    // 100 contiguous rows touch one 1,000-row file unless they straddle a boundary.
    const r = snapshots({ pattern: 'clustered', share: 0.001, fileRows: 1000 });
    for (const f of r.filesPerVersion) expect([1, 2]).toContain(f);
    expect(r.fullCopy).toBe(1_100_000);
  });

  it('rewrites nearly every file when 1% of rows change at random', () => {
    const r = snapshots({ pattern: 'random', share: 0.01, fileRows: 1000 });
    expect(Math.min(...r.filesPerVersion)).toBeGreaterThan(95);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const pattern of PATTERNS)
      for (const share of SHARES)
        for (const fileRows of FILE_SIZES) {
          const s = { pattern, share, fileRows };
          expect(snapshotPrintout(snapshots(s), s)).toBe(table[`${pattern},${share},${fileRows}`]);
          n++;
        }
    expect(n).toBe(12);
  });
});

describe('snapshotExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = snapshotExperiment('snap');
    expect(validateExperiment(def)).toEqual([]);
    expect(fillSlots(SNAPSHOT_SOURCE, [], snapshotSlots(def.initial)).source).toContain('FILE_ROWS = 1000 ');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/snapshots.py?raw')).default;
    expect(script).toContain(`SOURCE = """${SNAPSHOT_SOURCE}"""`);
  });
});
