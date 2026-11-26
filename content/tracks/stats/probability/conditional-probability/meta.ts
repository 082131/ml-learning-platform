import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/probability/conditional-probability',
  title: "Conditional probability and Bayes' rule",
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Read P(A | B) as "the share of B-cases in which A also happens" and compute it from counts',
    'Tell P(A | B) from P(B | A), and explain why mixing them up is the most common probability error',
    "Derive Bayes' rule from a table of natural frequencies, and use it to turn a test's accuracy into what a positive result means",
    'Explain how the base rate drives the answer, using a fraud model as the example',
  ],
  prerequisites: ['stats/probability/probability-rules'],
  concepts: ['conditional-probability', 'bayes-rule', 'base-rate', 'sensitivity', 'false-positive-rate'],
  references: [
    { title: 'Blitzstein and Hwang, Introduction to Probability (2nd ed.), chapter 2: Conditional probability', url: 'https://projects.iq.harvard.edu/stat110/home' },
    { title: 'Gigerenzer and Hoffrage (1995), How to improve Bayesian reasoning without instruction: frequency formats', url: 'https://doi.org/10.1037/0033-295X.102.4.684' },
    { title: 'scikit-learn: precision, recall and the confusion matrix', url: 'https://scikit-learn.org/1.8/modules/model_evaluation.html#precision-recall-and-f-measures', version: '1.8' },
  ],
} satisfies LessonMeta;
