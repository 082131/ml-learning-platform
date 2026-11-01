import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/features chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'point-in-time-correctness',
    term: 'Point-in-time correctness',
    short:
      'Building each training example only from data that existed at the moment its prediction would have been made.',
    long: 'Done with an as-of join: each example gets the latest feature value written strictly before its timestamp. Joining the current or same-day value instead leaks the future, so offline metrics look better than production will.',
    introducedIn: 'data/features/training-serving',
    aliases: ['as-of join', 'point-in-time join', 'time travel join'],
  },
  {
    id: 'feature-pipeline',
    term: 'Feature pipeline',
    short:
      'A data pipeline that turns raw events and tables into model features, on a schedule or as a stream.',
    long: 'It writes features for training (history, one row per entity per time) and for serving (the latest value per entity). Using one definition for both is the main defence against training-serving skew.',
    introducedIn: 'data/features/training-serving',
    aliases: ['feature engineering pipeline', 'feature job'],
  },
  {
    id: 'feature-store',
    term: 'Feature store',
    short:
      'A system that stores feature values with timestamps, serves point-in-time training sets offline and the latest values online.',
    long: 'Typically an offline store (a warehouse or lakehouse table with history) and an online store (a low-latency key-value database), filled by the same feature definitions. Examples include Feast, Tecton and the feature stores in cloud ML platforms.',
    introducedIn: 'data/features/training-serving',
    aliases: ['offline store', 'online store'],
  },
  {
    id: 'population-stability-index',
    term: 'Population stability index',
    short:
      'A number that measures how much a variable’s distribution moved between two samples, such as training data and serving logs.',
    long: 'Bin the first sample, compute each bin’s share in both, and sum (actual − expected) × ln(actual / expected). A common rule of thumb: under 0.1 stable, 0.1 to 0.25 worth a look, above 0.25 a major shift.',
    introducedIn: 'data/features/training-serving',
    aliases: ['psi'],
  },
] satisfies GlossaryTerm[];
