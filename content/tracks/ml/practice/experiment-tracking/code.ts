// Code for ml/practice/experiment-tracking. Every printed output was produced by running the code with
// CPython 3.13.16; src/lib/practice tests check that the visual's TypeScript gives the same numbers.
// The MLflow stage was run with mlflow-skinny 3.17.1 against a local ./mlruns folder.
import { trackingExperiment, type TrackingState } from '@/lib/practice/trackingExperiment';
import type { CodeExample } from '@/lib/types';

export const initial: TrackingState = { lr: 0.005, lrB: 0.01, epochs: 20, batchSize: 8, seed: 0, seeds: 10 };

/** One state for the lesson: the charts, the code literals and the readout all read it. */
export const experiment = trackingExperiment('tracking', initial);

const st = (s: unknown) => s as TrackingState;

const LCG_SOURCE = `class LCG:
    """A tiny seeded random number generator: the same seed gives the same numbers."""
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32

    def shuffle(self, items):
        for i in range(len(items) - 1, 0, -1):
            j = int(self.random() * (i + 1))
            items[i], items[j] = items[j], items[i]

def make_deliveries(n, seed):
    rng = LCG(seed)
    rows = []
    for _ in range(n):
        km = 0.5 + 14.5 * rng.random()
        minutes = 8 + 3 * km + (12 * rng.random() - 6)
        rows.append((km, minutes))
    return rows`;

const TRAIN_SOURCE = `def train(config, seed, rows):
    rng = LCG(seed)
    order = list(range(len(rows)))
    rng.shuffle(order)
    n_val = len(rows) // 4
    val = [rows[i] for i in order[:n_val]]
    train_rows = [rows[i] for i in order[n_val:]]
    w, b = 0.0, 0.0
    for epoch in range(config["epochs"]):
        rng.shuffle(train_rows)
        for start in range(0, len(train_rows), config["batch_size"]):
            batch = train_rows[start:start + config["batch_size"]]
            gw, gb = 0.0, 0.0
            for km, minutes in batch:
                err = w * km + b - minutes
                gw += err * km
                gb += err
            w -= config["lr"] * 2 * gw / len(batch)
            b -= config["lr"] * 2 * gb / len(batch)
            if abs(w) > 1e6:
                return {"status": "diverged", "epoch": epoch + 1}
    total = 0.0
    for km, minutes in val:
        total += (w * km + b - minutes) ** 2
    return {"status": "ok", "w": round(w, 4), "b": round(b, 4), "val_mse": round(total / len(val), 4)}`;

const recordLines = (
  lr: string,
  epochs: string,
  batch: string,
  seed: string,
) => `config = {"lr": ${lr}, "epochs": ${epochs}, "batch_size": ${batch}}
seed = ${seed}

rows = make_deliveries(60, seed=2024)
metrics = train(config, seed, rows)

record = {
    "config": config,
    "seed": seed,
    "data": "make_deliveries(60, seed=2024)",
    "metrics": metrics,
}
print(json.dumps(record))`;

