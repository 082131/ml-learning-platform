import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/runtimes/onnx-serving',
  title: 'ONNX, ONNX Runtime and serving runtimes',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Export a model to ONNX and run it with ONNX Runtime',
    'Explain what graph optimizations a runtime applies',
    'Compare serving runtimes for a given model',
  ],
  prerequisites: ['inference/runtime/loading-serialization'],
  concepts: [],
} satisfies LessonMeta;
