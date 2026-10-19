import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/serving/apis-containers',
  title: 'Model serving, APIs, containers and deployment',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Serve a model behind an HTTP API',
    'Package a model server in a container',
    'Plan a safe rollout of a new model version',
  ],
  prerequisites: ['inference/runtimes/onnx-serving'],
  concepts: [],
} satisfies LessonMeta;
