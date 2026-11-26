import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the rl/deep chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'policy-gradient',
    term: "Policy gradient",
    short: "A family of methods that adjust the policy’s parameters directly in the direction that increases expected return, estimated from sampled episodes.",
    introducedIn: 'rl/deep/policy-gradients',
  },
  {
    id: 'reinforce',
    term: "REINFORCE",
    short: "The basic Monte Carlo policy-gradient algorithm (Williams, 1992): after an episode, push up log π(a|s) for each action in proportion to the return that followed it.",
    introducedIn: 'rl/deep/policy-gradients',
  },
  {
    id: 'softmax-policy',
    term: "Softmax policy",
    short: "A policy that turns one preference number per action into probabilities with exp(preference) / Σ exp(preferences). Higher preference, higher probability, never exactly 0.",
    introducedIn: 'rl/deep/policy-gradients',
  },
  {
    id: 'baseline-rl',
    term: "Baseline (policy gradients)",
    short: "A number subtracted from the return before it scales the update, usually an estimate of the average return. It lowers the variance of the update without changing its expected direction.",
    introducedIn: 'rl/deep/policy-gradients',
  },
  {
    id: 'variance-rl',
    term: "Variance of a gradient estimate",
    short: "How much the update computed from one episode jumps around from episode to episode. High variance means noisy, slow learning even when the average direction is right.",
    introducedIn: 'rl/deep/policy-gradients',
  },
  {
    id: 'function-approximation',
    term: "Function approximation (RL)",
    short: "Representing V, Q or the policy with a parameterised function such as a neural network instead of a table, so that similar states share what was learned.",
    introducedIn: 'rl/deep/deep-rl',
  },
  {
    id: 'dqn',
    term: "Deep Q-network (DQN)",
    short: "Q-learning with a neural network for Q(s,a), stabilised by experience replay and a target network. Learned 49 Atari games from pixels (Mnih et al., 2015).",
    introducedIn: 'rl/deep/deep-rl',
    aliases: ["DQN"],
  },
  {
    id: 'experience-replay',
    term: "Experience replay",
    short: "Storing past transitions in a buffer and training on random mini-batches from it, which breaks the correlation between consecutive steps and reuses data.",
    introducedIn: 'rl/deep/deep-rl',
    aliases: ["replay buffer"],
  },
  {
    id: 'target-network',
    term: "Target network",
    short: "A slowly updated copy of the Q-network used to compute TD targets, so the target does not move every time the network learns.",
    introducedIn: 'rl/deep/deep-rl',
  },
  {
    id: 'actor-critic',
    term: "Actor-critic",
    short: "A method with two learned parts: the actor (the policy) chooses actions, the critic (a value function) judges them, and the critic’s judgement replaces the noisy return in the policy update.",
    introducedIn: 'rl/deep/deep-rl',
  },
  {
    id: 'advantage',
    term: "Advantage A(s,a)",
    short: "Q(s,a) − V(s): how much better this action was than the policy’s average in that state. Positive advantage means \"do this more often\".",
    introducedIn: 'rl/deep/deep-rl',
  },
] satisfies GlossaryTerm[];
