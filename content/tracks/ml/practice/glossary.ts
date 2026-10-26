import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ml/practice chapter (merged into the glossary by content/index.ts).
// `introducedIn` is the lesson that first teaches the term.
export default [
  {
    id: 'experiment-tracking',
    term: 'Experiment tracking',
    short: 'Recording the inputs and results of every training run so runs can be compared and repeated.',
    long: 'A tracking system stores, per run, the config, seed, code and data versions, metrics and output files. It can be a JSON-lines file or a tool such as MLflow or Weights & Biases.',
    introducedIn: 'ml/practice/experiment-tracking',
  },
  {
    id: 'random-seed',
    term: 'Random seed',
    short:
      'The starting value of a pseudo-random number generator. The same seed gives the same sequence of numbers.',
    long: 'Training uses randomness for weight initialization, data splits, shuffling and dropout. Seeding every generator and recording the seed makes those choices repeatable.',
    introducedIn: 'ml/practice/experiment-tracking',
    aliases: ['seed'],
  },
  {
    id: 'reproducibility',
    term: 'Reproducibility',
    short: 'Getting the same result again from the same code, data, config and seed.',
    long: 'Bit-for-bit reproducibility is possible on one machine with seeded, deterministic code. Across library versions, hardware or nondeterministic GPU kernels, expect small differences and compare within the seed-to-seed spread instead.',
    introducedIn: 'ml/practice/experiment-tracking',
    aliases: ['reproducible'],
  },
  {
    id: 'run-record',
    term: 'Run record',
    short:
      'The saved description of one training run: its inputs (code, data, config, seed, environment) and outputs (metrics, files).',
    introducedIn: 'ml/practice/experiment-tracking',
    aliases: ['run log'],
  },
  {
    id: 'hyperparameter-search',
    term: 'Hyperparameter search',
    short:
      'Trying many settings that are fixed before training (learning rate, dropout, depth…) and keeping the one with the best validation score.',
    long: 'Each trial is a full training run, so the budget is the number of runs. Common strategies are grid search, random search and adaptive methods such as Bayesian optimization or successive halving.',
    introducedIn: 'ml/practice/hyperparameter-tuning',
    aliases: ['hyperparameter tuning', 'tuning'],
  },
  {
    id: 'random-search',
    term: 'Random search',
    short:
      'Hyperparameter search that samples each setting at random from a range, for a fixed number of trials.',
    long: 'With the same budget it tries more distinct values of each hyperparameter than a grid, which matters when only a few hyperparameters are important (Bergstra and Bengio, 2012).',
    introducedIn: 'ml/practice/hyperparameter-tuning',
    aliases: ['grid search'],
  },
  {
    id: 'early-stopping',
    term: 'Early stopping',
    short:
      'Ending training when the validation loss has not improved for a set number of epochs (the patience), and keeping the best epoch.',
    introducedIn: 'ml/practice/hyperparameter-tuning',
    aliases: ['patience'],
  },
  {
    id: 'content-hash',
    term: 'Content hash',
    short:
      'A fixed-length fingerprint computed from a file’s exact bytes (for example with SHA-256). The same bytes always give the same hash.',
    long: 'Changing one byte changes the hash completely, so a hash names a version of the content regardless of the file’s name. Git, DVC and model registries identify versions this way.',
    introducedIn: 'ml/practice/versioning',
    aliases: ['checksum', 'SHA-256', 'fingerprint'],
  },
  {
    id: 'data-lineage',
    term: 'Lineage',
    short:
      'The record of which inputs (data, code, config) produced an artifact such as a model, and which artifacts it fed.',
    introducedIn: 'ml/practice/versioning',
    aliases: ['data lineage', 'provenance'],
  },
  {
    id: 'model-registry',
    term: 'Model registry',
    short:
      'A store of trained models with their versions, lineage (the run that produced them) and status, such as staging or production.',
    introducedIn: 'ml/practice/versioning',
  },
  {
    id: 'ablation',
    term: 'Ablation study',
    short:
      'Measuring how much each part of a model or pipeline contributes by removing one part at a time and re-evaluating.',
    long: 'Each ablation changes exactly one component and keeps data, seeds and everything else fixed, so the change in the metric can be attributed to that component. Differences smaller than the seed-to-seed spread are not findings.',
    introducedIn: 'ml/practice/ablations',
    aliases: ['ablation', 'leave-one-out'],
  },
  {
    id: 'error-slice',
    term: 'Error slice',
    short:
      'A subset of examples defined by a column value (a region, a language, a device) on which a model’s error is measured separately.',
    long: 'Error analysis compares slices to find where a model fails; an average metric can look fine while one slice is much worse.',
    introducedIn: 'ml/practice/ablations',
    aliases: ['slice', 'error analysis'],
  },
  {
    id: 'behavioral-test',
    term: 'Behavioral test',
    short:
      'A test of how a model’s prediction responds to a controlled change in its input, such as "one more stop should not make the delivery faster".',
    long: 'Directional tests check the sign or size of a change, invariance tests check that an irrelevant change leaves the prediction alone. They encode domain knowledge that an average metric does not check.',
    introducedIn: 'ml/practice/model-testing',
    aliases: ['directional test', 'invariance test'],
  },
  {
    id: 'training-serving-skew',
    term: 'Training-serving skew',
    short:
      'A difference between how features are computed during training and in production, which makes production predictions worse than offline metrics suggest.',
    introducedIn: 'ml/practice/model-testing',
    aliases: ['train-serve skew'],
  },
  {
    id: 'release-gate',
    term: 'Release gate',
    short:
      'A pass or fail threshold, agreed in advance, that a new model must meet before it replaces the current one, for example a maximum validation error per slice.',
    introducedIn: 'ml/practice/model-testing',
    aliases: ['quality gate', 'metric gate'],
  },
  {
    id: 'mixed-precision',
    term: 'Mixed-precision training',
    short:
      'Training with most matrix arithmetic in a 16-bit format (bfloat16 or float16) while keeping weights and precision-sensitive operations in float32.',
    long: 'It speeds up computation on tensor cores and halves activation memory. With float16, the loss is scaled so small gradients do not round to zero; bfloat16 has float32’s exponent range and needs no scaling.',
    introducedIn: 'ml/practice/gpu-training',
    aliases: ['automatic mixed precision', 'AMP', 'autocast'],
  },
  {
    id: 'activation-checkpointing',
    term: 'Activation checkpointing',
    short:
      'Keeping only some activations (such as each layer’s input) during the forward pass and recomputing the rest during the backward pass, trading compute for memory.',
    introducedIn: 'ml/practice/gpu-training',
    aliases: ['gradient checkpointing', 'activation recomputation'],
  },
  {
    id: 'model-flops-utilization',
    term: 'Model FLOPs utilization',
    short:
      'The share of a GPU’s peak throughput that a training run achieves: model FLOPs per second divided by the datasheet peak.',
    introducedIn: 'ml/practice/gpu-training',
    aliases: ['MFU', 'utilization'],
  },
] satisfies GlossaryTerm[];
