import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/serving/apis-containers',
  title: 'Model serving, APIs, containers and deployment',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Serve a model behind an HTTP API with input validation, timeouts and health checks',
    'Package the model server and its dependencies in a container image',
    'Configure batching and concurrency in the server to match the measured capacity',
    'Plan a safe rollout of a new model version with a canary and a rollback',
  ],
  prerequisites: ['inference/runtimes/onnx-serving', 'inference/throughput/batching-throughput'],
  concepts: [],
} satisfies LessonMeta;
