import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ft-l4-batch',
    type: 'numeric',
    prompt: 'Micro batch 2 per GPU, gradient accumulation 16, 4 GPUs, sequences of 4,096 tokens. How many tokens does one optimizer step see?',
    answer: 524288,
    tolerance: 0,
    hint: 'Sequences per step = micro × accumulation × GPUs; then multiply by the sequence length.',
    explain: '2 × 16 × 4 = 128 sequences; × 4,096 = 524,288 tokens per step.',
  },
  {
    id: 'ft-l4-accum',
    type: 'choice',
    prompt: 'You move a run from 4 GPUs to 2 GPUs and want the training to behave the same. What do you change?',
    options: [
      { text: 'Halve the learning rate', correct: false, explain: 'That changes the training. Keep the effective batch the same instead, and the learning rate can stay.' },
      { text: 'Double the gradient accumulation steps', correct: true, explain: 'micro × accumulation × GPUs stays constant, so each optimizer step sees the same batch; it just takes twice as long.' },
      { text: 'Double the number of epochs', correct: false, explain: 'Epochs count passes over the data. They do not keep the batch size per step the same.' },
      { text: 'Nothing, the batch size is per GPU', correct: false, explain: 'The per-GPU micro batch stays the same, but the total per step halves, which changes the training dynamics.' },
    ],
  },
  {
    id: 'ft-l4-warmup',
    type: 'choice',
    prompt: 'What problem does learning-rate warmup solve?',
    options: [
      { text: 'Large early steps based on unreliable optimizer statistics', correct: true, explain: 'Adam estimates each weight’s gradient scale from running averages, which start empty. Small steps first let them settle.' },
      { text: 'The GPU needs time to reach full clock speed', correct: false, explain: 'Warmup is about the optimization, not the hardware.' },
      { text: 'Overfitting at the end of training on the last few batches', correct: false, explain: 'Warmup only affects the beginning of training; late overfitting is handled by decay, evaluation and early stopping.' },
      { text: 'The tokenizer needs a few batches to build its vocabulary', correct: false, explain: 'The tokenizer is fixed before training starts.' },
    ],
  },
  {
    id: 'ft-l4-cosine',
    type: 'numeric',
    prompt: 'Cosine schedule: peak 3e-4, floor 3e-5, warmup 100 steps, 1,100 steps in total. What is the learning rate at step 600? Answer in units of 1e-4 (so 1.65 means 1.65e-4).',
    answer: 1.65,
    tolerance: 0.01,
    hint: 'Step 600 is exactly halfway through the 1,000 decay steps, where the cosine factor is 0.5.',
    explain: 'progress = (600 − 100) / 1,000 = 0.5; factor 0.5 × (1 + cos(π/2)) = 0.5; lr = 3e-5 + (3e-4 − 3e-5) × 0.5 = 1.65e-4.',
  },
  {
    id: 'ft-l4-clip',
    type: 'choice',
    prompt: 'The gradient norm is 8 and max_grad_norm is 2. What does clipping do?',
    options: [
      { text: 'Sets every gradient component larger than 2 to 2', correct: false, explain: 'That is clipping by value, which changes the direction of the gradient. Clipping by norm keeps the direction.' },
      { text: 'Multiplies every component by 0.25', correct: true, explain: '2 / 8 = 0.25. The gradient keeps its direction but its length becomes 2.' },
      { text: 'Skips this optimizer step entirely and moves on to the next batch', correct: false, explain: 'Some frameworks can skip steps with infinite gradients, but norm clipping only rescales.' },
      { text: 'Halves the learning rate for the rest of training', correct: false, explain: 'Clipping affects only this step’s gradient; the schedule is unchanged.' },
    ],
  },
  {
    id: 'ft-l4-curve',
    type: 'choice',
    prompt: 'The training loss falls normally for 300 steps, jumps from 1.9 to 4.5 at step 301, and is back to 2.0 by step 340. The gradient norm logged at step 301 was 40× its usual value. What is the most likely reading?',
    options: [
      { text: 'The run diverged and must restart from scratch', correct: false, explain: 'It recovered within 40 steps. A diverged run stays high or climbs.' },
      { text: 'A loss spike from an unusual batch, which recovered', correct: true, explain: 'A sudden spike with a huge gradient norm and a quick recovery is the classic pattern. Check that batch’s data; if spikes repeat, lower the learning rate or tighten clipping.' },
      { text: 'The model started overfitting at step 301', correct: false, explain: 'Overfitting shows in the validation loss slowly rising, not in a sudden training-loss jump.' },
      { text: 'The learning rate warmup ended at step 301', correct: false, explain: 'Possible to coincide, but the end of warmup does not make the gradient norm explode 40×. The batch is the first thing to inspect.' },
    ],
  },
];

export const lrExercise: Exercise = {
  id: 'ft-lr-at',
  prompt:
    'Write `lr_at(step, peak, warmup, total, min_ratio)`: linear warmup from 0 to `peak` over `warmup` steps, then cosine decay to `peak * min_ratio` at step `total`. Steps after `total` keep the final value.',
  starter: `import math

def lr_at(step, peak, warmup, total, min_ratio):
    return peak`,
  hints: [
    'During warmup: peak * step / warmup.',
    'After warmup: progress = (min(step, total) - warmup) / (total - warmup); lr = floor + (peak - floor) * 0.5 * (1 + cos(pi * progress)).',
  ],
  solution: `import math

def lr_at(step, peak, warmup, total, min_ratio):
    if step < warmup:
        return peak * step / warmup
    progress = (min(step, total) - warmup) / (total - warmup)
    floor = peak * min_ratio
    return floor + (peak - floor) * 0.5 * (1 + math.cos(math.pi * progress))`,
  explanation:
    'Warmup protects the first steps; the cosine makes the decay gentle at both ends; the floor keeps a little learning at the end. These three pieces are in almost every LLM training recipe.',
  tests: `assert lr_at(0, 2e-4, 30, 1000, 0.1) == 0
assert abs(lr_at(15, 2e-4, 30, 1000, 0.1) - 1e-4) < 1e-15
assert abs(lr_at(30, 2e-4, 30, 1000, 0.1) - 2e-4) < 1e-15
assert abs(lr_at(515, 2e-4, 30, 1000, 0.1) - 1.1e-4) < 1e-12
assert abs(lr_at(1000, 2e-4, 30, 1000, 0.1) - 2e-5) < 1e-15
assert abs(lr_at(5000, 2e-4, 30, 1000, 0.1) - 2e-5) < 1e-15
assert abs(lr_at(600, 3e-4, 100, 1100, 0.1) - 1.65e-4) < 1e-12`,
};
