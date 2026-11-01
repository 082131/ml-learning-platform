import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'what-drops',
    type: 'choice',
    prompt: 'Which of these does a served model still need in memory?',
    options: [
      {
        text: 'The weights',
        correct: true,
        explain: 'The forward pass multiplies by the weights, so they are loaded once and kept for every request.',
      },
      {
        text: 'One gradient per weight',
        correct: false,
        explain: 'Gradients exist only to update weights. Inference never updates them, so it never computes gradients.',
      },
      {
        text: 'Adam’s two moving averages per weight',
        correct: false,
        explain: 'Optimizer state is training-only. A checkpoint saved for serving usually leaves it out.',
      },
      {
        text: 'Every layer’s activations until the request finishes',
        correct: false,
        explain: 'Only backpropagation needs old activations. Inference can free a layer’s input as soon as its output exists.',
      },
    ],
  },
  {
    id: 'flops',
    type: 'numeric',
    prompt:
      'A model has 10,000,000 weights. About how many GFLOPs does one inference call on a batch of 8 cost? (2 FLOPs per weight per example)',
    answer: 0.16,
    tolerance: 0.001,
    hint: 'FLOPs = 2 × weights × batch.',
    explain: '2 × 10,000,000 × 8 = 160,000,000 FLOPs = 0.16 GFLOPs. A training step on the same batch costs about 3 times as much: 0.48 GFLOPs.',
  },
  {
    id: 'mode',
    type: 'choice',
    prompt: 'A bank scores all 20 million accounts for churn risk every night. Which kind of inference is this?',
    options: [
      {
        text: 'Batch (offline) inference: judged on throughput and cost, nobody waits for one result',
        correct: true,
        explain: 'The job only has to finish before morning, so it can use large batches and cheap hardware.',
      },
      {
        text: 'Online inference, because each account gets its own prediction',
        correct: false,
        explain: 'Online means someone is waiting for the answer to their request. Here nobody is.',
      },
      {
        text: 'Streaming inference, because results arrive one by one',
        correct: false,
        explain: 'Streaming refers to sending one output in pieces while it is produced, like the tokens of a chat reply.',
      },
    ],
  },
  {
    id: 'eval',
    type: 'choice',
    prompt: 'A PyTorch model with dropout gives a different answer each time for the same input in production. What was most likely forgotten?',
    options: [
      {
        text: 'model.eval(), which turns dropout off',
        correct: true,
        explain: 'In training mode dropout zeroes random values on every call. eval() switches it, and batch norm, to inference behavior.',
      },
      {
        text: 'torch.inference_mode(), which makes results deterministic',
        correct: false,
        explain: 'inference_mode() turns off gradient tracking to save memory and time. It does not change what dropout does.',
      },
      {
        text: 'Setting a random seed in the server',
        correct: false,
        explain: 'A seed would make the randomness repeatable, but the model should not be random at inference at all.',
      },
    ],
  },
  {
    id: 'goals',
    type: 'order',
    prompt: 'Put the steps of one online request in order.',
    items: [
      'The client sends the input',
      'The server checks and converts it to a tensor',
      'The model runs its forward pass',
      'The output tensor is turned into a label or text',
      'The server returns the response',
    ],
    explain: 'Preprocessing and postprocessing are part of the latency the user sees, and are often where bugs hide.',
  },
];

export const flopsExercise: Exercise = {
  id: 'count-params-flops',
  prompt:
    'Write `count_params(widths)` and `forward_flops(widths, batch)` for a stack of dense layers with biases.',
  starter: `def count_params(widths):
    pass


def forward_flops(widths, batch):
    pass`,
  hints: [
    'Pair each width with the next: `zip(widths[:-1], widths[1:])` gives (inputs, outputs) per layer.',
    'A layer has `i * o` weights and `o` biases.',
    'Count 2 FLOPs per weight per example (one multiply, one add); ignore the biases for FLOPs.',
  ],
  solution: `def count_params(widths):
    return sum(i * o + o for i, o in zip(widths[:-1], widths[1:]))


def forward_flops(widths, batch):
    return 2 * batch * sum(i * o for i, o in zip(widths[:-1], widths[1:]))`,
  explanation:
    'Each weight multiplies one input and adds the result to a sum: one multiply-add, 2 FLOPs, per example. A training step costs about 3 times forward_flops, because the backward pass costs about twice the forward pass.',
  tests: `assert count_params([784, 512, 512, 10]) == 669706, 'the lesson’s MLP has 669,706 parameters'
assert count_params([3, 2]) == 8, 'a 3 → 2 layer has 3 * 2 weights and 2 biases'
assert forward_flops([3, 2], 1) == 12, 'a 3 → 2 layer costs 2 * 6 = 12 FLOPs for one example'
assert forward_flops([784, 512, 512, 10], 64) == 85590016, 'the lesson’s MLP at batch 64 costs 85,590,016 FLOPs'`,
};
