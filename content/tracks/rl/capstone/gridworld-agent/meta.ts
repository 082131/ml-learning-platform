import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/capstone/gridworld-agent',
  title: "Capstone: plan it, then learn it",
  level: 'advanced',
  minutes: 90,
  kind: 'capstone',
  objectives: [
    "Build a grid-world environment, value iteration and a Q-learning agent from scratch",
    "Use the planned optimal policy as ground truth to grade a learned one",
    "Run a small, seeded experiment over \u03b1, \u03b5 and episodes and report it honestly",
    "Explain where the learned agent differs from the plan, and why",
  ],
  prerequisites: ['rl/llms/rl-for-llms'],
  concepts: [],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto)", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
} satisfies LessonMeta;
