import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/foundations/data-centric-ml',
  title: 'Data-centric ML: when better data beats a better model',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Name the stages of the ML data lifecycle and the operational question each one answers',
    'Explain how label noise limits a model, and measure it by training on deliberately corrupted labels',
    'Compare "collect more data", "clean the labels" and "change the model" as fixes, using a held-out clean test set',
    'Audit labels cheaply by flagging examples whose neighbours disagree with them',
  ],
  prerequisites: ['ml/foundations/what-is-ml', 'ml/classical/splits-leakage'],
  concepts: ['data-centric-ai', 'label-noise', 'k-nearest-neighbours', 'ml-data-lifecycle', 'label'],
  references: [
    {
      title: 'Andrew Ng et al.: Data-Centric AI resource hub and competition (DeepLearning.AI, 2021)',
      url: 'https://datacentricai.org/',
    },
    {
      title: 'Northcutt, Athalye and Mueller: Pervasive Label Errors in Test Sets Destabilize ML Benchmarks (NeurIPS 2021)',
      url: 'https://arxiv.org/abs/2103.14749',
    },
    {
      title: 'scikit-learn: Nearest Neighbors classification',
      url: 'https://scikit-learn.org/stable/modules/neighbors.html#classification',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'Google Cloud: Professional Machine Learning Engineer exam guide (data preparation sections)',
      url: 'https://cloud.google.com/learn/certification/machine-learning-engineer',
    },
    {
      title: 'AWS Certified Machine Learning Engineer – Associate: exam guide (Domain 1, data preparation)',
      url: 'https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-01/machine-learning-engineer-associate-01.html',
    },
  ],
} satisfies LessonMeta;
