import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/learning/monte-carlo-td',
  title: "Learning from experience: Monte Carlo and temporal-difference learning",
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    "Explain why we need learning methods that do not know the transition probabilities",
    "Update value estimates with Monte Carlo returns and with TD(0) targets",
    "Compute a TD error and say what it measures",
    "Compare Monte Carlo and TD on bias, variance and when updates happen",
  ],
  prerequisites: ['rl/mdp/value-iteration'],
  concepts: ['model-free', 'monte-carlo-method', 'td-learning', 'td-error', 'step-size'],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), chapters 5 and 6 (Example 6.2, the random walk)", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
} satisfies LessonMeta;
