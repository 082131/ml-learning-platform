// Code for ml/practice/hyperparameter-tuning. Outputs were produced by running the program with
// CPython 3.13.16; src/lib/practice/tuning.test.ts checks the visual's TypeScript against them.
import { tuningExperiment, type TuningState } from '@/lib/practice/tuning';
import type { CodeExample } from '@/lib/types';

export const initial: TuningState = { k: 3, seed: 0, patience: 3 };

/** One state for the lesson: the search plane, the stopping chart, the code and the readout. */
export const experiment = tuningExperiment('tuning', initial);

const st = (s: unknown) => s as TuningState;

const SOURCE = `import math

class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32

def val_loss(log_lr, dropout):
    """Stands in for: train with these hyperparameters, return the validation loss."""
    lr_term = 0.5 * (1 - math.exp(-((log_lr + 1.9) ** 2) / 0.245))
    dropout_term = 0.04 * ((dropout - 0.2) / 0.25) ** 2
    return 0.3 + lr_term + dropout_term

def grid_search(k):
    trials = []
    for i in range(k):
        for j in range(k):
            log_lr = -4 + 3 * i / (k - 1)
            dropout = 0.5 * j / (k - 1)
            trials.append((val_loss(log_lr, dropout), log_lr, dropout))
    return trials

def random_search(n, seed):
    rng = LCG(seed)
    trials = []
    for _ in range(n):
        log_lr = -4 + 3 * rng.random()
        dropout = 0.5 * rng.random()
        trials.append((val_loss(log_lr, dropout), log_lr, dropout))
    return trials

def report(name, trials):
    loss, log_lr, dropout = min(trials)
    distinct = len({round(t[1], 6) for t in trials})
    print(f"{name}: best loss {loss:.4f} at lr=10^{log_lr:.2f}, dropout={dropout:.2f}; "
          f"{distinct} distinct learning rates")

def val_curve(epochs, seed):
    """Validation loss per epoch: fast improvement, then slow overfitting, plus noise."""
    rng = LCG(seed)
    return [0.32 + 0.8 * math.exp(-t / 8) + 0.004 * t + 0.03 * (rng.random() - 0.5)
            for t in range(1, epochs + 1)]

def early_stop(losses, patience):
    best, best_epoch, wait = float("inf"), 0, 0
    for epoch, loss in enumerate(losses, start=1):
        if loss < best:
            best, best_epoch, wait = loss, epoch, 0
        else:
            wait += 1
            if wait >= patience:
                return best_epoch, epoch
    return best_epoch, len(losses)

k, seed, patience = {{k}}, {{seed}}, {{patience}}
report("grid", grid_search(k))
report("random", random_search(k * k, seed))

losses = val_curve(60, seed)
best_epoch, stopped = early_stop(losses, patience)
print(f"patience {patience}: best epoch {best_epoch} (loss {losses[best_epoch - 1]:.4f}), stopped after epoch {stopped}")`;

export const tuningCode: CodeExample = {
  id: 'tuning-search',
  language: 'python',
  source: SOURCE,
  slots: {
    k: (s) => String(st(s).k),
    seed: (s) => String(st(s).seed),
    patience: (s) => String(st(s).patience),
  },
  annotations: [
    {
      id: 'val-loss',
      range: { line: 11 },
      kind: 'function',
      title: 'val_loss: a known function instead of a training run',
      what: 'Returns a validation loss for a learning rate (as log10) and a dropout rate, from a formula.',
      why: 'A real trial trains a model for minutes or hours. A formula with a known minimum lets you see how well each search method does, which you can never see on a real problem.',
      inputs: 'log_lr in [-4, -1] (lr from 0.0001 to 0.1), dropout in [0, 0.5]',
      output: 'A loss of at least 0.3, reached at log_lr = -1.9, dropout = 0.2',
    },
    {
      id: 'lr-term',
      range: { line: 13 },
      kind: 'math',
      title: 'The learning rate dominates',
      what: 'A bowl in log10(lr) centred on -1.9 (lr ≈ 0.0126), adding up to 0.5 to the loss.',
      why: 'Real models are often like this: the learning rate matters far more than most other settings.',
    },
    {
      id: 'dropout-term',
      range: { line: 14 },
      kind: 'math',
      title: 'Dropout barely matters',
      what: 'A shallow bowl centred on 0.2. Across the whole range of dropout it adds at most 0.0576.',
      why: 'This is the situation where random search beats grid search: one important axis, one unimportant one.',
    },
    {
      id: 'grid-lr',
      range: { line: 21 },
      kind: 'math',
      title: 'Evenly spaced in log10(lr)',
      what: 'k values from -4 to -1, so lr goes 0.0001, …, 0.1 in equal ratios.',
      why: 'Learning rates are searched on a log scale: 0.001 vs 0.002 matters as much as 0.01 vs 0.02.',
      output: 'Only k distinct learning rates, each repeated k times (once per dropout value)',
    },
    {
      id: 'random-lr',
      range: { line: 30 },
      kind: 'math',
      title: 'A fresh learning rate every trial',
      what: 'Draws log10(lr) uniformly from [-4, -1].',
      why: 'Every random trial tries a new learning rate, so n trials test n learning rates instead of √n.',
    },
    {
      id: 'min',
      range: { line: 36 },
      kind: 'function',
      title: 'min(trials) picks the lowest loss',
      what: 'Tuples compare by their first item, the loss.',
      why: 'The search reports the best trial. On real problems, re-run that config with several seeds before trusting the number.',
    },
    {
      id: 'distinct',
      range: { line: 37 },
      kind: 'syntax',
      title: 'How many learning rates were really tried',
      what: 'A set of the (rounded) log_lr values; its size counts the distinct ones.',
      why: 'This number explains most of the gap between grid and random search here.',
    },
    {
      id: 'curve',
      range: { line: 44 },
      kind: 'math',
      title: 'A validation curve with overfitting and noise',
      what: 'The loss falls quickly (the exp term), then creeps up by 0.004 per epoch (overfitting), with ±0.015 of seeded noise.',
      why: 'Noise is why early stopping needs patience: one bad epoch does not mean the model has stopped improving.',
    },
    {
      id: 'patience',
      range: { line: 54 },
      kind: 'syntax',
      title: 'Stop after `patience` epochs without a new best',
      what: 'wait counts epochs since the last improvement; reaching patience ends training.',
      why: 'The kept model is the best epoch, not the last one. Frameworks implement the same rule (for example a patience argument on an early-stopping callback).',
    },
    {
      id: 'settings',
      range: { line: 58 },
      kind: 'parameter',
      title: 'The experiment’s controls',
      what: 'k (budget k² for both searches), the seed of the random search and the noise, and the patience.',
      why: 'These literals are filled from the sliders; the readout shows what the program prints for them.',
    },
  ],
};

