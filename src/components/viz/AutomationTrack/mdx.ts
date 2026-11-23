import { CronView, RerunView, RetryView } from './Schedules';
import { GateView, WorkflowView } from './Delivery';
import { AgentGuardView, DeliveryView, SignatureView } from './Events';
import { DagGantt, IntervalRuns } from './Pipelines';
import { OrganizePlan, WorthChart } from './Planning';

/** Registers the Automation track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default {
  WorthChart,
  OrganizePlan,
  CronView,
  RetryView,
  RerunView,
  WorkflowView,
  GateView,
  DagGantt,
  IntervalRuns,
  SignatureView,
  DeliveryView,
  AgentGuardView,
};
