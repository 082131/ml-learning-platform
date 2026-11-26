import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ft-l3-flops',
    type: 'numeric',
    prompt: 'How many training FLOPs does a 1B-parameter model need for 100B tokens? Answer in units of 10^20 (so 6.0 means 6.0 × 10^20).',
    answer: 6,
    tolerance: 0.01,
    hint: 'C = 6 · N · D.',
    explain: '6 × 1e9 × 1e11 = 6e20 FLOPs.',
  },
  {
    id: 'ft-l3-double',
    type: 'choice',
    prompt: 'You double both the parameters and the training tokens of a planned run. What happens to the compute?',
    options: [
      { text: 'It doubles', correct: false, explain: 'Compute is proportional to N × D, and both doubled.' },
      { text: 'It goes up 4×', correct: true, explain: '6 · (2N) · (2D) = 4 · 6ND. This is why bigger models trained on more data get expensive so fast.' },
      { text: 'It goes up 8×, because the backward pass also doubles', correct: false, explain: 'The backward pass is already inside the factor 6; it scales with N and D like everything else.' },
      { text: 'It stays the same if the GPU count doubles too', correct: false, explain: 'More GPUs shorten the wall-clock time, not the total compute.' },
    ],
  },
  {
    id: 'ft-l3-overtrain',
    type: 'choice',
    prompt: 'Llama 3 8B was trained on about 15 trillion tokens, roughly 1,875 tokens per parameter, far past the compute-optimal 20. Why would anyone do that?',
    options: [
      { text: 'The Chinchilla ratio was not known when it was trained', correct: false, explain: 'Chinchilla was published in 2022; Llama 3 came out in 2024, and its authors discussed going past it on purpose.' },
      { text: 'Serving cost: a smaller model trained longer is cheaper to run', correct: true, explain: 'Compute-optimal minimizes training compute for a target loss. If the model will answer billions of requests, a small, over-trained model saves far more at inference than it costs in extra training.' },
      { text: 'More tokens per parameter always gives a lower training cost', correct: false, explain: 'Training cost goes up with every extra token. The saving is at inference time.' },
      { text: 'Large models cannot learn from more than 20 tokens per parameter', correct: false, explain: 'Loss keeps improving past 20 tokens per parameter, just with diminishing returns per FLOP.' },
    ],
  },
  {
    id: 'ft-l3-days',
    type: 'numeric',
    prompt: 'A run needs 1.0 × 10^23 FLOPs. It runs on 1,000 GPUs with a dense peak of 1.0 × 10^15 FLOP/s each, at 50% MFU. How many days does it take? (One decimal.)',
    answer: 2.3,
    tolerance: 0.05,
    hint: 'Seconds = FLOPs / (GPUs × peak × MFU); divide by 86,400.',
    explain: '1e23 / (1,000 × 1e15 × 0.5) = 2e5 seconds = 2.3 days.',
  },
  {
    id: 'ft-l3-scaling',
    type: 'choice',
    prompt: 'What do scaling laws let a team do before a big pretraining run?',
    options: [
      { text: 'Predict a big run’s loss from small runs', correct: true, explain: 'Loss falls smoothly with size and data, so a power-law fit on cheap runs extrapolates to the expensive one, and the team can choose size and data before spending the budget.' },
      { text: 'Guarantee which downstream skills the finished model will have', correct: false, explain: 'Scaling laws predict loss well; specific abilities on benchmarks are much less predictable.' },
      { text: 'Skip the evaluation of the final model, since its loss is known in advance', correct: false, explain: 'A predicted loss is not a measured behaviour; the final model is still evaluated.' },
    ],
  },
  {
    id: 'ft-l3-mixture',
    type: 'choice',
    prompt: 'A team doubles the share of code in their pretraining mixture while keeping the total tokens fixed. What trade-off should they expect?',
    options: [
      { text: 'Better coding, no change elsewhere', correct: false, explain: 'With total tokens fixed, more code means fewer tokens of everything else.' },
      { text: 'Better coding, some loss on the sources that shrank', correct: true, explain: 'The mixture is a budget split. Teams test mixtures on small models first because each choice moves skills around.' },
      { text: 'No change, because the model sees every source anyway', correct: false, explain: 'How often a source is seen strongly affects how well it is learned.' },
      { text: 'Worse coding, because repeated code makes the model overfit', correct: false, explain: 'Doubling a share does not necessarily repeat data, and code is usually plentiful.' },
    ],
  },
];

export const optimalExercise: Exercise = {
  id: 'ft-compute-optimal',
  prompt:
    'Write `compute_optimal(flops, tokens_per_param=20)` that returns `(params, tokens)`: the model size and number of tokens that spend `flops` with C = 6·N·D and D = tokens_per_param·N.',
  starter: `import math

def compute_optimal(flops, tokens_per_param=20):
    return 0, 0`,
  hints: ['Substitute D = k·N into C = 6·N·D: C = 6·k·N².', 'N = sqrt(C / (6·k)); D = k·N.'],
  solution: `import math

def compute_optimal(flops, tokens_per_param=20):
    params = math.sqrt(flops / (6 * tokens_per_param))
    return params, tokens_per_param * params`,
  explanation:
    'Because compute grows with N², quadrupling the budget only doubles the optimal model size (and the tokens). That square root is why compute-optimal models grow more slowly than budgets.',
  tests: `n, d = compute_optimal(6 * 70e9 * 1.4e12)
assert abs(n - 70e9) / 70e9 < 1e-9 and abs(d - 1.4e12) / 1.4e12 < 1e-9
n2, _ = compute_optimal(4 * 6 * 70e9 * 1.4e12)
assert abs(n2 / n - 2) < 1e-9
n3, d3 = compute_optimal(6e20, tokens_per_param=100)
assert abs(d3 / n3 - 100) < 1e-9`,
};
