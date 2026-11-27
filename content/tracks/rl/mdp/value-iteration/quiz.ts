import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rl-opt-vs-eval',
    type: 'choice',
    prompt: 'What is the one change that turns policy evaluation into value iteration?',
    options: [
      { text: 'The average over actions, weighted by π, becomes a max over actions', correct: true, explain: 'The inner average over landing cells stays. Only the choice of action changes from "what π would do" to "the best action".' },
      { text: 'The average over next states becomes a max over next states', correct: false, explain: 'The agent cannot choose where it lands, so landing cells are still averaged with P. Maximising them is a classic bug.' },
      { text: 'γ is set to 1 so that the agent looks infinitely far ahead', correct: false, explain: 'Both methods work with any γ. The difference is max versus π-average over actions.' },
    ],
  },
  {
    id: 'rl-arrows-first',
    type: 'choice',
    prompt: 'In the explorer the arrows stop changing after a few sweeps, but the values keep changing until sweep 22. Why can the policy be right before the values are?',
    options: [
      { text: 'The greedy policy only needs the ranking of actions to be correct, not the exact numbers', correct: true, explain: 'If one action is clearly better, it stays on top even while all values are still rising. The numbers converge more slowly than their ordering.' },
      { text: 'The arrows are computed with more precision than the values', correct: false, explain: 'They are computed from the same values. They just depend on comparisons, not magnitudes.' },
      { text: 'Value iteration fixes the policy first and then computes its values', correct: false, explain: 'That describes policy iteration. Value iteration never stores a policy until the end.' },
    ],
  },
  {
    id: 'rl-step-minus-two',
    type: 'choice',
    prompt: 'With a step reward of −2, the optimal action at (1,2) is to walk into the pit. Why is this the right answer for that reward, not a bug?',
    options: [
      { text: 'Every move costs 2, so ending now at −1 − 2 = −3 beats the expected cost of the several moves needed to reach the goal', correct: true, explain: 'From (1,2) the goal is at least 2 moves away, so at least −4 + 1 = −3 even without slips, and slips make it worse. The pit ends the bleeding immediately.' },
      { text: 'The pit becomes a goal when the step reward is negative', correct: false, explain: 'The pit is still −1. It is chosen because moves became even more expensive.' },
      { text: 'Value iteration diverges for large negative rewards and picks a random action', correct: false, explain: 'It converges (after 18 sweeps); the policy is exactly optimal for that reward.' },
    ],
  },
  {
    id: 'rl-zero-step',
    type: 'choice',
    prompt: 'With a step reward of 0, why does the optimal policy at (1,2) point left, into the wall?',
    options: [
      { text: 'Bumping costs nothing and slips from "left" go up or down, never into the pit, so the agent can wait safely until a slip moves it up', correct: true, explain: 'With free moves the only thing that matters is not falling in. Left never reaches the pit; eventually a slip up to (0,2) lets it reach the goal.' },
      { text: 'Left is the first action that ties, and ties do not matter', correct: false, explain: 'It is strictly better than up here: up has a 10% pit risk every time.' },
      { text: 'The agent is trying to get back to the start', correct: false, explain: 'The start has no reward. The agent is avoiding risk while waiting for a safe way up.' },
    ],
  },
  {
    id: 'rl-pi-vs-vi',
    type: 'choice',
    prompt: 'How does policy iteration differ from value iteration?',
    options: [
      { text: 'It alternates a full evaluation of the current policy with a greedy improvement, usually needing few but expensive rounds', correct: true, explain: 'Value iteration folds improvement into every sweep (the max). Policy iteration evaluates to convergence before each improvement. Both find an optimal policy.' },
      { text: 'It learns from samples instead of the transition probabilities', correct: false, explain: 'Both are planning methods and need P. Learning from samples is the next chapter.' },
      { text: 'It finds a better policy than value iteration', correct: false, explain: 'Both converge to optimal policies; they differ in the route there and the cost per step.' },
    ],
  },
];

export const viExercise: Exercise = {
  id: 'rl-value-iteration',
  prompt:
    'An MDP is `P[state][action]` = list of `(probability, next_state, reward, done)`. Write `value_iteration(P, gamma, theta=1e-9)` that sweeps the Bellman optimality backup synchronously from V = 0 until the largest change is below theta, then returns `(V, policy)`, where `policy[state]` is the action with the highest one-step lookahead value (ties: the first action in P[state]).',
  starter: `def value_iteration(P, gamma, theta=1e-9):
    V = {s: 0.0 for s in P}
    return V, {s: next(iter(P[s])) for s in P}`,
  hints: [
    'q(V, s, a) = sum(p * (r + (0 if done else gamma * V[n])) for p, n, r, done in P[s][a]).',
    'Loop: new = {s: max(q(V, s, a) for a in P[s]) for s in P}; stop when max |new − V| < theta. Then policy[s] = max(P[s], key=lambda a: q(V, s, a)).',
  ],
  solution: `def value_iteration(P, gamma, theta=1e-9):
    def q(V, s, a):
        return sum(p * (r + (0 if done else gamma * V[n])) for p, n, r, done in P[s][a])
    V = {s: 0.0 for s in P}
    while True:
        new = {s: max(q(V, s, a) for a in P[s]) for s in P}
        delta = max(abs(new[s] - V[s]) for s in P)
        V = new
        if delta < theta:
            break
    policy = {s: max(P[s], key=lambda a: q(V, s, a)) for s in P}
    return V, policy`,
  explanation:
    'In the test MDP, "safe" pays 1 for sure and "gamble" pays 3 with probability 0.5 (so 1.5 on average) but otherwise drops you back for another try. Value iteration discovers that the gamble is worth (with γ = 0.9) 1.5 + 0.5 × 0.9 × V(S), which settles at about 2.727, and prefers it.',
  tests: `P = {
    "S": {
        "safe": [(1.0, "END", 1.0, True)],
        "gamble": [(0.5, "END", 3.0, True), (0.5, "S", 0.0, False)],
    }
}
V, pi = value_iteration(P, 0.9)
assert abs(V["S"] - 1.5 / (1 - 0.45)) < 1e-6, V
assert pi["S"] == "gamble"
V0, pi0 = value_iteration(P, 0.0)
assert abs(V0["S"] - 1.5) < 1e-9 and pi0["S"] == "gamble"
P2 = {"A": {"left": [(1.0, "END", 1.0, True)], "right": [(1.0, "B", 0.0, False)]},
      "B": {"go": [(1.0, "END", 10.0, True)]}}
V2, pi2 = value_iteration(P2, 0.5)
assert pi2["A"] == "right" and abs(V2["A"] - 5.0) < 1e-9
V3, pi3 = value_iteration(P2, 0.05)
assert pi3["A"] == "left", "with a short horizon the 10 two steps away is worth only 0.5"`,
};
