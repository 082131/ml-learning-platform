import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/foundations/agents-rewards',
  title: 'Agents, environments and rewards',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Describe the reinforcement learning loop: state, action, reward, next state, repeated until the episode ends',
    'Explain why a reward is different from a supervised-learning label, and why that makes RL harder',
    'Predict how changing a reward (for example a small cost per move) changes what a good agent does',
    'Write the step function of a small grid world and run an episode with it in Python',
  ],
  prerequisites: ['ml/foundations/types-of-ml'],
  concepts: ['reinforcement-learning', 'rl-agent', 'rl-environment', 'rl-state', 'rl-action', 'rl-reward', 'rl-episode', 'terminal-state', 'rl-policy', 'trajectory'],
  references: [
    { title: 'Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), chapters 1 and 3.1', url: 'http://incompleteideas.net/book/the-book-2nd.html' },
    { title: 'Artificial Intelligence: A Modern Approach, 4th edition (Russell and Norvig), section 17.1: the 4×3 grid world', url: 'https://aima.cs.berkeley.edu/' },
    { title: 'Gymnasium documentation: the Env API (reset and step)', url: 'https://gymnasium.farama.org/api/env/', version: '1.4.0' },
  ],
} satisfies LessonMeta;
