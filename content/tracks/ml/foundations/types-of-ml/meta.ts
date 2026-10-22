import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/types-of-ml',
  title: 'Supervised, unsupervised and reinforcement learning',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Sort a problem into supervised, unsupervised or reinforcement learning',
    'Explain what a label is and tell whether a problem has one',
    'Tell classification from regression among supervised problems',
    'Explain why clusters found without labels need not match the categories you care about',
  ],
  prerequisites: ['ml/foundations/what-is-ml'],
  concepts: [
    'supervised-learning',
    'unsupervised-learning',
    'reinforcement-learning',
    'label',
    'feature',
    'model',
  ],
  references: [
    {
      title: 'Machine Learning Crash Course: what is machine learning? (Google)',
      url: 'https://developers.google.com/machine-learning/intro-to-ml/what-is-ml',
    },
    {
      title: 'Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), chapter 1',
      url: 'http://incompleteideas.net/book/the-book-2nd.html',
    },
    {
      title: 'palmerpenguins dataset (CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
    },
  ],
} satisfies LessonMeta;
