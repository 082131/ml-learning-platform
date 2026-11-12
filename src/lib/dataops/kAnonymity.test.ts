import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/k-anonymity-python.json';
import {
  AGES,
  generalize,
  K_ANON_SOURCE,
  kAnonExperiment,
  kAnonPrintout,
  kAnonSlots,
  kAnonymity,
  SEXES,
  ZIPS,
} from './kAnonymity';

describe('kAnonymity', () => {
  it('generalizes age into bands and masks postcode digits (hand-worked)', () => {
    expect(generalize(58, '10407', 'F', { age: '10y', zip: 3, sex: 'drop' })).toEqual(['50-59', '104**', '*']);
    expect(generalize(58, '10407', 'F', { age: '20y', zip: 0, sex: 'keep' })).toEqual(['40-59', '*****', 'F']);
  });

  it('is 4-anonymous but not diverse when the fifties group shares one diagnosis', () => {
    const r = kAnonymity({ age: '10y', zip: 3, sex: 'drop' });
    expect([r.k, r.l]).toEqual([4, 1]);
    expect(r.targetDiagnoses).toEqual(['diabetes']);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const age of AGES)
      for (const zip of ZIPS)
        for (const sex of SEXES) {
          expect(kAnonPrintout(kAnonymity({ age, zip, sex }))).toBe(table[`${age},${zip},${sex}`]);
          n++;
        }
    expect(n).toBe(18);
  });
});

describe('kAnonExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = kAnonExperiment('ka');
    expect(validateExperiment(def)).toEqual([]);
    expect(fillSlots(K_ANON_SOURCE, [], kAnonSlots(def.initial)).source).toContain('ZIP_DIGITS = 5 ');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/k_anonymity.py?raw')).default;
    expect(script).toContain(`SOURCE = """${K_ANON_SOURCE}"""`);
  });
});
