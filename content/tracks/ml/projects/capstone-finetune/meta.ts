import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-finetune',
  title: 'Capstone: fine-tune a pretrained transformer',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Fine-tune a pretrained transformer on a labeled dataset',
    'Compare it with a simple baseline',
    'Report cost, accuracy and failure cases',
  ],
  prerequisites: ['ml/deep/transformers', 'ml/practice/experiment-tracking'],
  concepts: [],
} satisfies LessonMeta;
