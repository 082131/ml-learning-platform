import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'out-shape',
    type: 'choice',
    prompt: 'x has shape (32, 64) and W1 has shape (64, 16). What is the shape of x @ W1 + b1, with b1 of shape (16,)?',
    options: [
      {
        text: '(32, 16)',
        correct: true,
        explain: 'The inner sizes (64) match and disappear; the outer sizes remain. b1 broadcasts across the 32 rows.',
      },
      {
        text: '(64, 16)',
        correct: false,
        explain: 'That is W1’s shape. The result has one row per image in the batch, so its first size is 32.',
      },
      {
        text: '(32, 64, 16)',
        correct: false,
        explain: 'Matrix multiplication removes the shared dimension; it does not keep all three.',
      },
    ],
  },
  {
    id: 'silent',
    type: 'choice',
    prompt: 'Which preprocessing mistake raises no error at all?',
    options: [
      {
        text: 'Dividing the pixels by 255 instead of 16',
        correct: true,
        explain: 'Shape and dtype are still right, so every operation runs. Only the answers change: 229 of 360 right instead of 349.',
      },
      {
        text: 'Forgetting to flatten (batch, 8, 8) to (batch, 64)',
        correct: false,
        explain: 'The first matmul checks the inner sizes (8 vs 64) and raises a ValueError.',
      },
      {
        text: 'Sending float64 to an ONNX model that expects float32',
        correct: false,
        explain: 'ONNX Runtime checks the element type and raises INVALID_ARGUMENT: Unexpected input data type.',
      },
    ],
  },
  {
    id: 'batch-free',
    type: 'choice',
    prompt: 'Why does one forward pass on a batch of 32 images cost far less than 32 separate passes on a GPU?',
    options: [
      {
        text: 'The weights are read from memory once and used for all 32 rows in one larger matrix multiplication',
        correct: true,
        explain: 'A single (32, 64) @ (64, 16) does the same arithmetic as 32 separate (1, 64) @ (64, 16), with one weight read and one launch.',
      },
      {
        text: 'Batched images need fewer multiplications each',
        correct: false,
        explain: 'Each image still needs the same 64 · 16 + 16 · 10 multiply-adds. What is shared is the overhead.',
      },
      {
        text: 'The model skips layers for later images in the batch',
        correct: false,
        explain: 'Every row goes through every layer. The batch only changes the leading dimension of each tensor.',
      },
    ],
  },
  {
    id: 'elements',
    type: 'numeric',
    prompt: 'A batch of 16 color images of 224 × 224 pixels has shape (16, 3, 224, 224) in float32. How many MiB is it? (two decimals)',
    answer: 9.19,
    tolerance: 0.006,
    hint: 'Multiply the four sizes, then 4 bytes each, then divide by 2²⁰.',
    explain: '16 · 3 · 224 · 224 = 2,408,448 values · 4 bytes = 9,633,792 bytes = 9.19 MiB.',
  },
];

export const batchExercise: Exercise = {
  id: 'to-batch',
  prompt:
    'Write `to_batch(images)` that accepts one 8 × 8 image, one flat image of 64 pixels, or a batch of either, and returns a float32 array of shape (batch, 64) with pixels divided by 16. Raise ValueError for anything else.',
  starter: `import numpy as np


def to_batch(images):
    x = np.asarray(images)
    pass`,
  hints: [
    'Add the batch dimension first: if `x.shape` is `(64,)` or `(8, 8)`, use `x[np.newaxis]` (or `x.reshape(1, *x.shape)`).',
    'Then a batch has shape `(n, 64)` or `(n, 8, 8)`. Check `x.shape[1:]` against both.',
    '`x.reshape(len(x), 64).astype(np.float32) / 16` gives the result. Divide after converting so integer pixels become floats.',
  ],
  solution: `import numpy as np


def to_batch(images):
    x = np.asarray(images)
    if x.shape in [(64,), (8, 8)]:
        x = x[np.newaxis]
    if x.ndim < 2 or x.shape[1:] not in [(64,), (8, 8)]:
        raise ValueError(f"expected images of shape (64,) or (8, 8), got {x.shape}")
    return x.reshape(len(x), 64).astype(np.float32) / 16`,
  explanation:
    'The model only accepts (batch, 64) float32 scaled to 0–1, so a server converts every allowed input to that form at the boundary and rejects the rest with a clear message, instead of letting a matmul error escape from deep inside the model.',
  tests: `import numpy as np
one = np.arange(64)
assert to_batch(one).shape == (1, 64), 'a flat image becomes a batch of one'
assert to_batch(one.reshape(8, 8)).shape == (1, 64), 'an 8 x 8 image becomes a batch of one'
assert to_batch(np.zeros((5, 8, 8))).shape == (5, 64), 'a batch of 8 x 8 images is flattened'
assert to_batch(np.zeros((3, 64))).shape == (3, 64), 'a flat batch keeps its shape'
assert to_batch(one).dtype == np.float32, 'the result is float32, the dtype the model expects'
assert abs(to_batch(np.full(64, 16)).max() - 1.0) < 1e-6, 'pixels are divided by 16'
try:
    to_batch(np.zeros((2, 7, 7)))
    raise AssertionError('a (2, 7, 7) input should raise ValueError')
except ValueError:
    pass`,
};
