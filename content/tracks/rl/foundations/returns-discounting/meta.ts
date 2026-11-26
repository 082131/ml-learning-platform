import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/foundations/returns-discounting',
  title: "Returns and discounting: turning a future of rewards into one number",
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    "Compute the return of an episode, with and without discounting",
    "Explain what the discount factor \u03b3 means and why it is needed (uncertainty, endless episodes, preferring sooner rewards)",
    "Use the backward recursion G_t = r_{t+1} + \u03b3\u00b7G_{t+1} to compute the return from every time step",
    "Predict how \u03b3 changes which of two reward streams an agent prefers",
  ],
  prerequisites: ['rl/foundations/agents-rewards'],
  concepts: ['rl-return', 'discount-factor', 'credit-assignment'],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), section 3.3: returns and episodes", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
} satisfies LessonMeta;
