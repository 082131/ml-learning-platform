import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from '../inference/testPython';
import {
  QUANT_SOURCE,
  blockQuantExperiment,
  quantPrintout,
  quantSlots,
  quantizeBlock,
  roundAway,
  runQuant,
  type QuantState,
} from './blockQuant';

describe('block quantization', () => {
  it('Q4_0 by hand: the largest-magnitude weight maps to q = 0 (that is −8)', () => {
    // m = -0.8, d = -0.8 / -8 = 0.1; 0.25 / 0.1 + 8.5 = 11 -> 11; -0.8 / 0.1 + 8.5 = 0.5 -> 0
    const r = quantizeBlock([0.25, -0.8, 0.0, 0.7], 'Q4_0');
    expect(r.q).toEqual([11, 0, 8, 15]);
    expect(r.deq[1]).toBeCloseTo(-0.8, 3);
  });
  it('Q8_0 rounds halves away from zero, like C roundf', () => {
    expect(roundAway(2.5)).toBe(3);
    expect(roundAway(-2.5)).toBe(-3);
    expect(quantizeBlock([1.27, -0.635], 'Q8_0').q).toEqual([127, -64]);
  });
  it('an outlier coarsens only its own block in Q4_0, but every weight with one scale per tensor', () => {
    const blocks = runQuant({ format: 'Q4_0', outlier: 'on' }).blocks;
    const whole = runQuant({ format: 'INT4_TENSOR', outlier: 'on' }).blocks;
    expect(blocks[0]!.maxErr).toBeLessThan(blocks[1]!.maxErr);
    expect(whole[0]!.maxErr).toBeGreaterThan(blocks[0]!.maxErr * 5);
  });
  it('bits per weight include the 16-bit scale', () => {
    expect(runQuant({ format: 'Q8_0', outlier: 'off' }).bpw).toBe(8.5);
    expect(runQuant({ format: 'Q4_0', outlier: 'off' }).bpw).toBe(4.5);
    expect(runQuant({ format: 'INT4_TENSOR', outlier: 'off' }).bpw).toBe(4.25);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(blockQuantExperiment('q', { format: 'Q4_0', outlier: 'off' }))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: QuantState[] = (['Q8_0', 'Q4_0', 'INT4_TENSOR'] as const).flatMap((format) =>
    (['off', 'on'] as const).map((outlier) => ({ format, outlier })),
  );
  it('the printout equals what the lesson code prints', () => {
    const code = cases
      .map((s) => `exec(${JSON.stringify(fillSlots(QUANT_SOURCE, [], quantSlots(s)).source)}, {})`)
      .join('\n');
    expect(runPython(code)).toBe(cases.flatMap((s) => quantPrintout(runQuant(s))).join('\n'));
  });
});
