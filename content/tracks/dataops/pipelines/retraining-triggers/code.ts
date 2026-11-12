// Code for the retraining triggers lesson. triggers.py is pure Python; its output for every setting was produced
// with CPython 3.13 (retraining.test.ts checks the browser's version against it). ct_pipeline.py runs in the
// browser and is checked under CPython by content/tracks/dataops/python-outputs.test.ts. The orchestration sketch
// is not run here.
import { RETRAIN_SOURCE, retrainExperiment, retrainSlots, type RetrainState } from '@/lib/dataops/retraining';
import type { CodeExample } from '@/lib/types';

export const rt = retrainExperiment('retraining');

const st = (s: unknown) => s as RetrainState;

export const triggersPython: CodeExample = {
  id: 'triggers-python',
  language: 'python',
  source: RETRAIN_SOURCE,
  slots: {
    policy: (s) => retrainSlots(st(s)).policy,
    delay: (s) => retrainSlots(st(s)).delay,
  },
  annotations: [
    {
      id: 'policy',
      range: { line: 1, startCol: 10, endCol: 20 },
      match: '{{policy}}',
      kind: 'parameter',
      title: 'POLICY',
      what: 'The retraining rule chosen in the controls.',
      why: 'Each rule watches a different signal: the calendar, the inputs, or measured accuracy.',
    },
    {
      id: 'delay',
      range: { line: 2, startCol: 14, endCol: 23 },
      match: '{{delay}}',
      kind: 'parameter',
      title: 'LABEL_DELAY',
      what: 'How many weeks pass before the outcomes of a week’s predictions are known.',
      why: 'Only the accuracy policy depends on it, because only that policy needs labels.',
    },
    {
      id: 'decay',
      range: { line: 10 },
      kind: 'math',
      title: 'The decay model',
      what: 'Accuracy starts at 0.92 after training and loses 0.004 per unit the data has moved since the training week.',
      why: 'A stated, simple model so the policies can be compared. Real models decay unevenly, and some barely decay at all.',
    },
    {
      id: 'drift-rule',
      range: { line: 22 },
      kind: 'syntax',
      title: 'drift trigger',
      what: 'Retrain when the inputs have moved 10 units since the model was trained.',
      why: 'Input drift is visible immediately, so this reacts to the sudden shift in the same week.',
    },
    {
      id: 'seen',
      range: { line: 24 },
      kind: 'variable',
      title: 'seen',
      what: 'The most recent week whose labels have arrived.',
      why: 'With a delay of 6, a drop in week 33 shows up only in week 39.',
    },
    {
      id: 'acc-rule',
      range: { line: 25 },
      kind: 'syntax',
      title: 'accuracy trigger',
      what: 'Retrain when the measured accuracy of the current model falls below 0.88; weeks before the last retrain do not count.',
      why: 'It reacts to what actually matters, but always late by the label delay.',
    },
  ],
};

export const ctRunner: CodeExample = {
  id: 'ct-runner',
  language: 'python',
  run: 'pyodide',
  source: `class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


def snapshot(week, n=400):  # one week of labeled data: class 1 has larger x; everything drifts upward over time
    rng = LCG(week)
    missing_rate = 0.05 if week == 8 else 0.002  # week 8: an upstream bug drops values
    rows = []
    for _ in range(n):
        y = int(rng.random() < 0.5)
        x = rng.random() + rng.random() + 0.8 * y + 0.03 * week
        rows.append((None if rng.random() < missing_rate else x, y))
    return rows


def validate(rows):  # a blocking schema check: at most 1% missing values
    missing = sum(x is None for x, _ in rows) / len(rows)
    return missing <= 0.01, f"{missing:.1%} missing"


def train(rows):  # the "model": a threshold halfway between the two class means
    xs = {0: [], 1: []}
    for x, y in rows:
        if x is not None:
            xs[y].append(x)
    means = [sorted(v)[len(v) // 2] for v in (xs[0], xs[1])]  # medians, robust and exact
    return (means[0] + means[1]) / 2


def accuracy(threshold, rows):
    scored = [(x, y) for x, y in rows if x is not None]
    return sum((x >= threshold) == y for x, y in scored) / len(scored)


production = train(snapshot(0))
for week in (4, 8, 12, 16):  # three scheduled runs of the continuous-training pipeline
    data = snapshot(week)
    ok, detail = validate(data)
    if not ok:
        print(f"week {week:2}: data validation failed ({detail}), pipeline stopped")
        continue
    candidate = train(data[:300])
    holdout = data[300:]  # evaluate both models on the newest labeled data
    new, old = accuracy(candidate, holdout), accuracy(production, holdout)
    promote = new >= old + 0.01  # the gate: must beat production by a margin
    print(f"week {week:2}: {detail}; candidate {new:.3f} vs production {old:.3f} -> "
          f"{'promote' if promote else 'keep production'}")
    if promote:
        production = candidate`,
  annotations: [],
  expectedOutput: `week  4: 0.2% missing; candidate 0.840 vs production 0.840 -> keep production
week  8: data validation failed (4.5% missing), pipeline stopped
week 12: 0.0% missing; candidate 0.850 vs production 0.730 -> promote
week 16: 0.5% missing; candidate 0.760 vs production 0.790 -> keep production`,
};

export const ctSketch: CodeExample = {
  id: 'ct-orchestration-sketch',
  language: 'python',
  source: `# The same pipeline as orchestrated steps (generic sketch, not run here). Each step is a task in an orchestrator
# such as Airflow, Kubeflow Pipelines, Vertex AI Pipelines or SageMaker Pipelines.
def continuous_training(trigger):
    version = data_lake.snapshot("training_examples")        # pin the exact data (a table version or tag)
    report = validate(version, baseline=registry.baseline())  # schema + drift checks; fails the run if broken
    candidate = train(version, config=git_commit_config())
    metrics = evaluate(candidate, production=registry.current(), gold=gold_set(), slices=["country", "device"])
    if metrics.beats_production(margin=0.01) and metrics.no_slice_regresses(by=0.02):
        registry.register(candidate, data_version=version, trigger=trigger, metrics=metrics, stage="staging")
    else:
        alert("candidate rejected", metrics)                   # a person looks; production is unchanged`,
  annotations: [],
};
