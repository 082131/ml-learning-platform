import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rerun-differs',
    type: 'choice',
    prompt:
      'A teammate reruns your training script with the same config and gets a different validation score. Your script calls rng.shuffle but never sets a seed. What is the most likely cause?',
    options: [
      {
        text: 'The split and the batch order came from an unseeded generator, so they differ on every run',
        correct: true,
        explain:
          'Without a recorded seed, the random choices change on each run, and with them the validation rows and the gradient steps.',
      },
      {
        text: 'The learning rate is too high',
        correct: false,
        explain:
          'A high learning rate makes training unstable, but a seeded run with the same config would still repeat exactly.',
      },
      {
        text: 'Python floating-point arithmetic is random',
        correct: false,
        explain:
          'Basic float arithmetic is deterministic: the same operations in the same order give the same bits. The lesson’s Python and the browser’s TypeScript agree to the last digit.',
      },
      {
        text: 'The model has too few parameters',
        correct: false,
        explain: 'Model size does not make results change between identical runs.',
      },
    ],
  },
  {
    id: 'pick-config',
    type: 'choice',
    prompt:
      'On seed 0, config B (lr 0.01) scores 23.6 and config A (lr 0.005) scores 31.2. Over seeds 0 to 9, A averages 23.2 and B 24.1, and B has one run at 44.1. What should you report?',
    options: [
      {
        text: 'Both configs’ mean and spread over the 10 seeds, and that B is less stable',
        correct: true,
        explain:
          'The seed-to-seed spread (several MSE points) is larger than the difference between the means, so neither config is clearly better. Report that, and B’s bad run.',
      },
      {
        text: 'B is better, because it won on seed 0',
        correct: false,
        explain: 'One seed is one draw of the split and batch order. A wins on seed 9 by the same logic.',
      },
      {
        text: 'A is better, because its mean is lower',
        correct: false,
        explain:
          'A difference of 0.9 in the mean, with standard deviations around 5 to 9, is well within the noise between seeds.',
      },
      {
        text: 'The best single run, whichever config produced it',
        correct: false,
        explain:
          'Picking the best seed reports luck. Someone rerunning with another seed would not get that number.',
      },
    ],
  },
  {
    id: 'record-fields',
    type: 'choice',
    prompt: 'Which record lets someone else rebuild your run exactly?',
    options: [
      {
        text: 'Code version, data version, full config, seed and library versions',
        correct: true,
        explain:
          'Those are all the inputs of a run. Metrics are its outputs, recorded so the rerun can be checked.',
      },
      {
        text: 'The final validation score and the learning rate',
        correct: false,
        explain: 'The batch size, epochs, seed, data and code also change the result.',
      },
      {
        text: 'The trained model file',
        correct: false,
        explain:
          'The model lets you reuse the result, not rebuild it. Without the inputs you cannot tell how it was made or redo it on new data.',
      },
    ],
  },
  {
    id: 'stdev',
    type: 'numeric',
    prompt:
      'Three seeds give validation MSE 20, 24 and 28. What is their sample standard deviation (dividing by n − 1)?',
    answer: 4,
    tolerance: 0,
    hint: 'The mean is 24. Square the differences from it, add them, divide by 3 − 1, then take the square root.',
    explain: '(−4)² + 0² + 4² = 32; 32 / 2 = 16; √16 = 4.',
  },
  {
    id: 'reproduce-order',
    type: 'order',
    prompt: 'Put the steps for reproducing a colleague’s run from its record in order.',
    items: [
      'Check out the code version named in the record',
      'Install the recorded library versions',
      'Fetch the dataset version named in the record',
      'Run with the recorded config and seed',
      'Compare your metrics with the recorded ones',
    ],
    explain:
      'Rebuild the environment first (code, then libraries, then data), run with the same inputs, and only then compare outputs. A mismatch at the end points to an input that was not recorded.',
  },
];

export const summarizeExercise: Exercise = {
  id: 'summarize-runs',
  prompt:
    'Write `summarize(records)` that groups run records by config and returns, for each config key, the mean validation MSE of its finished runs, how many finished and how many diverged.',
  starter: `import json

def summarize(records):
    # Group by json.dumps(record["config"], sort_keys=True).
    # Return {key: {"mean": ..., "finished": ..., "diverged": ...}}; mean is None if nothing finished.
    pass`,
  hints: [
    'Use the JSON text of the config as a dictionary key: `key = json.dumps(r["config"], sort_keys=True)`. Dicts are not hashable, strings are.',
    'Keep, per key, a list of finished val_mse values and a diverged counter. A run finished when `r["metrics"]["status"] == "ok"`.',
    'At the end, mean = sum(values) / len(values) when there are values, otherwise None.',
  ],
  solution: `import json

def summarize(records):
    groups = {}
    for r in records:
        key = json.dumps(r["config"], sort_keys=True)
        g = groups.setdefault(key, {"values": [], "diverged": 0})
        if r["metrics"]["status"] == "ok":
            g["values"].append(r["metrics"]["val_mse"])
        else:
            g["diverged"] += 1
    return {
        key: {
            "mean": sum(g["values"]) / len(g["values"]) if g["values"] else None,
            "finished": len(g["values"]),
            "diverged": g["diverged"],
        }
        for key, g in groups.items()
    }`,
  explanation:
    'sort_keys=True makes {"lr": 0.01, "epochs": 20} and {"epochs": 20, "lr": 0.01} the same key, so the same config written in a different order is still grouped together. Diverged runs are counted, not averaged: averaging an infinite loss would hide the finished runs, and ignoring them silently would make an unstable config look better than it is.',
  tests: `A = {"lr": 0.005, "epochs": 20}
B = {"epochs": 20, "lr": 0.01}
ok = lambda v: {"status": "ok", "val_mse": v}
bad = {"status": "diverged", "epoch": 4}
recs = [
    {"config": A, "seed": 0, "metrics": ok(30.0)},
    {"config": A, "seed": 1, "metrics": ok(20.0)},
    {"config": B, "seed": 0, "metrics": ok(24.0)},
    {"config": {"lr": 0.01, "epochs": 20}, "seed": 1, "metrics": bad},
]
out = summarize(recs)
assert isinstance(out, dict), 'summarize should return a dict'
assert len(out) == 2, 'the same config written in a different key order should be one group (use sort_keys=True)'
ka = json.dumps(A, sort_keys=True)
kb = json.dumps(B, sort_keys=True)
assert out[ka] == {"mean": 25.0, "finished": 2, "diverged": 0}, 'config A: mean 25.0 over 2 finished runs'
assert out[kb] == {"mean": 24.0, "finished": 1, "diverged": 1}, 'config B: 1 finished (24.0) and 1 diverged'
only_bad = summarize([{"config": A, "seed": 0, "metrics": bad}])
assert only_bad[ka]["mean"] is None, 'the mean should be None when every run diverged'`,
};
