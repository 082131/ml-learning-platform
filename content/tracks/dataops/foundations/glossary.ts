import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the dataops/foundations chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'data-centric-ai',
    term: 'Data-centric AI',
    short:
      'Improving a machine learning system mainly by improving its data (labels, coverage, consistency) while the model code stays fixed.',
    long: 'The opposite habit, model-centric work, holds the dataset fixed and iterates on architectures and hyperparameters. In practice both matter; data work often pays more once a reasonable model exists, because label errors and gaps cap what any model can learn.',
    introducedIn: 'dataops/foundations/data-centric-ml',
    aliases: ['data-centric ML', 'data-centric machine learning'],
  },
  {
    id: 'label-noise',
    term: 'Label noise',
    short: 'Training labels that are wrong: an annotator, a rule or a logging bug assigned the wrong class.',
    long: 'Symmetric (uniform) noise flips labels at random; class-conditional noise confuses specific pairs of classes, such as "cat" and "fox". Noise lowers the accuracy a model can reach, and noise in the test set makes the measured accuracy itself unreliable.',
    introducedIn: 'dataops/foundations/data-centric-ml',
    aliases: ['noisy labels', 'label errors', 'mislabeled data'],
  },
  {
    id: 'k-nearest-neighbours',
    term: 'k-nearest neighbours (k-NN)',
    short:
      'A classifier that predicts the majority label among the k training examples closest to the input.',
    long: 'With k = 1 it copies the label of the single nearest example, so one wrong label creates a wrong region around it. Larger k averages over more neighbours and is more robust to label noise, at the cost of blurring fine boundaries.',
    introducedIn: 'dataops/foundations/data-centric-ml',
    aliases: ['k-NN', 'kNN', 'nearest neighbour classifier', 'nearest neighbor'],
  },
  {
    id: 'ml-data-lifecycle',
    term: 'ML data lifecycle',
    short:
      'The stages data goes through in an ML system: collect, label, validate, version, train, serve, monitor, and feed back.',
    long: 'Each stage has its own failure mode: biased collection, wrong labels, broken batches, unreproducible datasets, training-serving skew, drift. ML data operations (DataOps for ML) is the practice of running these stages reliably and repeatably.',
    introducedIn: 'dataops/foundations/data-centric-ml',
    aliases: ['data lifecycle', 'DataOps', 'ML data operations'],
  },
] satisfies GlossaryTerm[];
