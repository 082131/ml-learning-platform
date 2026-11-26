import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/deep/deep-rl',
  title: "Deep RL: DQN, actor-critic and PPO",
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Explain why tables stop working and what replacing them with a neural network changes",
    "Describe the two stabilisers of DQN: experience replay and a target network",
    "Explain the actor-critic idea and the advantage it uses",
    "Read PPO's clipped objective and explain why clipping keeps updates small",
  ],
  prerequisites: ['rl/deep/policy-gradients', 'ml/deep/training-loop'],
  concepts: ['function-approximation', 'dqn', 'experience-replay', 'target-network', 'actor-critic', 'advantage', 'ppo'],
  references: [
    { title: "Mnih et al. (2015): Human-level control through deep reinforcement learning (DQN), Nature 518", url: 'https://www.nature.com/articles/nature14236' },
    { title: "Schulman et al. (2017): Proximal Policy Optimization Algorithms", url: 'https://arxiv.org/abs/1707.06347' },
    { title: "Stable-Baselines3 documentation: PPO", url: 'https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html', version: '2.9.2' },
  ],
} satisfies LessonMeta;
