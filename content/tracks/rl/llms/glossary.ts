import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the rl/llms chapter (merged into the glossary by content/index.ts).
// The RLHF terms here are shared with the fine-tuning track, which references them instead of redefining them.
export default [
  {
    id: 'ppo',
    term: "Proximal Policy Optimization (PPO)",
    short: "A policy-gradient method that clips the probability ratio π_new/π_old to [1−ε, 1+ε] in its objective, so each update changes the policy only a little. The classic RLHF optimiser.",
    introducedIn: 'rl/deep/deep-rl',
    aliases: ["PPO"],
  },
  {
    id: 'rlhf',
    term: "Reinforcement learning from human feedback (RLHF)",
    short: "Fine-tuning a language model with RL, where the reward comes from a reward model trained on human preference comparisons, usually with a KL penalty to a reference model.",
    introducedIn: 'rl/llms/rl-for-llms',
    aliases: ["RLHF"],
  },
  {
    id: 'reward-model',
    term: "Reward model",
    short: "A model (often a copy of the language model with a scalar head) trained to score responses so that preferred responses get higher scores. It stands in for human judgement during RL.",
    introducedIn: 'rl/llms/rl-for-llms',
  },
  {
    id: 'bradley-terry-model',
    term: "Bradley–Terry model",
    short: "A model of pairwise preferences: P(A preferred over B) = σ(r_A − r_B), where σ is the logistic function. Reward models are trained by maximising this probability on human comparisons.",
    introducedIn: 'rl/llms/rl-for-llms',
  },
  {
    id: 'kl-penalty',
    term: "KL penalty",
    short: "A term −β·KL(π ‖ π_ref) added to the RLHF objective that charges the policy for drifting away from the reference model, limiting reward hacking and keeping language fluent.",
    introducedIn: 'rl/llms/rl-for-llms',
  },
  {
    id: 'reward-hacking',
    term: "Reward hacking",
    short: "When an agent finds a way to score highly on the reward without doing what the reward was meant to measure, such as an LLM writing long, flattering answers that a reward model overrates.",
    introducedIn: 'rl/llms/rl-for-llms',
    aliases: ["specification gaming"],
  },
  {
    id: 'dpo',
    term: "Direct Preference Optimization (DPO)",
    short: "A way to train on preference pairs without a separate reward model or RL loop: a classification-style loss that reaches the same optimum as KL-regularised RLHF (Rafailov et al., 2023).",
    introducedIn: 'rl/llms/rl-for-llms',
    aliases: ["DPO"],
  },
  {
    id: 'grpo',
    term: "Group Relative Policy Optimization (GRPO)",
    short: "A PPO variant without a critic: sample a group of answers to the same prompt and use each answer’s reward relative to the group’s mean (divided by the group’s standard deviation) as its advantage.",
    introducedIn: 'rl/llms/rl-for-llms',
    aliases: ["GRPO"],
  },
  {
    id: 'rlvr',
    term: "RL with verifiable rewards (RLVR)",
    short: "RL where the reward is computed by a checker instead of a learned model, such as unit tests passing or a maths answer matching. Harder to hack than a reward model.",
    introducedIn: 'rl/llms/rl-for-llms',
    aliases: ["RLVR"],
  },
] satisfies GlossaryTerm[];
