import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'one-change',
    type: 'choice',
    prompt:
      'You quantize the model and enable batching in the same release; p99 improves by 40%. What can you conclude?',
    options: [
      {
        text: 'Only that the combination helped; you cannot tell how much each change contributed or whether one of them hurt',
        correct: true,
        explain:
          'Measure each change alone against the same baseline, then combined. Sometimes one optimization hides a regression from the other.',
      },
      {
        text: 'Each change contributed about 20%',
        correct: false,
        explain: 'Effects rarely add up like that; batching changes the batch the quantized kernels see.',
      },
      {
        text: 'Quantization caused the improvement, since it is the larger change',
        correct: false,
        explain: 'Without measuring it alone, that is a guess.',
      },
    ],
  },
  {
    id: 'tolerance',
    type: 'choice',
    prompt: 'When should you decide how much accuracy loss is acceptable?',
    options: [
      {
        text: 'Before measuring, from what the product needs, so the result cannot bend the rule',
        correct: true,
        explain: 'A tolerance chosen after seeing a 3× speed-up tends to grow to fit it.',
      },
      {
        text: 'After measuring, once you know the speed-up',
        correct: false,
        explain: 'That invites rationalizing whatever the numbers say.',
      },
      {
        text: 'Never: any accuracy change is unacceptable',
        correct: false,
        explain:
          'Most optimizations change the numbers a little. The question is whether the change matters for users.',
      },
    ],
  },
  {
    id: 'report',
    type: 'choice',
    prompt: 'Which detail is least important in a benchmark report?',
    options: [
      {
        text: 'The editor you wrote the code in',
        correct: true,
        explain:
          'Hardware, versions, batch sizes, threads, warm-up, sample counts and run-to-run spread all change the numbers; the editor does not.',
      },
      {
        text: 'The ONNX Runtime and driver versions',
        correct: false,
        explain: 'Kernels change between versions, sometimes a lot.',
      },
      {
        text: 'The number of threads and the batch size',
        correct: false,
        explain: 'Both change latency and throughput directly.',
      },
    ],
  },
];

export const compareExercise: Exercise = {
  id: 'capstone-compare',
  prompt:
    'Write `compare(base, variant, max_drop)` for two result dicts with keys "accuracy" (0 to 1) and "p99_ms". Return a dict with "speedup" (base p99 ÷ variant p99), "drop" (base accuracy − variant accuracy, in percentage points) and "ship" (True if the variant is faster and the drop is at most max_drop points).',
  starter: `def compare(base, variant, max_drop):
    pass`,
  hints: [
    'speedup = base["p99_ms"] / variant["p99_ms"].',
    'drop = 100 * (base["accuracy"] - variant["accuracy"]).',
    'ship = speedup > 1 and drop <= max_drop.',
  ],
  solution: `def compare(base, variant, max_drop):
    speedup = base["p99_ms"] / variant["p99_ms"]
    drop = 100 * (base["accuracy"] - variant["accuracy"])
    return {"speedup": speedup, "drop": drop, "ship": speedup > 1 and drop <= max_drop}`,
  explanation:
    'Writing the decision as code forces you to state the tolerance up front. In a real report, also check that the speed-up is larger than the run-to-run spread.',
  tests: `r = compare({"accuracy": 0.975, "p99_ms": 2.0}, {"accuracy": 0.972, "p99_ms": 1.0}, 0.5)
assert abs(r["speedup"] - 2.0) < 1e-9, 'twice as fast at p99'
assert abs(r["drop"] - 0.3) < 1e-9, '0.3 percentage points lower'
assert r["ship"] is True, 'within a 0.5-point tolerance'
assert compare({"accuracy": 0.975, "p99_ms": 2.0}, {"accuracy": 0.95, "p99_ms": 1.0}, 0.5)["ship"] is False, 'too much accuracy lost'
assert compare({"accuracy": 0.975, "p99_ms": 2.0}, {"accuracy": 0.975, "p99_ms": 2.5}, 0.5)["ship"] is False, 'slower is never shipped for speed'`,
};
