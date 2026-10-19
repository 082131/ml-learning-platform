import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/precision/precision-quantization',
  title: 'FP32, FP16, BF16, INT8 and quantization error',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Read the bit layout of FP32, FP16 and BF16',
    'Quantize and dequantize weights to INT8 by hand',
    'Measure quantization error and compare per-tensor and per-channel scales',
  ],
  prerequisites: ['inference/memory/memory-estimation'],
  concepts: [],
} satisfies LessonMeta;
