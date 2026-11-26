import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the rl/mdp chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'mdp',
    term: "Markov decision process (MDP)",
    short: "The standard description of an RL problem: states, actions, transition probabilities P(s′|s,a), rewards and a discount factor γ.",
    introducedIn: 'rl/mdp/markov-decision-processes',
    aliases: ["MDP"],
  },
  {
    id: 'transition-probability',
    term: "Transition probability",
    short: "P(s′|s,a): the chance of landing in state s′ when taking action a in state s. Together they are the environment’s rules, also called its model or dynamics.",
    introducedIn: 'rl/mdp/markov-decision-processes',
    aliases: ["dynamics"],
  },
  {
    id: 'markov-property',
    term: "Markov property",
    short: "The next state and reward depend only on the current state and action, not on how the agent got there. \"The present is enough to predict the future.\"",
    introducedIn: 'rl/mdp/markov-decision-processes',
  },
  {
    id: 'stochastic-policy',
    term: "Stochastic policy",
    short: "A policy that gives each action a probability, π(a|s), instead of naming one action. A deterministic policy is the special case with probability 1 on one action.",
    introducedIn: 'rl/mdp/markov-decision-processes',
  },
  {
    id: 'state-value',
    term: "State value V(s)",
    short: "The expected return when starting in state s and following a given policy from then on. \"How good is it to be here, if I keep playing this way?\"",
    introducedIn: 'rl/mdp/value-functions',
    aliases: ["V(s)", "value function"],
  },
  {
    id: 'action-value',
    term: "Action value Q(s,a)",
    short: "The expected return when taking action a in state s and following the policy afterwards. \"How good is this move from here?\"",
    introducedIn: 'rl/mdp/value-functions',
    aliases: ["Q(s,a)", "Q-value"],
  },
  {
    id: 'bellman-equation',
    term: "Bellman equation",
    short: "The value of a state equals the expected immediate reward plus γ times the value of the next state. It links every value to its neighbours’ values.",
    long: "The expectation form, V(s) = Σ_a π(a|s) Σ_s′ P(s′|s,a)[r + γV(s′)], describes one policy; the optimality form replaces the average over actions with a max.",
    introducedIn: 'rl/mdp/value-functions',
  },
  {
    id: 'policy-evaluation',
    term: "Policy evaluation",
    short: "Computing V(s) for a fixed policy, usually by sweeping the Bellman expectation equation over all states until the values stop changing.",
    introducedIn: 'rl/mdp/value-functions',
  },
  {
    id: 'bootstrapping',
    term: "Bootstrapping (RL)",
    short: "Updating an estimate from other estimates, such as using V(next state) inside the target for V(state). Dynamic programming and TD learning bootstrap; Monte Carlo does not.",
    introducedIn: 'rl/mdp/value-functions',
  },
  {
    id: 'optimal-policy',
    term: "Optimal policy",
    short: "A policy whose expected return is at least as high as every other policy’s, from every state. Written π*.",
    introducedIn: 'rl/mdp/value-iteration',
    aliases: ["π*"],
  },
  {
    id: 'bellman-optimality',
    term: "Bellman optimality equation",
    short: "V*(s) = max over actions of Σ_s′ P(s′|s,a)[r + γV*(s′)]: the best value is the value of the best action, assuming you act optimally afterwards.",
    introducedIn: 'rl/mdp/value-iteration',
  },
  {
    id: 'value-iteration',
    term: "Value iteration",
    short: "Repeatedly applying the Bellman optimality backup to every state until the values settle, then reading off the greedy policy.",
    introducedIn: 'rl/mdp/value-iteration',
  },
  {
    id: 'greedy-policy',
    term: "Greedy policy",
    short: "The policy that, in every state, takes the action with the highest estimated value, with no exploration.",
    introducedIn: 'rl/mdp/value-iteration',
  },
  {
    id: 'policy-iteration',
    term: "Policy iteration",
    short: "Alternate full policy evaluation with greedy policy improvement until the policy stops changing. Usually fewer, but more expensive, rounds than value iteration.",
    introducedIn: 'rl/mdp/value-iteration',
  },
] satisfies GlossaryTerm[];
