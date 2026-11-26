import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/learning/sarsa-vs-q-learning',
  title: "SARSA vs Q-learning: on-policy and off-policy",
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    "Write the SARSA update and point to the one term that differs from Q-learning",
    "Explain on-policy vs off-policy learning with the cliff-walking example",
    "Predict which algorithm earns more while it still explores, and which learns the shorter route",
    "Choose between them for a task where mistakes during training are costly",
  ],
  prerequisites: ['rl/learning/q-learning'],
  concepts: ['sarsa', 'on-policy', 'off-policy', 'behaviour-policy'],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), sections 6.4 to 6.5 (Example 6.6, cliff walking)", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
} satisfies LessonMeta;