/** The training function and the run record, with the config filled from the experiment. */
export const trackingCode: CodeExample = {
  id: 'tracking-record',
  language: 'python',
  source: `import json
from delivery_lab import LCG, make_deliveries  # both are in the runnable program below

${TRAIN_SOURCE}

${recordLines('{{lr}}', '{{epochs}}', '{{batch}}', '{{seed}}')}`,
  slots: {
    lr: (s) => String(st(s).lr),
    epochs: (s) => String(st(s).epochs),
    batch: (s) => String(st(s).batchSize),
    seed: (s) => String(st(s).seed),
  },
  annotations: [
    {
      id: 'rng',
      range: { line: 5, startCol: 4, endCol: 19 },
      match: 'rng = LCG(seed)',
      kind: 'variable',
      title: 'One generator, created from the seed',
      what: 'Every random choice in the run (the split and the batch order) comes from this one generator.',
      why: 'If all randomness flows from the seed, the seed plus the config is enough to replay the run exactly.',
      inputs: 'seed: a whole number recorded with the run',
    },
    {
      id: 'split',
      range: { line: 7, startCol: 4, endCol: 22 },
      match: 'rng.shuffle(order)',
      kind: 'function',
      title: 'The seed picks the validation rows',
      what: 'Shuffles the row numbers; the first quarter becomes the validation set, the rest the training set.',
      why: 'A different seed holds out different deliveries, so the validation score changes even with the same config. That is one reason one run is not enough to compare configs.',
      output: '15 validation rows and 45 training rows',
    },
    {
      id: 'epoch-shuffle',
      range: { line: 13, startCol: 8, endCol: 31 },
      match: 'rng.shuffle(train_rows)',
      kind: 'function',
      title: 'A new batch order every epoch',
      what: 'Reorders the training rows before each pass, so the mini-batches differ between epochs.',
      why: 'Shuffling helps stochastic gradient descent, and it is another place where the seed changes the result.',
    },
    {
      id: 'update',
      range: { line: 21, startCol: 12, endCol: 51 },
      match: 'w -= config["lr"] * 2 * gw / len(batch)',
      kind: 'math',
      title: 'Gradient step on w',
      what: 'Moves w against the gradient of the batch mean squared error, scaled by the learning rate.',
      why: 'gw sums err · km over the batch; the derivative of the mean of err² with respect to w is 2 · gw / batch size.',
    },
    {
      id: 'diverge',
      range: { line: 23, startCol: 12, endCol: 28 },
      match: 'if abs(w) > 1e6:',
      kind: 'syntax',
      title: 'Record divergence instead of crashing',
      what: 'Stops the run when w explodes, and returns the epoch in which it happened.',
      why: 'A failed run is still a result worth recording: it tells you where the learning rate stops working.',
    },
    {
      id: 'round',
      range: { line: 28 },
      kind: 'function',
      title: 'Metrics, rounded for the record',
      what: 'Returns the learned w and b and the mean squared error on the validation rows, rounded to 4 decimals.',
      why: 'Rounding keeps the record readable. Keep full precision if you need to check bit-for-bit reproduction.',
      output: 'A dict such as {"status": "ok", "w": 3.6607, ...}',
    },
    {
      id: 'config',
      range: { line: 30, startCol: 0, endCol: 6 },
      match: 'config',
      kind: 'variable',
      title: 'config: every choice in one place',
      what: 'The hyperparameters of this run as a dict. Its values come from the controls of the experiment.',
      why: 'Keeping them in one object (not scattered as literals in the code) means the record can store them all at once.',
    },
    {
      id: 'seed',
      range: { line: 31, startCol: 0, endCol: 4 },
      match: 'seed',
      kind: 'variable',
      title: 'seed',
      what: 'The starting value of the random number generator for this run.',
      why: 'Recorded with the run. Without it, nobody (including you next week) can rebuild the same split and batch order.',
    },
    {
      id: 'data',
      range: { line: 39, startCol: 4, endCol: 44 },
      match: '"data": "make_deliveries(60, seed=2024)"',
      kind: 'parameter',
      title: 'Which data the run used',
      what: 'A description of the exact dataset. Here the data is generated, so the recipe identifies it.',
      why: 'Real data changes over time. The versioning lesson replaces this with a content hash of the data file.',
    },
    {
      id: 'dumps',
      range: { line: 42 },
      kind: 'function',
      title: 'print(json.dumps(record))',
      what: 'Writes the record as one line of JSON. The readout shows exactly this line for the current controls.',
      why: 'JSON is easy to append to a file (one run per line), to search, and to load back into a table.',
    },
  ],
};

/** The whole program, runnable in the browser. It prints the record for config A, seed 0. */
export const trackingRunner: CodeExample = {
  id: 'tracking-runner',
  language: 'python',
  run: 'pyodide',
  source: `import json

${LCG_SOURCE}

${TRAIN_SOURCE}

${recordLines('0.005', '20', '8', '0')}`,
  annotations: [],
  expectedOutput:
    '{"config": {"lr": 0.005, "epochs": 20, "batch_size": 8}, "seed": 0, "data": "make_deliveries(60, seed=2024)", "metrics": {"status": "ok", "w": 3.6607, "b": 2.2882, "val_mse": 31.1996}}',
};

/** How tracking grows up: a print, a JSON-lines log, then a tracking server (MLflow). */
export const trackingStages: CodeExample = {
  id: 'tracking-stages',
  language: 'python',
  source: '',
  annotations: [],
  stages: [
    {
      id: 'print',
      title: 'print',
      note: 'The usual start: the score goes to the terminal and is gone. Which learning rate produced 31.2? Nobody knows next week.',
      source: `metrics = train(config, seed, rows)
print(metrics["val_mse"])`,
    },
    {
      id: 'jsonl',
      title: 'Append a record',
      note: 'One JSON object per run, appended to runs.jsonl. The file is the experiment log: config, seed, data and metrics travel together, and old runs are never overwritten.',
      source: `metrics = train(config, seed, rows)
record = {"config": config, "seed": seed, "data": "make_deliveries(60, seed=2024)", "metrics": metrics}
with open("runs.jsonl", "a") as f:
    f.write(json.dumps(record) + "\\n")`,
    },
    {
      id: 'mlflow',
      title: 'MLflow',
      note: 'A tracking library does the same with a UI on top: log_params stores the config, log_metric the scores, and set_tag anything else, such as the git commit. MLflow also records the start time and, when run from a git checkout, the commit.',
      source: `import mlflow

mlflow.set_experiment("delivery-time")
with mlflow.start_run():
    mlflow.log_params({**config, "seed": seed})
    mlflow.set_tag("data", "make_deliveries(60, seed=2024)")
    metrics = train(config, seed, rows)
    if metrics["status"] == "ok":
        mlflow.log_metric("val_mse", metrics["val_mse"])`,
    },
  ],
};

/** The record for config A, seed 0, pretty-printed (the program prints it on one line). */
export const recordJson: CodeExample = {
  id: 'tracking-record-json',
  language: 'json',
  source: `{
  "config": { "lr": 0.005, "epochs": 20, "batch_size": 8 },
  "seed": 0,
  "data": "make_deliveries(60, seed=2024)",
  "metrics": { "status": "ok", "w": 3.6607, "b": 2.2882, "val_mse": 31.1996 }
}`,
  annotations: [],
};
