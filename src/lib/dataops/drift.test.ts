import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import {
  DRIFT_SOURCE,
  drift,
  driftExperiment,
  driftPrintout,
  driftSlots,
  ksPValue,
  ksStatistic,
  psi,
  psiBand,
  SHIFTS,
  WINDOWS,
} from './drift';
import python from './fixtures/drift-python.json';

describe('drift statistics', () => {
  it('computes the KS statistic as the largest CDF gap (hand-worked)', () => {
    // a = 1, 2, 3, 4; b = 3, 4, 5, 6. After 2 the CDFs are 0.5 and 0: D = 0.5.
    expect(ksStatistic([1, 2, 3, 4], [3, 4, 5, 6])).toBe(0.5);
    expect(ksStatistic([1, 2], [1, 2])).toBe(0);
  });

  it('gives p near 1 for D = 0 and tiny p for a large D on big samples', () => {
    expect(ksPValue(0, 100, 100)).toBe(1);
    expect(ksPValue(0.5, 1000, 1000)).toBeLessThan(1e-10);
  });

  it('gives PSI 0 for identical samples and reads the bands', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i);
    expect(psi(xs, xs).value).toBe(0);
    expect([psiBand(0.05), psiBand(0.2), psiBand(0.3)]).toEqual(['stable', 'investigate', 'major shift']);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const shift of SHIFTS)
      for (const window of WINDOWS) {
        expect(driftPrintout(drift({ shift, window }), { shift, window })).toBe(table[`${shift},${window}`]);
        n++;
      }
    expect(n).toBe(15);
  });
});

describe('driftExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = driftExperiment('drift');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(DRIFT_SOURCE, [], driftSlots(def.initial));
    expect(source).toContain('SHIFT = 0.05 ');
    expect(source).toContain('WINDOW = 200 ');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/drift.py?raw')).default;
    expect(script).toContain(`SOURCE = """${DRIFT_SOURCE}"""`);
  });
});
