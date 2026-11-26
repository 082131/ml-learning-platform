import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/learning/q-learning',
  title: "Q-learning: learning to act without a map",
  level: 'intermediate',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Explain why learning Q(s,a) instead of V(s) lets an agent choose actions without a model",
    "Apply the Q-learning update by hand and in code",
    "Tune the learning rate \u03b1 and the exploration rate \u03b5 and read their effect on a learning curve",
    "Explain why rarely visited states keep inaccurate values",
  ],
  prerequisites: ['rl/learning/monte-carlo-td'],
  concepts: ['q-learning', 'q-table', 'learning-rate-rl'],
  references: [
    { title: "Watkins and Dayan (1992): Q-learning, Machine Learning 8", url: 'https://link.springer.com/article/10.1007/BF00992698' },
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), section 6.5", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
    { title: "Gymnasium: FrozenLake", url: 'https://gymnasium.farama.org/environments/toy_text/frozen_lake/', version: '1.4.0' },
  ],
} satisfies LessonMeta;
