import { ApproachTable, BreakEvenChart } from './Landscape';
import { GeneratedText, NextTokenBars } from './NextToken';
import { RetryTimeline } from './RetryTimeline';
import { PromptScoreboard, SchemaCheck } from './Structured';
import { IvfTradeoff, RetrievalEvalTable } from './Retrieval';
import { SseWire, StreamCompare } from './Streaming';
import { EvalScoreboard, GuardrailTable } from './Reliability';
import { CanaryChart, CostBreakdown, PolicyTable } from './Ops';

/** Registers the AI Engineer track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default {
  ApproachTable,
  BreakEvenChart,
  NextTokenBars,
  GeneratedText,
  RetryTimeline,
  SchemaCheck,
  PromptScoreboard,
  IvfTradeoff,
  RetrievalEvalTable,
  StreamCompare,
  SseWire,
  EvalScoreboard,
  GuardrailTable,
  CostBreakdown,
  PolicyTable,
  CanaryChart,
};
