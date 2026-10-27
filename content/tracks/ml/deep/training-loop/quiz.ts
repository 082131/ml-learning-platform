import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'steps-per-epoch',
    type: 'numeric',
    prompt:
      'A training set has 1000 examples and the batch size is 64. How many iterations does one epoch take?',
    answer: 16,
    tolerance: 0,
    hint: 'ceil(1000 / 64): 64 · 15 = 960 is not enough.',
    explain:
      '1000 / 64 = 15.625, rounded up to 16. Fifteen full batches cover 960 examples and a 16th takes the rest.',
  },
  {
    id: 'last-batch',
    type: 'numeric',
    prompt: 'In the same setup, how many examples are in the last batch of each epoch?',
    answer: 40,
    tolerance: 0,
    hint: 'Subtract the examples in the 15 full batches from 1000.',
    explain: '1000 − 15 · 64 = 1000 − 960 = 40. (PyTorch’s DataLoader can drop it with drop_last=True.)',
  },
  {
    id: 'noise',
    type: 'choice',
    prompt: 'Why is the mini-batch loss curve much noisier with batch size 1 than with batch size 50?',
    options: [
      {
        text: 'Each point is the loss of different examples: one example’s loss varies a lot, an average over 50 varies much less',
        correct: true,
        explain:
          'The spread of an average of B independent values shrinks like 1/√B, and the gradient estimate behaves the same way.',
      },
      {
        text: 'A batch size of 1 uses a larger learning rate',
        correct: false,
        explain:
          'The learning rate is a separate setting. The noise comes from measuring the loss on fewer examples.',
      },
      {
        text: 'The network gets worse after every step with batch size 1',
        correct: false,
        explain:
          'Single steps can raise the loss on other examples, but the trend still goes down: compare the smooth whole-set training curve.',
      },
    ],
  },
  {
    id: 'val-up',
    type: 'choice',
    prompt:
      'The training loss keeps falling, but the validation loss starts rising after epoch 30. What is the most likely reading?',
    options: [
      {
        text: 'The network is fitting details of the training points that do not hold for new data',
        correct: true,
        explain:
          'This gap is overfitting. Keeping the weights from the epoch with the lowest validation loss is early stopping.',
      },
      {
        text: 'The learning rate is too small',
        correct: false,
        explain: 'A too-small learning rate makes both curves fall slowly; it does not make them move apart.',
      },
      {
        text: 'The validation data is shuffled differently each epoch',
        correct: false,
        explain:
          'Validation loss is computed on all validation points with the same weights, so the order does not change it.',
      },
    ],
  },
  {
    id: 'loop-order',
    type: 'order',
    prompt: 'Put one epoch of mini-batch training in order.',
    items: [
      'Shuffle the training indices',
      'Take the next B indices as a mini-batch',
      'Forward pass and loss on the batch',
      'Backpropagate to get the gradients',
      'Update the parameters with the optimizer',
      'After the last batch, compute the validation loss',
    ],
    explain:
      'Shuffle once per epoch; then forward, loss, backward and update once per batch; evaluate at the end of the epoch.',
  },
];

export const batchesExercise: Exercise = {
  id: 'make-batches',
  prompt:
    'Write `make_batches(order, batch_size)` that splits a list of indices into consecutive batches; the last may be shorter.',
  starter: `def make_batches(order, batch_size):
    # Return a list of lists: order[0:B], order[B:2B], ...
    pass`,
  hints: [
    'There are ceil(len(order) / batch_size) batches. `range(0, len(order), batch_size)` gives each batch’s start.',
    'Slicing past the end of a list is fine in Python: `order[96:128]` on 100 items returns the last 4.',
  ],
  solution: `def make_batches(order, batch_size):
    return [order[start:start + batch_size] for start in range(0, len(order), batch_size)]`,
  explanation:
    'range(0, n, B) visits 0, B, 2B, … up to the last start below n, so there are ceil(n / B) batches, and slicing clips the last one. Every index appears exactly once, which is what makes one pass an epoch.',
  tests: `b = make_batches(list(range(100)), 32)
assert len(b) == 4, f'100 examples in batches of 32 need ceil(100/32) = 4 batches, got {len(b)}'
assert [len(x) for x in b] == [32, 32, 32, 4], f'batch sizes should be [32, 32, 32, 4], got {[len(x) for x in b]}'
assert b[3] == [96, 97, 98, 99], 'the last batch should hold the last 4 indices'
assert make_batches([5, 2, 9], 1) == [[5], [2], [9]], 'batch size 1 gives one batch per example, in order'
assert make_batches([5, 2, 9], 10) == [[5, 2, 9]], 'a batch size above n gives one batch with everything'
assert sum(make_batches(list(range(37)), 8), []) == list(range(37)), 'every index must appear exactly once, in order'`,
};
