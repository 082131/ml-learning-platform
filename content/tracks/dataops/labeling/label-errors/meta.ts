import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/labeling/label-errors',
  title: 'Finding label errors with confident learning',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain why label audits must use out-of-fold predicted probabilities, never in-sample ones',
    'Compute per-class confidence thresholds and flag likely label errors the way confident learning does',
    'Measure an audit’s precision and recall against known errors, and compare per-class thresholds with one fixed cutoff',
    'Rank flagged examples for review and decide between correcting, removing and keeping them',
  ],
  prerequisites: ['dataops/labeling/programmatic-labeling', 'ml/classical/cross-validation'],
  concepts: ['confident-learning', 'out-of-fold-prediction', 'per-class-threshold', 'label-noise', 'precision-recall'],
  references: [
    {
      title: 'Northcutt, Jiang and Chuang: Confident Learning: Estimating Uncertainty in Dataset Labels (JAIR 2021)',
      url: 'https://arxiv.org/abs/1911.00068',
    },
    {
      title: 'cleanlab: find_label_issues',
      url: 'https://docs.cleanlab.ai/stable/cleanlab/filter.html',
      version: 'cleanlab 2.7',
    },
    {
      title: 'scikit-learn: cross_val_predict',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.cross_val_predict.html',
      version: 'scikit-learn 1.8',
    },
  ],
} satisfies LessonMeta;
