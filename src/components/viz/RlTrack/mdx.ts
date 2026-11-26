import { RlBandit } from './Bandit';
import { RlCliff, RlQGrid, RlWalk } from './Learning';
import { RlEvalGrid, RlTransitions, RlViGrid } from './Planning';
import { RlPlayGrid, RlReturnBars } from './Play';
import { RlKlPolicy, RlPolicyGradient, RlPpoClip } from './Policy';

/** Registers the Reinforcement learning track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default {
  RlPlayGrid,
  RlReturnBars,
  RlBandit,
  RlTransitions,
  RlEvalGrid,
  RlViGrid,
  RlWalk,
  RlQGrid,
  RlCliff,
  RlPolicyGradient,
  RlPpoClip,
  RlKlPolicy,
};
