import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/mdp/value-iteration',
  title: "Finding the best policy: value iteration",
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    "Explain the Bellman optimality equation and how it differs from the expectation equation",
    "Run value iteration and extract the greedy policy from its values",
    "Predict how the step reward, slip and \u03b3 change the optimal policy",
    "Compare value iteration with policy iteration",
  ],
  prerequisites: ['rl/mdp/value-functions'],
  concepts: ['optimal-policy', 'bellman-optimality', 'value-iteration', 'greedy-policy', 'policy-iteration'],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), sections 3.6, 4.3 and 4.4", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
    { title: "Artificial Intelligence: A Modern Approach, 4th edition (Russell and Norvig), section 17.2", url: 'https://aima.cs.berkeley.edu/' },
  ],
} satisfies LessonMeta;
