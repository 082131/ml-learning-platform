import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { pyFixed } from './format';
import {
  buildMemoryTrace,
  estimateMemory,
  MEMORY_SOURCE,
  memoryExperiment,
  memoryPrintout,
  memorySlots,
  type MemoryState,
} from './memory';
import { GPT2_SMALL, LLAMA31_70B, LLAMA31_8B, MODELS, paramBreakdown } from './models';
import { hasPython, runPython } from './testPython';

const base: MemoryState = {
  model: 'llama-3.1-8b',
  weights: 'bf16',
  kv: 'bf16',
  batch: 1,
  seqLen: 8192,
  attention: 'fused',
  gpu: 24,
};

describe('parameter counts from the published shapes', () => {
  it('GPT-2 small has 124,439,808 parameters (embeddings tied to the output)', () => {
    // wte 50257·768 + wpe 1024·768 + 12 layers · 7,087,872 + final LayerNorm 1,536
    const p = paramBreakdown(GPT2_SMALL);
    expect(p.embeddings).toBe(50257 * 768 + 1024 * 768);
    expect(p.attention / 12).toBe(4 * 768 * 768 + 4 * 768);
    expect(p.mlp / 12).toBe(2 * 768 * 3072 + 3072 + 768);
    expect(p.outputHead).toBe(0);
    expect(p.total).toBe(124_439_808);
  });

  it('Llama 3.1 8B has 8,030,261,248 and 70B has 70,553,706,496', () => {
    // 8B, one layer: Q, O 4096² each; K, V 4096·1024 each; MLP 3·4096·14336; two RMSNorms 2·4096
    expect(paramBreakdown(LLAMA31_8B).attention / 32).toBe(2 * 4096 * 4096 + 2 * 4096 * 1024);
    expect(paramBreakdown(LLAMA31_8B).total).toBe(8_030_261_248);
    expect(paramBreakdown(LLAMA31_70B).total).toBe(70_553_706_496);
  });
});

describe('estimateMemory', () => {
  it('matches the hand-worked Llama 3.1 8B example: BF16, batch 1, 8,192 tokens', () => {
    const e = estimateMemory(base);
    expect(e.headDim).toBe(128);
    expect(e.weights).toBe(8_030_261_248 * 2); // 16,060,522,496 bytes ≈ 14.96 GiB
    expect(e.kvPerToken).toBe(2 * 32 * 8 * 128 * 2); // 131,072 bytes = 128 KiB per token
    expect(e.kvCache).toBe(131_072 * 8192); // exactly 1 GiB
    expect(e.actWidth).toBe(2 * 4096 + 2 * 14336);
    expect(e.activations).toBe(8192 * 36_864 * 2);
    expect(memoryPrintout(e)).toEqual([
      'weights         14.96 GiB',
      'KV cache         1.00 GiB',
      'activations      0.56 GiB',
      'total           16.52 GiB',
    ]);
    expect(e.fits).toBe(true);
  });

  it('scales the KV cache linearly with batch and sequence length', () => {
    const one = estimateMemory(base).kvCache;
    expect(estimateMemory({ ...base, batch: 4 }).kvCache).toBe(4 * one);
    expect(estimateMemory({ ...base, seqLen: 16384 }).kvCache).toBe(2 * one);
  });

  it('keeps 16-bit activations for integer weights and halves weight bytes from INT8 to INT4', () => {
    const int8 = estimateMemory({ ...base, weights: 'int8' });
    const int4 = estimateMemory({ ...base, weights: 'int4' });
    expect(int8.bytes.act).toBe(2);
    expect(int4.weights).toBe(int8.weights / 2);
  });

  it('adds heads · seq_len score values per token for the naive attention kernel', () => {
    const e = estimateMemory({ ...base, attention: 'naive', seqLen: 1024 });
    expect(e.actWidth).toBe(2 * 4096 + 2 * 14336 + 32 * 1024);
  });

  it('finds the largest batch that fits, and none when the weights alone are too big', () => {
    const e = estimateMemory(base);
    const perSeq = e.kvCache + e.activations;
    expect(e.maxBatch).toBe(Math.floor((24 * 2 ** 30 - e.weights) / perSeq));
    expect(estimateMemory({ ...base, ...{ model: 'llama-3.1-8b', batch: e.maxBatch } }).fits).toBe(true);
    expect(estimateMemory({ ...base, batch: e.maxBatch + 1 }).fits).toBe(false);
    expect(estimateMemory({ ...base, model: 'llama-3.1-70b', gpu: 80 }).maxBatch).toBe(0);
  });
});

describe('the code, its trace and the experiment', () => {
  it('fills every slot and steps through each line with the arithmetic', () => {
    const filled = fillSlots(MEMORY_SOURCE, [], memorySlots(base)).source;
    expect(filled).toContain('params = 8_030_261_248');
    expect(filled).toContain('act_width = 2 * hidden + 2 * intermediate\n');
    const trace = buildMemoryTrace(base);
    expect(trace.source).toBe('computed');
    const kv = trace.steps.find((s) => s.range.line === 9)!;
    expect(kv.note).toContain('2 · 32 · 8 · 128 · 8,192 · 1 · 2 = 1,073,741,824 bytes');
    const lines = filled.split('\n');
    for (const step of trace.steps) expect(lines[step.range.line - 1]).toBeDefined();
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(memoryExperiment('m', base, 'x'))).toEqual([]);
  });

  it('clamps the sequence length to the model context when switching to GPT-2', () => {
    const def = memoryExperiment('m', base);
    const model = def.controls.find((c) => c.id === 'model')!;
    if (model.kind !== 'select') throw new Error('model is a select');
    expect(model.set(base, 'gpt2').seqLen).toBe(1024);
  });

  it('pyFixed rounds exact ties to even, like Python', () => {
    expect(pyFixed(0.125, 2)).toBe('0.12');
    expect(pyFixed(0.375, 2)).toBe('0.38');
    expect(pyFixed(14.957, 2)).toBe('14.96');
  });
});

describe.skipIf(!hasPython())('the printout equals what CPython prints', () => {
  const cases: MemoryState[] = [
    base,
    { ...base, model: 'gpt2', weights: 'fp32', kv: 'fp32', seqLen: 1024, batch: 8, attention: 'naive' },
    { ...base, model: 'llama-3.1-70b', weights: 'int4', kv: 'int8', batch: 16, seqLen: 32768, gpu: 80 },
    { ...base, weights: 'int8', kv: 'fp16', batch: 3, seqLen: 128 },
  ];
  for (const s of Object.values(MODELS)) cases.push({ ...base, model: s.id, seqLen: 512, batch: 5 });
  it.each(cases.map((c) => [`${c.model} ${c.weights} b${c.batch} s${c.seqLen}`, c] as const))(
    '%s',
    (_, s) => {
      const code = fillSlots(MEMORY_SOURCE, [], memorySlots(s)).source;
      expect(runPython(code)).toBe(memoryPrintout(estimateMemory(s)).join('\n'));
    },
  );
});
