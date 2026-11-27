import { CteSteps } from './CteSteps';
import { FanOut } from './FanOut';
import { FunnelLab } from './FunnelLab';
import { JoinLab } from './JoinLab';
import { NullFilter } from './NullFilter';
import { QueryPipeline } from './QueryPipeline';
import { RecursionTrace } from './RecursionTrace';
import { SessionLab } from './SessionLab';
import { SqlExercise } from './SqlExercise';
import { SqlRunner } from './SqlRunner';
import { WindowLab } from './WindowLab';

/** Registers the SQL and Analytics track components for lessons (picked up by src/mdx-components.tsx). */
export default {
  SqlRunner,
  CteSteps,
  SqlExercise,
  QueryPipeline,
  NullFilter,
  JoinLab,
  FanOut,
  RecursionTrace,
  WindowLab,
  FunnelLab,
  SessionLab,
};
