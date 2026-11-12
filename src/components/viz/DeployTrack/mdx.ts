import { HpaCharts } from './Autoscaling';
import { GgufHex } from './GgufHex';
import { OffloadView } from './Offload';
import { PagedKvView } from './PagedKv';
import { PipelineSteps } from './Pipeline';
import { QuantLab } from './QuantLab';
import { SchedulerNodes } from './Scheduler';
import { StackMap } from './StackMap';

/** Registers the Model Deployment track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default { SchedulerNodes, HpaCharts, QuantLab, GgufHex, OffloadView, PagedKvView, StackMap, PipelineSteps };
