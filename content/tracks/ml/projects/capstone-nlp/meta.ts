import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-nlp',
  title: 'Capstone: text-processing and NLP system',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Build a text classification or retrieval system',
    'Evaluate it with suitable metrics',
    'Analyze errors by type of text',
  ],
  prerequisites: ['ml/deep/embeddings', 'ml/classical/project-classification'],
  concepts: [],
} satisfies LessonMeta;
