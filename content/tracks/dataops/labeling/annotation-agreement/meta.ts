import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/labeling/annotation-agreement',
  title: 'Annotation guidelines and inter-annotator agreement',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Design an annotation task: label definitions, edge-case rules, gold questions and adjudication',
    'Compute observed agreement and Cohen’s kappa by hand from a confusion matrix of two annotators',
    'Explain why raw agreement looks high on imbalanced labels while kappa stays low',
    'Decide from agreement numbers whether to fix the guidelines, retrain annotators, or accept the labels',
  ],
  prerequisites: ['dataops/foundations/data-centric-ml', 'ml/math/probability'],
  concepts: ['annotation-guidelines', 'inter-annotator-agreement', 'cohens-kappa', 'gold-standard', 'adjudication'],
  references: [
    {
      title: 'Cohen: A Coefficient of Agreement for Nominal Scales (Educational and Psychological Measurement, 1960)',
      url: 'https://doi.org/10.1177/001316446002000104',
    },
    {
      title: 'scikit-learn: cohen_kappa_score',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'Amazon SageMaker Ground Truth: annotation consolidation',
      url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/sms-annotation-consolidation.html',
    },
    {
      title: 'Label Studio documentation: review and agreement',
      url: 'https://labelstud.io/guide/stats',
    },
  ],
} satisfies LessonMeta;
