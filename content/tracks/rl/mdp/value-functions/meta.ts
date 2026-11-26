import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/mdp/value-functions',
  title: "Value functions and the Bellman equation",
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    "Explain what a state value V(s) and an action value Q(s,a) measure, and how they differ",
    "Write the Bellman expectation equation and explain each part of it",
    "Run policy evaluation by hand for one cell and in code for the whole grid",
    "Explain why repeated sweeps converge to the true values of a policy",
  ],
  prerequisites: ['rl/mdp/markov-decision-processes'],
  concepts: ['state-value', 'action-value', 'bellman-equation', 'policy-evaluation', 'bootstrapping'],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), sections 3.5 and 4.1", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
} satisfies LessonMeta;
