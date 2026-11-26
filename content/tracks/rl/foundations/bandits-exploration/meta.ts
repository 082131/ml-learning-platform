import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/foundations/bandits-exploration',
  title: "Exploration vs exploitation: multi-armed bandits",
  level: 'beginner',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    "Explain the exploration\u2013exploitation trade-off and why pure greedy choice can lock onto a worse action",
    "Keep a running average with the incremental update Q \u2190 Q + (R \u2212 Q)/n and recognise its \"step toward a target\" shape",
    "Compare \u03b5-greedy, optimistic starting values and UCB, and say when each helps",
    "Read a learning curve and a regret number",
  ],
  prerequisites: ['rl/foundations/returns-discounting', 'ml/math/probability'],
  concepts: ['multi-armed-bandit', 'exploration-exploitation', 'epsilon-greedy', 'ucb', 'regret', 'incremental-mean'],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), chapter 2: multi-armed bandits", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
    { title: "Auer, Cesa-Bianchi and Fischer (2002): Finite-time Analysis of the Multiarmed Bandit Problem (UCB1)", url: 'https://link.springer.com/article/10.1023/A:1013689704352' },
  ],
} satisfies LessonMeta;
