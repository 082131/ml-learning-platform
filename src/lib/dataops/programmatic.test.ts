import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/programmatic-python.json';
import {
  LF_NAMES,
  LF_SOURCE,
  programmatic,
  programmaticExperiment,
  programmaticPrintout,
  programmaticSlots,
  type ProgrammaticState,
} from './programmatic';

const fromMask = (mask: string) =>
  Object.fromEntries(LF_NAMES.map((n, i) => [n, mask[i] === '1'])) as ProgrammaticState;

describe('programmatic', () => {
  it('labels by majority and leaves ties unlabeled', () => {
    const r = programmatic(fromMask('10010'));
    // "Thanks, the refund arrived today": refund_word says 1, thanks says 0 -> tie, unlabeled.
    const row = r.rows.find((x) => x.text.startsWith('Thanks, the refund'))!;
    expect(row.votes).toEqual([1, 0]);
    expect(row.weak).toBeNull();
    expect(row.conflict).toBe(true);
  });

  it('prints exactly what the lesson’s Python prints, for all 32 combinations', () => {
    const table = python as Record<string, string>;
    expect(Object.keys(table)).toHaveLength(32);
    for (const [mask, out] of Object.entries(table))
      expect(programmaticPrintout(programmatic(fromMask(mask)))).toBe(out);
  });
});

describe('programmaticExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = programmaticExperiment('lf');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(LF_SOURCE, [], programmaticSlots(def.initial));
    expect(source).toContain('ACTIVE = ["refund_word"]');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/programmatic.py?raw')).default;
    expect(script).toContain(`SOURCE = """${LF_SOURCE}"""`);
  });
});