/** The complete program, runnable in the browser. */
export const tuningRunner: CodeExample = {
  id: 'tuning-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32

def val_loss(log_lr, dropout):
    """Stands in for: train with these hyperparameters, return the validation loss."""
    lr_term = 0.5 * (1 - math.exp(-((log_lr + 1.9) ** 2) / 0.245))
    dropout_term = 0.04 * ((dropout - 0.2) / 0.25) ** 2
    return 0.3 + lr_term + dropout_term

def grid_search(k):
    trials = []
    for i in range(k):
        for j in range(k):
            log_lr = -4 + 3 * i / (k - 1)
            dropout = 0.5 * j / (k - 1)
            trials.append((val_loss(log_lr, dropout), log_lr, dropout))
    return trials

def random_search(n, seed):
    rng = LCG(seed)
    trials = []
    for _ in range(n):
        log_lr = -4 + 3 * rng.random()
        dropout = 0.5 * rng.random()
        trials.append((val_loss(log_lr, dropout), log_lr, dropout))
    return trials

def report(name, trials):
    loss, log_lr, dropout = min(trials)
    distinct = len({round(t[1], 6) for t in trials})
    print(f"{name}: best loss {loss:.4f} at lr=10^{log_lr:.2f}, dropout={dropout:.2f}; "
          f"{distinct} distinct learning rates")

def val_curve(epochs, seed):
    """Validation loss per epoch: fast improvement, then slow overfitting, plus noise."""
    rng = LCG(seed)
    return [0.32 + 0.8 * math.exp(-t / 8) + 0.004 * t + 0.03 * (rng.random() - 0.5)
            for t in range(1, epochs + 1)]

def early_stop(losses, patience):
    best, best_epoch, wait = float("inf"), 0, 0
    for epoch, loss in enumerate(losses, start=1):
        if loss < best:
            best, best_epoch, wait = loss, epoch, 0
        else:
            wait += 1
            if wait >= patience:
                return best_epoch, epoch
    return best_epoch, len(losses)

k, seed, patience = 3, 0, 3
report("grid", grid_search(k))
report("random", random_search(k * k, seed))

losses = val_curve(60, seed)
best_epoch, stopped = early_stop(losses, patience)
print(f"patience {patience}: best epoch {best_epoch} (loss {losses[best_epoch - 1]:.4f}), stopped after epoch {stopped}")`,
  annotations: [],
  expectedOutput: `grid: best loss 0.6866 at lr=10^-2.50, dropout=0.25; 3 distinct learning rates
random: best loss 0.3023 at lr=10^-1.88, dropout=0.16; 9 distinct learning rates
patience 3: best epoch 25 (loss 0.4405), stopped after epoch 28`,
};

/** From one search to a budgeted, early-stopped one, in pseudocode-sized steps of real Python. */
export const tuningStages: CodeExample = {
  id: 'tuning-stages',
  language: 'python',
  source: '',
  annotations: [],
  stages: [
    {
      id: 'manual',
      title: 'By hand',
      note: 'Change a number, retrain, look at the score, repeat. Fine for a first feel, but nothing is recorded and the order you tried things in biases what you find.',
      source: `config = {"lr": 0.01, "dropout": 0.2}
print(train_and_validate(config))`,
    },
    {
      id: 'random',
      title: 'Random search',
      note: 'Sample every hyperparameter from a range (log scale for rates), run a fixed budget of trials, and log each one. The seed makes the set of trials reproducible.',
      source: `rng = random.Random(0)
for trial in range(20):
    config = {"lr": 10 ** rng.uniform(-4, -1), "dropout": rng.uniform(0, 0.5)}
    log_run(config, train_and_validate(config))`,
    },
    {
      id: 'early',
      title: '+ early stopping',
      note: 'Each trial stops when validation loss has not improved for `patience` epochs and keeps its best epoch. Bad configs end early, so the same compute buys more trials.',
      source: `rng = random.Random(0)
for trial in range(20):
    config = {"lr": 10 ** rng.uniform(-4, -1), "dropout": rng.uniform(0, 0.5)}
    losses = []
    for epoch in range(100):
        losses.append(train_one_epoch_and_validate(config))
        if epoch - losses.index(min(losses)) >= patience:
            break
    log_run(config, min(losses), best_epoch=losses.index(min(losses)) + 1)`,
    },
  ],
};
