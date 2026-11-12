import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from '../inference/testPython';
import { BPW, GPUS, MODELS, OFFLOAD_SOURCE, offloadExperiment, offloadPrintout, offloadSlots, runOffload, type OffloadState } from './offload';

const base: OffloadState = { model: '8b', quant: 'Q4_K_M', gpu: '12', ctx: 8192 };

describe('runOffload', () => {
  it('KV cache of Llama 3.1 8B at 8192 tokens in F16 is 1 GiB (2 · 32 · 8 · 128 · 8192 · 2 bytes)', () => {
    expect(runOffload(base).kvGiB).toBe(1);
  });
  it('8B Q4_K_M fits entirely in 12 GB, so nothing is read from RAM', () => {
    const r = runOffload(base);
    expect(r.ngl).toBe(32);
    expect(r.outputOnGpu).toBe(true);
    expect(r.cpuReadGiB).toBe(0);
  });
  it('70B Q4_K_M on 24 GB offloads only part of the model and is far slower', () => {
    const r = runOffload({ ...base, model: '70b', gpu: '24' });
    expect(r.ngl).toBeGreaterThan(0);
    expect(r.ngl).toBeLessThan(80);
    expect(r.tokensPerSecond).toBeLessThan(runOffload({ ...base, gpu: '24' }).tokensPerSecond / 5);
  });
  it('without a GPU everything is read from RAM', () => {
    const r = runOffload({ ...base, gpu: 'none' });
    expect(r.ngl).toBe(0);
    expect(r.tokensPerSecond).toBeCloseTo(60e9 / (r.cpuReadGiB * 2 ** 30), 9);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(offloadExperiment('o', base))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: OffloadState[] = [];
  for (const model of Object.keys(MODELS) as OffloadState['model'][])
    for (const quant of Object.keys(BPW) as OffloadState['quant'][])
      for (const gpu of Object.keys(GPUS) as OffloadState['gpu'][])
        for (const ctx of [4096, 131072]) cases.push({ model, quant, gpu, ctx });
  it('the printout equals what the lesson code prints', () => {
    const code = cases
      .map((s) => `exec(${JSON.stringify(fillSlots(OFFLOAD_SOURCE, [], offloadSlots(s)).source)}, {})`)
      .join('\n');
    expect(runPython(code)).toBe(cases.flatMap((s) => offloadPrintout(s, runOffload(s))).join('\n'));
  });
});
