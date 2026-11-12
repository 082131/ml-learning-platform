import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from '../inference/testPython';
import { KV_BYTES_PER_TOKEN, PAGED_SOURCE, lengthOf, pagedExperiment, pagedPrintout, pagedSlots, runPaged, type PagedState } from './pagedKv';

const base: PagedState = { budget: 16, maxLen: 8192, block: 16 };

describe('runPaged', () => {
  it('128 KiB per token for Llama 3.1 8B in F16', () => {
    expect(KV_BYTES_PER_TOKEN).toBe(131072);
  });
  it('contiguous: 16 GiB / (8192 tokens × 128 KiB) = 16 sequences', () => {
    expect(runPaged(base).contiguous).toBe(16);
  });
  it('paged: 16 GiB holds 8192 blocks of 16 tokens, and many more sequences', () => {
    const r = runPaged(base);
    expect(r.blocks).toBe(8192);
    expect(r.paged).toBeGreaterThan(5 * r.contiguous);
    expect(r.pagedUse).toBeGreaterThan(0.99);
  });
  it('lengths stay between 200 and 2000', () => {
    const ls = Array.from({ length: 256 }, (_, i) => lengthOf(i));
    expect(Math.min(...ls)).toBeGreaterThanOrEqual(200);
    expect(Math.max(...ls)).toBeLessThanOrEqual(2000);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(pagedExperiment('p', base))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: PagedState[] = [];
  for (const budget of [2, 16, 40, 60]) for (const maxLen of [2048, 32768]) for (const block of [8, 32]) cases.push({ budget, maxLen, block });
  cases.push(base);
  it('the printout equals what the lesson code prints', () => {
    const code = cases.map((s) => `exec(${JSON.stringify(fillSlots(PAGED_SOURCE, [], pagedSlots(s)).source)}, {})`).join('\n');
    expect(runPython(code)).toBe(cases.flatMap((s) => pagedPrintout(s, runPaged(s))).join('\n'));
  });
});
