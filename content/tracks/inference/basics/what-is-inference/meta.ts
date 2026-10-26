import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/basics/what-is-inference',
  title: 'Inference vs training',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Explain what changes between training and inference: no gradients, no optimizer state, fixed weights',
    'Trace one request through a served model from input to response',
    'Distinguish online, batch and streaming (token-by-token) inference and give an example of each',
    'Name the goals a serving system is judged on: latency, throughput, cost and accuracy',
  ],
  prerequisites: ['ml/foundations/what-is-ml', 'ml/deep/forward-propagation'],
  concepts: ['inference', 'training'],
} satisfies LessonMeta;
