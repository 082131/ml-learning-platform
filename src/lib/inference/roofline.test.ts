import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import {
  GPUS16,
  ROOFLINE_SOURCE,
  roof,
  rooflineExperiment,
  rooflinePrintout,
  rooflineSlots,
  runRoofline,
  runStall,
  stallExperiment,
  type OpId,
  type RooflineState,
} from './roofline';
import { hasPython, runPython } from './testPython';

const base: RooflineState = { gpu: 'a100', op: 'linear', logBatch: 0 };

describe('runRoofline', () => {
  it('a linear layer at batch 1 is memory-bound: about 1 FLOP per byte', () => {
    const r = runRoofline(base);
    expect(r.intensity).toBeCloseTo((2 * 4096 * 4096) / (2 * (4096 * 4096 + 2 * 4096)), 12);
    expect(r.bound).toBe('memory');
    expect(r.ridge).toBeCloseTo(312e12 / 1935e9, 9);
  });
  it('becomes compute-bound once the batch passes the ridge', () => {
    expect(runRoofline({ ...base, logBatch: 7 }).bound).toBe('memory'); // intensity ≈ 124 < 161
    expect(runRoofline({ ...base, logBatch: 8 }).bound).toBe('compute'); // ≈ 241 > 161
  });
  it('attention while generating stays at 1 FLOP per byte at any batch', () => {
    for (const lb of [0, 5, 10])
      expect(runRoofline({ ...base, op: 'attention', logBatch: lb }).intensity).toBe(1);
  });
  it('tiny elementwise ops are launch-bound', () => {
    expect(runRoofline({ ...base, op: 'add' }).bound).toBe('launch');
  });
  it('roof is the minimum of the two ceilings', () => {
    const g = GPUS16.l4!;
    expect(roof(g, 1)).toBe(300e9);
    expect(roof(g, 1e6)).toBe(121e12);
  });
  it('the stall model: serial adds, overlapped takes the max', () => {
    expect(runStall({ cpu: 8, gpu: 5, overlap: 'no' })).toMatchObject({ period: 13, limit: 'CPU' });
    const o = runStall({ cpu: 8, gpu: 5, overlap: 'yes' });
    expect(o.period).toBe(8);
    expect(o.throughput).toBe(4000);
    expect(o.util).toBe(5 / 8);
  });
  it('both are valid experiments', () => {
    expect(validateExperiment(rooflineExperiment('r', base))).toEqual([]);
    expect(validateExperiment(stallExperiment('s', { cpu: 8, gpu: 5, overlap: 'no' }))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('the printout equals what CPython prints', () => {
  const ops: OpId[] = ['linear', 'attention', 'softmax', 'add'];
  const cases: RooflineState[] = ops.flatMap((op) =>
    Object.keys(GPUS16).flatMap((gpu) => [0, 4, 7, 10].map((logBatch) => ({ gpu, op, logBatch }))),
  );
  it('for every operation, GPU and a range of batches', () => {
    const code = cases
      .map((s) => `exec(${JSON.stringify(fillSlots(ROOFLINE_SOURCE, [], rooflineSlots(s)).source)})`)
      .join('\n');
    const expected = cases.flatMap((s) => rooflinePrintout(runRoofline(s))).join('\n');
    expect(runPython(code)).toBe(expected);
  });
});
