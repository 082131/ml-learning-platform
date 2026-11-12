import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/retraining-python.json';
import {
  DELAYS,
  POLICIES,
  RETRAIN_SOURCE,
  retrain,
  retrainExperiment,
  retrainPrintout,
  retrainSlots,
  world,
} from './retraining';

describe('retraining', () => {
  it('follows the stated decay model (hand-worked)', () => {
    // Never retrained: week 33 is 33 + 30 = 63 units from week 0, so 0.92 - 0.004 * 63 = 0.668.
    const r = retrain({ policy: 'never', delay: 0 });
    expect(world(33)).toBe(63);
    expect(r.accuracy[33]).toBeCloseTo(0.668, 12);
    expect(r.retrains).toEqual([]);
  });

  it('retrains on drift as soon as the jump happens', () => {
    expect(retrain({ policy: 'drift', delay: 0 }).retrains).toContain(33);
  });

  it('reacts later to the jump when labels arrive later', () => {
    const at = (d: 0 | 2 | 6) => retrain({ policy: 'accuracy', delay: d }).retrains.find((w) => w >= 33);
    expect(at(0)).toBe(33);
    expect(at(2)).toBe(35);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const policy of POLICIES)
      for (const delay of DELAYS) {
        expect(retrainPrintout(retrain({ policy, delay }), { policy, delay })).toBe(table[`${policy},${delay}`]);
        n++;
      }
    expect(n).toBe(15);
  });
});

describe('retrainExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = retrainExperiment('rt');
    expect(validateExperiment(def)).toEqual([]);
    expect(fillSlots(RETRAIN_SOURCE, [], retrainSlots(def.initial)).source).toContain('POLICY = "every-13"');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/retraining.py?raw')).default;
    expect(script).toContain(`SOURCE = """${RETRAIN_SOURCE}"""`);
  });
});
