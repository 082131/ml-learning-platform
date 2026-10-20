import type { GlossaryTerm } from '@/lib/types';

export default [
  {
    id: 'baseline-model',
    term: 'Baseline model',
    short:
      'A deliberately simple model, such as “always predict the most common class”, that a real model must beat.',
    long: 'If 168 of 333 penguins are male, always answering “male” is right about half the time. A model that scores 0.51 has learned nothing, even though 0.51 sounds like a score. scikit-learn provides baselines as DummyClassifier and DummyRegressor.',
    introducedIn: 'ml/classical/project-classification',
    aliases: ['baseline', 'dummy classifier'],
  },
  {
    id: 'ml-pipeline',
    term: 'Pipeline (scikit-learn)',
    short: 'A chain of preprocessing steps and a model that is fitted and applied as one object.',
    long: 'Calling fit on a pipeline fits each step on the training data in order; calling predict applies the same fitted steps to new data. Keeping preprocessing inside the pipeline means cross-validation refits it on each training fold, so nothing is learned from validation or test rows.',
    introducedIn: 'ml/classical/project-classification',
    aliases: ['make_pipeline', 'Pipeline'],
  },
] satisfies GlossaryTerm[];
