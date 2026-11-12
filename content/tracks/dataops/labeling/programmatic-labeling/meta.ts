import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/labeling/programmatic-labeling',
  title: 'Weak supervision and active learning',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write labeling functions and measure their coverage, overlap, conflicts and accuracy on a small gold set',
    'Combine labeling functions by majority vote and explain what a label model adds',
    'Choose which examples to send to annotators with uncertainty sampling, and compare it with random sampling',
    'Pick between manual labeling, weak supervision, active learning and model-assisted pre-labeling for a task',
  ],
  prerequisites: ['dataops/labeling/annotation-agreement', 'ml/classical/logistic-regression'],
  concepts: ['weak-supervision', 'labeling-function', 'label-coverage', 'active-learning', 'uncertainty-sampling'],
  references: [
    {
      title: 'Ratner et al.: Snorkel: Rapid Training Data Creation with Weak Supervision (VLDB 2018)',
      url: 'https://arxiv.org/abs/1711.10160',
    },
    {
      title: 'Settles: Active Learning Literature Survey (University of Wisconsin–Madison, 2009)',
      url: 'https://burrsettles.com/pub/settles.activelearning.pdf',
    },
    {
      title: 'Amazon SageMaker Ground Truth: automated data labeling',
      url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/sms-automated-labeling.html',
    },
  ],
} satisfies LessonMeta;
