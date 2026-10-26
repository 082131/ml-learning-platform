import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/ablations',
  title: 'Error analysis and ablation studies',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Group validation errors into slices and find where a model fails',
    'Design a leave-one-out ablation that changes exactly one component',
    'Read an ablation table with its seed spread and separate real effects from noise',
    'Turn an error slice into a hypothesis and test it with a controlled change',
  ],
  prerequisites: ['ml/classical/metrics-error-analysis', 'ml/practice/experiment-tracking'],
  concepts: ['ablation', 'error-slice'],
  references: [
    {
      title: 'Meyes et al., Ablation Studies in Artificial Neural Networks (2019)',
      url: 'https://arxiv.org/abs/1901.08644',
    },
    {
      title: 'Python statistics module (mean, stdev)',
      url: 'https://docs.python.org/3/library/statistics.html',
      version: 'Python 3.13',
    },
    {
      title: 'Chung et al., Slice Finder: Automated Data Slicing for Model Validation (ICDE 2019)',
      url: 'https://arxiv.org/abs/1807.06068',
    },
  ],
} satisfies LessonMeta;
