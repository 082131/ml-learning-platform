import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'mem-13b',
    type: 'numeric',
    prompt: 'Plan the GPU memory, in GB, for a full fine-tune of a 13B model in mixed precision with Adam, using 16 bytes per parameter and 1.2 headroom.',
    answer: 249.6,
    tolerance: 0.01,
    hint: '13 × 16 × 1.2.',
    explain: '13 × 16 = 208 GB of weights, gradients and optimizer state; × 1.2 = 249.6 GB. Eight 40 GB A100s (320 GB) can hold it when the job is sharded.',
  },
  {
    id: 'why-16',
    type: 'choice',
    prompt: 'Serving an 8B model in 16-bit needs about 19 GB, but fully fine-tuning it needs about 154 GB. Where does the difference come from?',
    options: [
      { text: 'Training stores gradients, an fp32 copy of the weights and Adam’s two averages for every parameter', correct: true, explain: '2 + 2 + 4 + 4 + 4 = 16 bytes per parameter instead of 2. The optimizer state alone is 12 of them.' },
      { text: 'Training uses longer sequences, so the weights are stored once per token', correct: false, explain: 'Weights are stored once regardless of sequence length. Longer sequences grow activations, not the per-parameter state.' },
      { text: 'Training runs the model in 32-bit, so every number doubles', correct: false, explain: 'Mixed-precision training computes mostly in 16-bit. Doubling alone would give 4 bytes, not 16.' },
    ],
  },
  {
    id: 'per-job',
    type: 'numeric',
    prompt: 'A benchmark says a fine-tune takes 30 hours on a $1.86/hour GPU and 9 hours on a $5.07/hour GPU. How many dollars does the faster option save per job?',
    answer: 10.17,
    tolerance: 0.01,
    hint: 'Cost per job = price × hours, for each.',
    explain: '30 × 1.86 = $55.80; 9 × 5.07 = $45.63. The faster GPU saves $10.17 per job and finishes 21 hours sooner.',
  },
  {
    id: 'qlora-why',
    type: 'choice',
    prompt: 'Your team has only 24 GB L4 GPUs and wants to fine-tune an 8B model. Which approach fits, and why?',
    options: [
      { text: 'Full fine-tuning with a smaller batch size, since batch size sets the memory', correct: false, explain: 'Batch size changes activations, but weights, gradients and Adam state alone are 128 GB for 8B parameters.' },
      { text: 'QLoRA: a 4-bit frozen base needs about 5 GB, leaving room for adapters and activations', correct: true, explain: '8 × 0.5 × 1.2 ≈ 4.8 GB for the base plus headroom. Only the small adapters get gradients and optimizer state.' },
      { text: 'Full fine-tuning split across the CPU’s RAM, because it is larger than GPU memory', correct: false, explain: 'Offloading to CPU memory is possible but very slow. QLoRA is the standard way to fit this on a 24 GB GPU.' },
    ],
  },
  {
    id: 'split',
    type: 'choice',
    prompt: 'A job needs 150 GB of GPU memory. Why is one 8-GPU instance usually better than eight separate 1-GPU instances with the same total memory?',
    options: [
      { text: 'Single-GPU instances cannot be used for training at all', correct: false, explain: 'They train fine when the job fits on one GPU. The issue is splitting one job across them.' },
      { text: 'The 8 GPUs in one box exchange data over NVLink, far faster than the network between machines', correct: true, explain: 'Splitting a model means exchanging activations or gradients constantly. Inside one instance that traffic stays on NVLink; across machines it crosses the network.' },
      { text: 'Eight instances need eight times the quota, which is never granted', correct: false, explain: 'Quota is counted in vCPUs or GPUs, so the totals are similar. Communication speed is the real difference.' },
    ],
  },
];

export const fitExercise: Exercise = {
  id: 'cloud-gpu-cheapest',
  prompt:
    'Write `need_gb(params_b, bytes_per_param, headroom=1.2)` and `cheapest_fit(params_b, bytes_per_param, instances)`. `instances` is a list of dicts with "name", "gpus", "gb_per_gpu" and "price" ($/h). An instance fits if gpus × gb_per_gpu ≥ the need. Return the name of the cheapest fitting instance, or None. Ties go to the one listed first.',
  starter: `def need_gb(params_b, bytes_per_param, headroom=1.2):
    return 0

def cheapest_fit(params_b, bytes_per_param, instances):
    return None`,
  hints: [
    'need_gb is a single multiplication.',
    'Filter instances by total memory, then use min(..., key=lambda i: i["price"]); min keeps the first of equal prices.',
  ],
  solution: `def need_gb(params_b, bytes_per_param, headroom=1.2):
    return params_b * bytes_per_param * headroom

def cheapest_fit(params_b, bytes_per_param, instances):
    need = need_gb(params_b, bytes_per_param)
    fits = [i for i in instances if i["gpus"] * i["gb_per_gpu"] >= need]
    if not fits:
        return None
    return min(fits, key=lambda i: i["price"])["name"]`,
  explanation:
    'Ruling out by memory first keeps the price comparison honest: a cheap instance that cannot hold the job has no price at all.',
  tests: `I = [
    {"name": "g4dn.xlarge", "gpus": 1, "gb_per_gpu": 16, "price": 0.53},
    {"name": "g6.xlarge", "gpus": 1, "gb_per_gpu": 24, "price": 0.80},
    {"name": "g6e.xlarge", "gpus": 1, "gb_per_gpu": 48, "price": 1.86},
    {"name": "p4d.24xlarge", "gpus": 8, "gb_per_gpu": 40, "price": 22.0},
]
assert abs(need_gb(8, 2) - 19.2) < 1e-9
assert cheapest_fit(8, 2, I) == "g6.xlarge"
assert cheapest_fit(8, 0.5, I) == "g4dn.xlarge"
assert cheapest_fit(8, 16, I) == "p4d.24xlarge"
assert cheapest_fit(70, 16, I) is None
assert cheapest_fit(13, 2, I) == "g6e.xlarge"`,
};
