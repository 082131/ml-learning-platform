import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/what-is-ml',
  title: 'What AI, ML and deep learning actually mean',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Tell apart artificial intelligence, machine learning and deep learning with one example of each',
    'Explain the difference between a hand-written rule and a rule learned from labeled examples',
    'Name the parts of a learning system: data, features, model, training and inference',
    'Explain why a model is judged on examples it was not trained on',
  ],
  prerequisites: [],
  concepts: [
    'artificial-intelligence',
    'machine-learning',
    'deep-learning',
    'model',
    'training',
    'inference',
    'feature',
    'dataset',
    'label',
    'rule-based-system',
    'generalization',
  ],
  references: [
    {
      title: 'Machine Learning Crash Course: introduction to ML (Google)',
      url: 'https://developers.google.com/machine-learning/intro-to-ml',
    },
    {
      title: 'Python tutorial: dictionaries',
      url: 'https://docs.python.org/3/tutorial/datastructures.html#dictionaries',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
