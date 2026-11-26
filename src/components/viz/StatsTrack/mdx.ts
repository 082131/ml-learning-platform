import { DiceGrid, FraudTree, GambleView } from './Probability';
import { DiscreteView, NormalView } from './Distributions';
import { IntervalsView, SamplingView } from './Sampling';
import { NullView, PowerView } from './Testing';
import { AbIntervalView, PeekingView, SampleSizeView } from './Experiments';
import { BayesAbView, BetaUpdateView } from './Bayes';
import { ReportView } from './Report';

/** Registers the Statistics and probability track visualizations (picked up by src/mdx-components.tsx). */
export default {
  DiceGrid,
  FraudTree,
  GambleView,
  DiscreteView,
  NormalView,
  SamplingView,
  IntervalsView,
  NullView,
  PowerView,
  SampleSizeView,
  AbIntervalView,
  PeekingView,
  BetaUpdateView,
  BayesAbView,
  ReportView,
};
