import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import {
  AGREEMENT_SOURCE,
  agreement,
  agreementExperiment,
  agreementPrintout,
  agreementSlots,
  ANNOTATORS,
  GUIDELINES,
  kappaBand,
  SAMPLES,
  type Sample,
} from './agreement';
import python from './fixtures/agreement-python.json';

describe('agreement', () => {
  it('computes kappa from a hand-worked confusion matrix', () => {
    // v1, balanced: both toxic 6, both fine 6, A-only 5 (3 profanity + 2 quotes), B-only 3 (sarcasm).
    const r = agreement({ guideline: 'v1', sample: 'balanced', annotatorB: 'careful' });
    expect(r.matrix).toEqual([
      [6, 3],
      [5, 6],
    ]);
    // p_o = 12/20 = 0.6; p_A = 11/20, p_B = 9/20; p_e = 0.55·0.45 + 0.45·0.55 = 0.495; kappa = 0.105/0.505
    expect(r.po).toBeCloseTo(0.6, 12);
    expect(r.pe).toBeCloseTo(0.495, 12);
    expect(r.kappa).toBeCloseTo(0.105 / 0.505, 12);
  });

  it('gives kappa 0 to an annotator who always answers the same, whatever the raw agreement', () => {
    const r = agreement({ guideline: 'v1', sample: 'rare', annotatorB: 'lazy' });
    expect(r.po).toBeCloseTo(0.85, 12);
    expect(r.kappa).toBeCloseTo(0, 12);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const guideline of GUIDELINES)
      for (const sample of Object.keys(SAMPLES) as Sample[])
        for (const annotatorB of ANNOTATORS) {
          expect(agreementPrintout(agreement({ guideline, sample, annotatorB }))).toBe(
            table[`${guideline},${sample},${annotatorB}`],
          );
          n++;
        }
    expect(n).toBe(8);
  });

  it('names the conventional kappa bands', () => {
    expect(kappaBand(0.1)).toBe('slight or none');
    expect(kappaBand(0.9)).toBe('almost perfect');
  });
});

describe('agreementExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = agreementExperiment('ag');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(AGREEMENT_SOURCE, [], agreementSlots(def.initial));
    expect(source).toContain('A = [1, 1, 1, 1, 1, 1, 0,');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/agreement.py?raw')).default;
    expect(script).toContain(`SOURCE = """${AGREEMENT_SOURCE}"""`);
  });
});
