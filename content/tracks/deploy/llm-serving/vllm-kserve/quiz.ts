import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'contig',
    type: 'numeric',
    prompt:
      'A server has 24 GiB for the KV cache of Llama 3.1 8B in F16 (128 KiB per token) and reserves max_model_len = 16,384 tokens per sequence. How many sequences fit with contiguous allocation?',
    answer: 12,
    tolerance: 0,
    hint: 'One sequence reserves 16,384 × 128 KiB.',
    explain: '16,384 × 128 KiB = 2 GiB per sequence, and 24 / 2 = 12, however short the actual conversations are.',
  },
  {
    id: 'waste',
    type: 'choice',
    prompt: 'With block_size 16, what is the most KV memory a single sequence can waste under paging?',
    options: [
      {
        text: 'Up to max_model_len minus its length, as with contiguous allocation',
        correct: false,
        explain: 'That is what paging removes: blocks are allocated only as the sequence grows.',
      },
      {
        text: 'Half of its blocks on average, because blocks are allocated in pairs',
        correct: false,
        explain: 'Blocks are allocated one at a time, when the previous one is full.',
      },
      {
        text: '15 token slots: only its last block can be partly empty',
        correct: true,
        explain: 'Internal fragmentation is under one block per sequence, which is why utilization is above 98% in the experiment.',
      },
    ],
  },
  {
    id: 'continuous',
    type: 'choice',
    prompt:
      'In a batch of 32 requests, one answer is 2,000 tokens long and the rest about 100. How does continuous batching help compared with waiting for the whole batch?',
    options: [
      {
        text: 'Finished requests leave after any step and waiting ones join, so slots are not held idle by the long one',
        correct: true,
        explain:
          'With static batching, 31 slots sit empty for about 1,900 steps. Iteration-level scheduling refills them, which is where most of vLLM’s throughput gain comes from, together with paging.',
      },
      {
        text: 'It splits the long answer across several GPUs so it finishes sooner',
        correct: false,
        explain: 'That is closer to tensor parallelism, and it does not help the other 31 requests.',
      },
      {
        text: 'It cuts the long answer at the batch’s average length and resumes it in the next batch',
        correct: false,
        explain: 'Requests are never truncated by the scheduler; they may be preempted under memory pressure, then resumed.',
      },
    ],
  },
  {
    id: 'which-server',
    type: 'choice',
    prompt:
      'You must serve an ONNX image classifier and a scikit-learn model next to each other on Kubernetes GPUs, with batching of single-image requests. Which fits best?',
    options: [
      {
        text: 'vLLM with a large --max-model-len',
        correct: false,
        explain: 'vLLM is built for generative language models; it does not serve ONNX classifiers.',
      },
      {
        text: 'Triton Inference Server (directly or as a KServe runtime) with dynamic batching',
        correct: true,
        explain:
          'Triton serves many frameworks from one model repository and batches individual requests on the server, controlled in config.pbtxt.',
      },
      {
        text: 'llama.cpp’s llama-server with one slot per model',
        correct: false,
        explain: 'llama.cpp runs GGUF language models only.',
      },
    ],
  },
];

export const pagedExercise: Exercise = {
  id: 'paged-count',
  prompt:
    'Write `paged_fit(lengths, total_blocks, block)` that admits sequences in order while their blocks fit, and returns how many were admitted.',
  starter: `import math


def paged_fit(lengths, total_blocks, block):
    pass`,
  hints: [
    'Each sequence needs math.ceil(n / block) blocks.',
    'Keep a running total; stop at the first sequence that does not fit.',
  ],
  solution: `import math


def paged_fit(lengths, total_blocks, block):
    used = count = 0
    for n in lengths:
        need = math.ceil(n / block)
        if used + need > total_blocks:
            break
        used += need
        count += 1
    return count`,
  explanation:
    'A real scheduler keeps admitting as sequences finish and frees their blocks, and may preempt a running sequence when blocks run out while it grows.',
  tests: `assert paged_fit([16, 17, 1], 3, 16) == 2, '16 tokens is 1 block, 17 tokens is 2: 3 blocks for 2 sequences'
assert paged_fit([100] * 10, 70, 16) == 10, '7 blocks each, 70 in all'
assert paged_fit([100] * 10, 69, 16) == 9, 'one block short for the tenth'
assert paged_fit([], 10, 16) == 0, 'no sequences'`,
};
