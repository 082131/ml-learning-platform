import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/project-classification',
  title: 'Project: end-to-end classification model',
  level: 'intermediate',
  minutes: 180,
  kind: 'project',
  objectives: [
    'Build a classification pipeline from raw data to evaluated model',
    'Compare at least two model families fairly',
    'Report results with the right metrics and an error analysis',
  ],
  prerequisites: [
    'ml/classical/cross-validation',
    'ml/classical/metrics-error-analysis',
    'ml/classical/trees-ensembles',
  ],
  concepts: [],
} satisfies LessonMeta;
