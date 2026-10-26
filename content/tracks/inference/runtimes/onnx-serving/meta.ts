import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/runtimes/onnx-serving',
  title: 'ONNX, ONNX Runtime and serving runtimes',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Export a PyTorch model to ONNX and check that its outputs match the original',
    'Run an ONNX model with ONNX Runtime and select an execution provider',
    'Explain the graph optimizations a runtime applies, such as operator fusion and constant folding',
    'Compare serving runtimes and choose one for a given model and hardware',
  ],
  prerequisites: ['inference/runtime/loading-serialization'],
  concepts: [],
} satisfies LessonMeta;
