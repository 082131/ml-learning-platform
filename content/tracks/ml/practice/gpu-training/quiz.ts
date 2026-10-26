import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'mixed-memory',
    type: 'choice',
    prompt:
      'You switch a run from float32 to mixed precision with torch.autocast and keep AdamW. Which part of the memory estimate shrinks?',
    options: [
      {
        text: 'The activations, roughly by half',
        correct: true,
        explain:
          'Autocast runs the forward computation in 16 bits, so stored activations take about half the space. The weights, gradients and Adam moments stay float32: still 16 bytes per parameter.',
      },
      {
        text: 'The weights, gradients and optimizer states, from 16 to 8 bytes per parameter',
        correct: false,
        explain:
          'With autocast the parameters stay float32 and so do their gradients and Adam’s moments. Shrinking those needs other techniques, such as sharding the optimizer state (ZeRO) or 8-bit optimizers.',
      },
      {
        text: 'Nothing; mixed precision only changes speed',
        correct: false,
        explain:
          '16-bit activations take half the memory of 32-bit ones, and activations are often the largest part.',
      },
    ],
  },
  {
    id: 'loader',
    type: 'choice',
    prompt:
      'A run shows compute 0.098 s and loading 0.320 s per step, overlapped. Which change speeds up training the most?',
    options: [
      {
        text: 'A faster data pipeline: more loader workers, or preprocessing the data once ahead of time',
        correct: true,
        explain:
          'The step takes as long as the slower lane, here loading. The GPU is busy only about 31% of the step.',
      },
      {
        text: 'A faster GPU',
        correct: false,
        explain:
          'It would shrink the 0.098 s of compute, but the step would still take 0.320 s waiting for data.',
      },
      {
        text: 'Mixed precision',
        correct: false,
        explain: 'It speeds up compute, which is not the bottleneck here.',
      },
    ],
  },
  {
    id: 'hours',
    type: 'numeric',
    prompt:
      'GPT-2 small has 124,439,808 parameters. Training on 10 billion tokens takes about 6 · parameters · tokens FLOPs. At 40% of an A100’s 312 TFLOPS, how many hours is that? (One decimal.)',
    answer: 16.6,
    tolerance: 0.1,
    hint: '6 × 124,439,808 × 10¹⁰ FLOPs, divided by 0.4 × 312 × 10¹² FLOPs per second, divided by 3600.',
    explain:
      '7.47 × 10¹⁸ FLOPs ÷ 1.248 × 10¹⁴ FLOPs/s ≈ 59,800 s ≈ 16.6 hours, if the data loader keeps up. The utilization is an assumption; measure it on your own run.',
  },
  {
    id: 'checkpointing',
    type: 'choice',
    prompt: 'Turning on activation checkpointing for GPT-2 small at batch 16 does what to the estimate?',
    options: [
      {
        text: 'Activation memory drops from 5.13 GB to 0.73 GB and the FLOPs per step rise by a third (factor 8 instead of 6)',
        correct: true,
        explain:
          'Only each layer’s input is kept, plus one layer’s activations during its backward pass; the rest is recomputed, which costs about one extra forward pass.',
      },
      {
        text: 'Both memory and time drop',
        correct: false,
        explain: 'Recomputation is extra work. Checkpointing trades compute for memory.',
      },
      {
        text: 'The optimizer states drop',
        correct: false,
        explain: 'Checkpointing changes only what is stored from the forward pass.',
      },
    ],
  },
  {
    id: 'timing',
    type: 'choice',
    prompt:
      'You time 100 training steps on a GPU with time.perf_counter() before and after the loop, with no other changes. The result is suspiciously fast. Why?',
    options: [
      {
        text: 'GPU work runs asynchronously; call torch.cuda.synchronize() before reading the clock',
        correct: true,
        explain:
          'CUDA calls return as soon as the work is queued. Synchronizing waits for the queued kernels, so the timer measures the work itself. Also skip the first few steps, which include warm-up.',
      },
      {
        text: 'perf_counter has low resolution',
        correct: false,
        explain: 'It has sub-microsecond resolution; the problem is what is being measured.',
      },
    ],
  },
];

export const maxBatchExercise: Exercise = {
  id: 'max-batch',
  prompt:
    'Write `max_batch(params, act_bytes_per_seq, gpu_gb)` that returns the largest batch size whose estimated memory fits on the GPU, or 0 if not even the model states fit.',
  starter: `def max_batch(params, act_bytes_per_seq, gpu_gb):
    # Memory = 16 bytes per parameter + batch * act_bytes_per_seq.
    # Return the largest whole batch with memory <= gpu_gb * 1e9 (0 if none).
    pass`,
  hints: [
    'The model states take `16 * params` bytes whatever the batch.',
    'What is left is `gpu_gb * 1e9 - 16 * params`; if it is negative, return 0.',
    'Divide what is left by the activation bytes per sequence and round down with `int()` or `//`.',
  ],
  solution: `def max_batch(params, act_bytes_per_seq, gpu_gb):
    free = gpu_gb * 1e9 - 16 * params
    if free < 0:
        return 0
    return int(free // act_bytes_per_seq)`,
  explanation:
    'The fixed part (weights, gradients, optimizer states) comes off the top; activations scale with the batch. In practice leave a margin: the allocator fragments memory and the CUDA context itself takes some.',
  tests: `assert max_batch(124_439_808, 535_000_000, 80) == 145, f"expected 145, got {max_batch(124_439_808, 535_000_000, 80)}"
assert max_batch(1_557_611_200, 1_000_000_000, 16) == 0, 'states alone (24.9 GB) do not fit in 16 GB'
assert max_batch(100, 1, 1e-6) == 0, 'no room left after the states'
assert isinstance(max_batch(10, 3, 1), int), 'return an int'`,
};
