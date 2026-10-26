import { describe, expect, it } from 'vitest';
import { estimate, printedLines, withCommas, type GpuState } from './gpuTraining';

// Printed by the lesson's Python (CPython 3.13.16) for each state.
const CASES: { state: GpuState; lines: string[] }[] = [
  {
    state: {
      gpu: 'A100 80GB',
      model: 'GPT-2 small',
      precision: 'mixed',
      batch: 16,
      checkpointing: false,
      fusedAttention: true,
      utilization: 0.4,
      loaderSamplesPerS: 400,
      overlap: true,
      tokensB: 10,
    },
    lines: [
      'model      GPT-2 small, 124,439,808 parameters',
      'memory     states 1.99 GB + activations 5.13 GB + logits 3.29 GB = 10.42 GB of 80 GB: fits',
      'step       compute 0.098 s, loading 0.040 s, step 0.098 s (overlapped)',
      'throughput 167,149 tokens/s, GPU busy 100% of the step',
      'time       16.6 h for 10 B tokens (at 40% of 312 TFLOPS bfloat16)',
    ],
  },
  {
    state: {
      gpu: 'T4',
      model: 'GPT-2 small',
      precision: 'fp32',
      batch: 16,
      checkpointing: false,
      fusedAttention: false,
      utilization: 0.4,
      loaderSamplesPerS: 400,
      overlap: false,
      tokensB: 10,
    },
    lines: [
      'model      GPT-2 small, 124,439,808 parameters',
      'memory     states 1.99 GB + activations 34.43 GB + logits 3.29 GB = 39.71 GB of 16 GB: does NOT fit',
      'step       compute 3.776 s, loading 0.040 s, step 3.816 s (one after the other)',
      'throughput 4,294 tokens/s, GPU busy 99% of the step',
      'time       646.9 h for 10 B tokens (at 40% of 8.1 TFLOPS float32)',
    ],
  },
  {
    state: {
      gpu: 'T4',
      model: 'GPT-2 small',
      precision: 'mixed',
      batch: 4,
      checkpointing: true,
      fusedAttention: true,
      utilization: 0.35,
      loaderSamplesPerS: 50,
      overlap: true,
      tokensB: 1,
    },
    lines: [
      'model      GPT-2 small, 124,439,808 parameters',
      'memory     states 1.99 GB + activations 0.18 GB + logits 0.82 GB = 3.00 GB of 16 GB: fits',
      'step       compute 0.179 s, loading 0.080 s, step 0.179 s (overlapped)',
      'throughput 22,852 tokens/s, GPU busy 100% of the step',
      'time       12.2 h for 1 B tokens (at 35% of 65 TFLOPS float16)',
    ],
  },
  {
    state: {
      gpu: 'H100 SXM',
      model: 'GPT-2 XL',
      precision: 'mixed',
      batch: 64,
      checkpointing: false,
      fusedAttention: false,
      utilization: 0.55,
      loaderSamplesPerS: 2000,
      overlap: true,
      tokensB: 100,
    },
    lines: [
      'model      GPT-2 XL, 1,557,611,200 parameters',
      'memory     states 24.92 GB + activations 573.78 GB + logits 13.17 GB = 611.88 GB of 80 GB: does NOT fit',
      'step       compute 1.125 s, loading 0.032 s, step 1.125 s (overlapped)',
      'throughput 58,233 tokens/s, GPU busy 100% of the step',
      'time       477.0 h for 100 B tokens (at 55% of 989.5 TFLOPS bfloat16)',
    ],
  },
  {
    state: {
      gpu: 'L4',
      model: 'GPT-2 medium',
      precision: 'mixed',
      batch: 8,
      checkpointing: true,
      fusedAttention: false,
      utilization: 0.3,
      loaderSamplesPerS: 25,
      overlap: false,
      tokensB: 5,
    },
    lines: [
      'model      GPT-2 medium, 354,823,168 parameters',
      'memory     states 5.68 GB + activations 1.36 GB + logits 1.65 GB = 8.68 GB of 24 GB: fits',
      'step       compute 0.641 s, loading 0.320 s, step 0.961 s (one after the other)',
      'throughput 8,528 tokens/s, GPU busy 67% of the step',
      'time       162.9 h for 5 B tokens (at 30% of 121 TFLOPS bfloat16)',
    ],
  },
  {
    state: {
      gpu: 'A100 80GB',
      model: 'GPT-2 large',
      precision: 'fp32',
      batch: 1,
      checkpointing: false,
      fusedAttention: true,
      utilization: 0.7,
      loaderSamplesPerS: 100,
      overlap: true,
      tokensB: 1,
    },
    lines: [
      'model      GPT-2 large, 774,030,080 parameters',
      'memory     states 12.38 GB + activations 3.21 GB + logits 0.21 GB = 15.80 GB of 80 GB: fits',
      'step       compute 0.348 s, loading 0.010 s, step 0.348 s (overlapped)',
      'throughput 2,939 tokens/s, GPU busy 100% of the step',
      'time       94.5 h for 1 B tokens (at 70% of 19.5 TFLOPS float32)',
    ],
  },
];

describe('estimate', () => {
  for (const c of CASES) {
    it(`prints what Python prints for ${c.state.gpu}, ${c.state.model}, ${c.state.precision}, batch ${c.state.batch}`, () => {
      expect(printedLines(c.state, estimate(c.state))).toEqual(c.lines);
    });
  }

  it('formats thousands like Python', () => {
    expect(withCommas('1234567.5')).toBe('1,234,567.5');
    expect(withCommas('999')).toBe('999');
  });
});
