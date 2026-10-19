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
] satisfies GlossaryTerm[];
