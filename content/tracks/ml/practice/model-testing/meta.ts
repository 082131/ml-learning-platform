import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/model-testing',
  title: 'Model testing and evaluation pipelines',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write tests for data, training code and model behavior',
    'Build an evaluation pipeline that runs on every model change',
    'Set pass or fail thresholds for a model release',
    'Use a bootstrap interval to see how uncertain a validation metric is',
  ],
  prerequisites: ['ml/practice/ablations'],
  concepts: ['behavioral-test', 'training-serving-skew', 'release-gate'],
  references: [
    {
      title: 'Breck et al., The ML Test Score: A Rubric for ML Production Readiness (IEEE Big Data 2017)',
      url: 'https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/',
    },
    {
      title: 'Ribeiro et al., Beyond Accuracy: Behavioral Testing of NLP Models with CheckList (2020)',
      url: 'https://arxiv.org/abs/2005.04118',
    },
    {
      title: 'pytest: How to parametrize fixtures and test functions',
      url: 'https://docs.pytest.org/en/stable/how-to/parametrize.html',
      version: 'pytest 9.1',
    },
    {
      title: 'Efron and Tibshirani, An Introduction to the Bootstrap (1993)',
      url: 'https://doi.org/10.1201/9780429246593',
    },
  ],
} satisfies LessonMeta;
