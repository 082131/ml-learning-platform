import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/label-errors-python.json';
import {
  LABEL_ERRORS_SOURCE,
  labelErrors,
  labelErrorsExperiment,
  labelErrorsPrintout,
  labelErrorsSlots,
  METHODS,
  perClassThresholds,
} from './labelErrors';

describe('labelErrors', () => {
  it('computes per-class thresholds as average self-confidence', () => {
    const [cat, dog] = perClassThresholds();
    // dogs: (0.66 + 0.48 + 0.55 + 0.74 + 0.45 + 0.61 + 0.18 + 0.32) / 8 = 3.99 / 8
    expect(dog).toBeCloseTo(3.99 / 8, 12);
    expect(cat).toBeCloseTo(0.719375, 12);
  });

  it('flags only real errors with per-class thresholds, and two correct labels at a 0.5 cutoff', () => {
    expect(labelErrors({ method: 'per-class' }).flags.every((f) => f.reallyWrong)).toBe(true);
    expect(labelErrors({ method: '0.5' }).flags.filter((f) => !f.reallyWrong)).toHaveLength(2);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    for (const method of METHODS) expect(labelErrorsPrintout(labelErrors({ method }))).toBe(table[method]);
  });
});

describe('labelErrorsExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = labelErrorsExperiment('le');
    expect(validateExperiment(def)).toEqual([]);
    expect(fillSlots(LABEL_ERRORS_SOURCE, [], labelErrorsSlots(def.initial)).source).toContain('METHOD = "0.5"');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/label_errors.py?raw')).default;
    expect(script).toContain(`SOURCE = """${LABEL_ERRORS_SOURCE}"""`);
  });
});
