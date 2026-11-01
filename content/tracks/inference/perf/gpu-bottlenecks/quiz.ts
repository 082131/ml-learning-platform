import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'util',
    type: 'choice',
    prompt:
      'nvidia-smi shows 100% GPU utilization while a language model generates text at batch 1. What does that tell you?',
    options: [
      {
        text: 'Only that a kernel was running throughout; the kernels can still be using a tiny fraction of the GPU’s arithmetic',
        correct: true,
        explain:
          'utilization.gpu is the share of time any kernel ran. A batch-1 linear layer on an A100 reaches about 0.5% of peak FLOP/s while showing 100%.',
      },
      {
        text: 'The GPU is at its limit and a bigger GPU is needed',
        correct: false,
        explain:
          'Memory-bound kernels at 100% utilization often get much faster from batching, which a bigger GPU would not need.',
      },
      {
        text: 'The memory bandwidth is fully used',
        correct: false,
        explain: 'utilization.gpu does not measure bandwidth. DCGM’s DRAM-active counter or a profiler does.',
      },
    ],
  },
  {
    id: 'batch',
    type: 'choice',
    prompt:
      'On an A100 the model estimates a 4096 × 4096 FP16 linear layer at 22.3 µs for batch 1 and 23.4 µs for batch 128. Why so little difference?',
    options: [
      {
        text: 'Both read the same 32 MiB of weights, and reading them is the slow part; the extra rows add arithmetic the GPU had spare',
        correct: true,
        explain:
          'At batch 128 the intensity is about 120 FLOPs per byte, still below the 161 ridge, so time is set by bytes, which barely change.',
      },
      {
        text: 'The GPU processes 128 rows in parallel, so any batch costs the same',
        correct: false,
        explain:
          'Past the ridge (from batch 256 here) time grows with the batch: 32.5 µs at 256 and 115.1 µs at 1,024.',
      },
      {
        text: 'Launch overhead dominates both',
        correct: false,
        explain: 'The launch is 5 µs of the 22 µs; the other 17 µs is reading weights.',
      },
    ],
  },
  {
    id: 'attention',
    type: 'choice',
    prompt: 'Why does batching not raise the arithmetic intensity of attention during generation?',
    options: [
      {
        text: 'Every sequence has its own K and V cache, so more sequences means proportionally more bytes as well as more FLOPs',
        correct: true,
        explain:
          'Batching helps when sequences share data (the weights). The KV cache is not shared, so attention stays at about 1 FLOP per byte at any batch.',
      },
      {
        text: 'Attention cannot run on tensor cores',
        correct: false,
        explain: 'It can; the limit is bytes, not the type of arithmetic unit.',
      },
      {
        text: 'Softmax inside attention is compute-bound',
        correct: false,
        explain: 'Softmax is memory- or launch-bound too.',
      },
    ],
  },
  {
    id: 'stall',
    type: 'numeric',
    prompt:
      'Preparing a batch takes 8 ms on the CPU and running it 5 ms on the GPU, one after the other. With a background loader that overlaps them, what is the GPU utilization? (percent)',
    answer: 62.5,
    tolerance: 0.1,
    hint: 'With overlap, one batch finishes every max(8, 5) ms.',
    explain:
      '5 / 8 = 62.5%, up from 5 / 13 = 38%. The CPU is still the limit: a second worker would let the GPU set the pace.',
  },
];

export const bottleneckExercise: Exercise = {
  id: 'roofline-bottleneck',
  prompt:
    'Write `bottleneck(flops, bytes_moved, peak, bandwidth, launch=5e-6)` that returns the estimated time in seconds and which limit sets it: "launch", "memory" or "compute", as in the lesson’s model.',
  starter: `def bottleneck(flops, bytes_moved, peak, bandwidth, launch=5e-6):
    pass`,
  hints: [
    'compute = flops / peak and memory = bytes_moved / bandwidth.',
    'The time is max(compute, memory) + launch.',
    'It is launch-bound when launch is larger than max(compute, memory); otherwise compare compute with memory.',
  ],
  solution: `def bottleneck(flops, bytes_moved, peak, bandwidth, launch=5e-6):
    compute = flops / peak
    memory = bytes_moved / bandwidth
    work = max(compute, memory)
    if launch > work:
        kind = "launch"
    elif compute >= memory:
        kind = "compute"
    else:
        kind = "memory"
    return work + launch, kind`,
  explanation:
    'The kind tells you which optimization can help. Launch-bound: fuse kernels or capture a CUDA graph. Memory-bound: batch, fuse, or use fewer bytes per value. Compute-bound: lower precision on faster units, or more hardware.',
  tests: `d = 4096
t, kind = bottleneck(2 * d * d, 2 * (d * d + 2 * d), 312e12, 1935e9)
assert kind == "memory", 'a batch-1 linear layer on an A100 is memory-bound'
assert abs(t - 22.3e-6) < 0.1e-6, 'about 22.3 microseconds'
assert bottleneck(2 * 1024 * d * d, 2 * (d * d + 2 * 1024 * d), 312e12, 1935e9)[1] == "compute", 'batch 1024 is compute-bound'
assert bottleneck(d, 6 * d, 312e12, 1935e9)[1] == "launch", 'a 4096-element add is launch-bound'`,
};
