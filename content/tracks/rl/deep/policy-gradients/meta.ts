import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/deep/policy-gradients',
  title: "Policy gradients: learning the policy directly",
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Explain why we may want to learn a policy directly instead of a value table",
    "Describe a softmax policy and compute the gradient of log \u03c0 for it",
    "Apply the REINFORCE update and explain each factor in it",
    "Explain why a baseline reduces variance without changing what is learned",
  ],
  prerequisites: ['rl/learning/sarsa-vs-q-learning', 'ml/math/gradients-chain-rule'],
  concepts: ['policy-gradient', 'reinforce', 'softmax-policy', 'baseline-rl', 'variance-rl'],
  references: [
    { title: "Williams (1992): Simple statistical gradient-following algorithms for connectionist reinforcement learning", url: 'https://link.springer.com/article/10.1007/BF00992696' },
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), section 2.8 and chapter 13", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
} satisfies LessonMeta;
