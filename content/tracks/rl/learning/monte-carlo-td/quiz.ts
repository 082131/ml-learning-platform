import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rl-td-error-num',
    type: 'numeric',
    prompt: 'V(C) = 0.5 and V(D) = 0.6. The agent steps from C to D with reward 0 (γ = 1, α = 0.1). What is the new V(C) after the TD(0) update?',
    answer: 0.51,
    tolerance: 0.0001,
    hint: 'TD error = r + V(D) − V(C). The update adds α times it.',
    explain: 'TD error = 0 + 0.6 − 0.5 = 0.1. New V(C) = 0.5 + 0.1 × 0.1 = 0.51. C moved toward D’s estimate without waiting for the episode to end.',
  },
  {
    id: 'rl-first-episode',
    type: 'choice',
    prompt: 'After the first episode (ending on the right), Monte Carlo raised the value of every visited state, but TD(0) raised only E’s. Why?',
    options: [
      { text: 'TD targets use the next state’s estimate, and all estimates were still 0.5, so only the step that actually earned the 1 had a non-zero TD error', correct: true, explain: 'For every step before the last, r + V(next) − V(s) = 0 + 0.5 − 0.5 = 0. Only E’s step got r = 1. The good news reaches earlier states over later episodes, one step at a time.' },
      { text: 'TD only updates states once per episode, and only the last one', correct: false, explain: 'TD(0) updates after every step. The updates were just zero because the TD errors were zero.' },
      { text: 'TD needs a smaller α than Monte Carlo', correct: false, explain: 'Both used α = 0.1. The difference is in the target, not the step size.' },
    ],
  },
  {
    id: 'rl-mc-vs-td-noise',
    type: 'choice',
    prompt: 'Why does a Monte Carlo update usually jump around more than a TD(0) update?',
    options: [
      { text: 'Its target is a whole episode’s return, which depends on every random step until the end; TD’s target depends on only one random step', correct: true, explain: 'More randomness in the target means more variance in the update. TD swaps that noise for a bit of bias: its target leans on an estimate that may still be wrong.' },
      { text: 'Monte Carlo uses a larger step size', correct: false, explain: 'The same α is used for both in the explorer.' },
      { text: 'Monte Carlo targets are biased, so they overshoot', correct: false, explain: 'It is the other way round: MC targets are unbiased samples of the return. TD targets are biased while V is inaccurate.' },
    ],
  },
  {
    id: 'rl-when-mc',
    type: 'choice',
    prompt: 'Which situation is a real argument for Monte Carlo over TD?',
    options: [
      { text: 'The state is not fully Markov, so estimates of the next state are unreliable to build on', correct: true, explain: 'TD bootstraps from V(next state); if that state does not capture everything relevant, the bias can be large. MC only uses actual returns, so it does not depend on the Markov property in the same way.' },
      { text: 'Episodes never end', correct: false, explain: 'That is an argument against Monte Carlo: it can only update after an episode finishes. TD works on continuing tasks.' },
      { text: 'You want to learn during the episode, not after it', correct: false, explain: 'That is TD’s advantage, not MC’s.' },
    ],
  },
  {
    id: 'rl-alpha-noise',
    type: 'choice',
    prompt: 'In the explorer, α = 0.5 makes the TD error drop fast and then stay well above zero. Why does it not keep falling?',
    options: [
      { text: 'Each update moves half-way to a single noisy target, so the estimates keep jumping around the true values', correct: true, explain: 'A big step size means the latest few episodes dominate the estimate. To settle precisely, the step size must be small (or shrink over time, like 1/N in the bandit lesson).' },
      { text: 'The true values change when α is large', correct: false, explain: 'The true values are fixed at 1/6 to 5/6. Only the estimates fluctuate.' },
      { text: 'TD diverges for α above 0.3', correct: false, explain: 'It does not diverge here; it hovers with a larger error.' },
    ],
  },
];

export const tdExercise: Exercise = {
  id: 'rl-td0',
  prompt:
    'Write `td0_update(V, s, r, s_next, alpha, gamma, done)`: it updates V[s] in place with the TD(0) rule and returns the TD error. When `done` is True the next state contributes nothing. Then write `mc_update(V, states, rewards, alpha, gamma)` that, after an episode, moves each V[states[t]] toward the discounted return G_t that followed it (every visit counts; walk the episode backwards).',
  starter: `def td0_update(V, s, r, s_next, alpha, gamma, done):
    return 0.0

def mc_update(V, states, rewards, alpha, gamma):
    pass`,
  hints: [
    'td_error = r + (0 if done else gamma * V[s_next]) − V[s]; then V[s] += alpha * td_error.',
    'mc_update: G = 0; for t from the last step back to 0: G = rewards[t] + gamma * G; V[states[t]] += alpha * (G − V[states[t]]).',
  ],
  solution: `def td0_update(V, s, r, s_next, alpha, gamma, done):
    target = r + (0 if done else gamma * V[s_next])
    td_error = target - V[s]
    V[s] += alpha * td_error
    return td_error

def mc_update(V, states, rewards, alpha, gamma):
    G = 0.0
    for t in reversed(range(len(states))):
        G = rewards[t] + gamma * G
        V[states[t]] += alpha * (G - V[states[t]])`,
  explanation:
    'Both are "estimate += α × (target − estimate)". TD’s target is one reward plus an estimate, available right away; Monte Carlo’s is the full return, available only at the end.',
  tests: `V = {"C": 0.5, "D": 0.6}
err = td0_update(V, "C", 0.0, "D", 0.1, 1.0, False)
assert abs(err - 0.1) < 1e-12 and abs(V["C"] - 0.51) < 1e-12
V = {"E": 0.5}
assert abs(td0_update(V, "E", 1.0, None, 0.1, 1.0, True) - 0.5) < 1e-12 and abs(V["E"] - 0.55) < 1e-12
V = {"C": 0.5, "D": 0.5, "E": 0.5}
mc_update(V, ["C", "D", "E"], [0, 0, 1], 0.1, 1.0)
assert all(abs(V[k] - 0.55) < 1e-12 for k in V), V
V = {"A": 0.0, "B": 0.0}
mc_update(V, ["A", "B"], [1, 2], 1.0, 0.5)
assert abs(V["A"] - 2.0) < 1e-12 and abs(V["B"] - 2.0) < 1e-12`,
};
