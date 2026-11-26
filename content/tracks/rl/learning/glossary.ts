import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the rl/learning chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'model-free',
    term: "Model-free RL",
    short: "Learning values or policies directly from experience, without knowing (or learning) the transition probabilities. Q-learning and SARSA are model-free.",
    introducedIn: 'rl/learning/monte-carlo-td',
  },
  {
    id: 'monte-carlo-method',
    term: "Monte Carlo method (RL)",
    short: "Estimating values by averaging the actual returns observed after visiting a state, once each episode has finished.",
    introducedIn: 'rl/learning/monte-carlo-td',
    aliases: ["Monte Carlo"],
  },
  {
    id: 'td-learning',
    term: "Temporal-difference (TD) learning",
    short: "Updating a value estimate after every step toward reward + γ × (estimate of the next state), without waiting for the episode to end. TD(0) is the one-step version.",
    introducedIn: 'rl/learning/monte-carlo-td',
    aliases: ["TD(0)"],
  },
  {
    id: 'td-error',
    term: "TD error",
    short: "δ = r + γV(s′) − V(s): how much better or worse a step turned out than the current estimate expected. The signal every TD method learns from.",
    introducedIn: 'rl/learning/monte-carlo-td',
    aliases: ["δ"],
  },
  {
    id: 'step-size',
    term: "Step size α (RL)",
    short: "The fraction of the gap between target and estimate that one update closes. α = 1 jumps to the latest target; small α averages over many.",
    introducedIn: 'rl/learning/monte-carlo-td',
  },
  {
    id: 'q-learning',
    term: "Q-learning",
    short: "An off-policy TD method: Q(s,a) ← Q(s,a) + α[r + γ max_a′ Q(s′,a′) − Q(s,a)]. Learns the optimal action values while exploring.",
    introducedIn: 'rl/learning/q-learning',
  },
  {
    id: 'q-table',
    term: "Q-table",
    short: "A table with one row per state and one column per action, holding the current estimate of Q(s,a). Works only while states and actions are few.",
    introducedIn: 'rl/learning/q-learning',
  },
  {
    id: 'learning-rate-rl',
    term: "Learning rate α (Q-learning)",
    short: "How far each Q-learning update moves Q(s,a) toward its target. The same idea as the step size in TD learning.",
    introducedIn: 'rl/learning/q-learning',
  },
  {
    id: 'sarsa',
    term: "SARSA",
    short: "An on-policy TD method named after the quintuple (S, A, R, S′, A′): Q(s,a) ← Q(s,a) + α[r + γQ(s′,a′) − Q(s,a)], where a′ is the action actually taken next.",
    introducedIn: 'rl/learning/sarsa-vs-q-learning',
  },
  {
    id: 'on-policy',
    term: "On-policy learning",
    short: "Learning the value of the same policy that is choosing the actions, exploration included. SARSA is on-policy.",
    introducedIn: 'rl/learning/sarsa-vs-q-learning',
  },
  {
    id: 'off-policy',
    term: "Off-policy learning",
    short: "Learning the value of one policy (usually the greedy, optimal one) from actions chosen by another (the exploring behaviour policy). Q-learning and DQN are off-policy.",
    introducedIn: 'rl/learning/sarsa-vs-q-learning',
  },
  {
    id: 'behaviour-policy',
    term: "Behaviour policy",
    short: "The policy that actually chooses actions while collecting experience, for example ε-greedy. Contrast with the target policy whose values are being learned.",
    introducedIn: 'rl/learning/sarsa-vs-q-learning',
    aliases: ["target policy"],
  },
] satisfies GlossaryTerm[];
