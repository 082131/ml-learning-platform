import { CteSteps } from './CteSteps';
import { NullFilter } from './NullFilter';
import { QueryPipeline } from './QueryPipeline';
import { SqlExercise } from './SqlExercise';
import { SqlRunner } from './SqlRunner';

/** Registers the SQL and Analytics track components for lessons (picked up by src/mdx-components.tsx). */
export default {
  SqlRunner,
  CteSteps,
  SqlExercise,
  QueryPipeline,
  NullFilter,
};
