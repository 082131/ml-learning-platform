import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'fold',
    type: 'choice',
    prompt: 'Why does ONNX Runtime’s basic level remove the Transpose nodes from the digits graph?',
    options: [
      {
        text: 'Their only input is a constant weight, so the transposed weight can be computed once at load time and stored',
        correct: true,
        explain: 'That is constant folding. Without it, the 1,024 + 160 weight values are transposed on every call.',
      },
      {
        text: 'Transpose is not supported on CPUs',
        correct: false,
        explain: 'It is supported everywhere; with optimizations disabled the CPU runs it on every call.',
      },
      {
        text: 'Transposing does not change a matrix multiplication’s result',
        correct: false,
        explain: 'It changes the shape from (16, 64) to (64, 16), which the MatMul needs. The work is moved to load time, not skipped.',
      },
    ],
  },
  {
    id: 'fusion',
    type: 'choice',
    prompt: 'What does fusing Gemm and Relu into one FusedGemm save?',
    options: [
      {
        text: 'One kernel launch, and writing the pre-activation tensor to memory and reading it back',
        correct: true,
        explain: 'The fused kernel applies Relu to each value while it is still in registers. The arithmetic is the same.',
      },
      {
        text: 'Half the multiplications',
        correct: false,
        explain: 'Fusion does not change the arithmetic; it removes memory traffic and launches.',
      },
      {
        text: 'The weights of the Relu layer',
        correct: false,
        explain: 'Relu has no weights.',
      },
    ],
  },
  {
    id: 'bytes',
    type: 'numeric',
    prompt: 'At batch 100, how many bytes of intermediate tensors does the extended graph pass between nodes? (x is 64 wide, h 16, logits 10; each written and read once in float32)',
    answer: 72000,
    tolerance: 0.5,
    hint: '2 × 4 bytes × (64 + 16 + 10) values × 100 rows.',
    explain: '8 · 90 · 100 = 72,000 bytes, against 8 · (132 · 100 + 1,184) = 115,072 unoptimized.',
  },
  {
    id: 'provider',
    type: 'choice',
    prompt: 'A GPU server runs an ONNX model at CPU speed. sess.get_providers() returns [\'CPUExecutionProvider\']. What is the likely cause?',
    options: [
      {
        text: 'The CUDA provider is not available (for example, the CPU-only onnxruntime package is installed), so the session fell back to the CPU',
        correct: true,
        explain: 'Install the GPU package (onnxruntime-gpu) with matching CUDA libraries, and fail startup if the expected provider is missing.',
      },
      {
        text: 'The graph optimization level is too low',
        correct: false,
        explain: 'Optimization levels change the graph, not the device it runs on.',
      },
      {
        text: 'ONNX models cannot run on GPUs',
        correct: false,
        explain: 'They can, through the CUDA, TensorRT and other providers.',
      },
    ],
  },
];

export const parityExercise: Exercise = {
  id: 'parity-report',
  prompt:
    'Write `parity(actual, expected, atol)`: return (max_abs_diff, flips, ok), where flips counts rows whose argmax differs and ok is True when max_abs_diff <= atol and flips == 0.',
  starter: `import numpy as np


def parity(actual, expected, atol):
    pass`,
  hints: [
    'max_abs_diff = float(np.abs(actual - expected).max()).',
    'flips = int((actual.argmax(axis=1) != expected.argmax(axis=1)).sum()).',
    'ok combines both conditions with `and`.',
  ],
  solution: `import numpy as np


def parity(actual, expected, atol):
    max_abs_diff = float(np.abs(actual - expected).max())
    flips = int((actual.argmax(axis=1) != expected.argmax(axis=1)).sum())
    return max_abs_diff, flips, max_abs_diff <= atol and flips == 0`,
  explanation:
    'A parity test should report both how far the numbers moved and whether any decision changed. Run it on real held-out inputs after every export, conversion or runtime upgrade.',
  tests: `import numpy as np
a = np.array([[0.1, 0.9], [0.6, 0.4]])
assert parity(a, a, 1e-6) == (0.0, 0, True), 'identical outputs pass'
d, f, ok = parity(a + 1e-7, a, 1e-5)
assert f == 0 and ok and d < 1e-6, 'rounding-size differences pass'
d, f, ok = parity(np.array([[0.1, 0.9], [0.4, 0.6]]), a, 1.0)
assert f == 1 and not ok, 'a flipped prediction fails even within atol'
assert abs(d - 0.2) < 1e-12, 'max_abs_diff is the largest absolute difference'`,
};
