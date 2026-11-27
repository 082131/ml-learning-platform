import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rl-first-sweep',
    type: 'numeric',
    prompt: 'Sweep 1 of policy evaluation (all values start at 0), safe policy, cell (0,2), whose action is right. Slip 0.2, γ = 1. What is the new V(0,2)?',
    answer: 0.76,
    tolerance: 0.001,
    hint: 'Right from (0,2): 0.8 into the goal (reward −0.04 + 1), 0.1 up into the edge (stay), 0.1 down to (1,2). Every V is still 0.',
    explain: '0.8 × (0.96 + 0) + 0.1 × (−0.04 + 0) + 0.1 × (−0.04 + 0) = 0.768 − 0.004 − 0.004 = 0.76.',
  },
  {
    id: 'rl-v-vs-q',
    type: 'choice',
    prompt: 'For a policy π, how are V(s) and Q(s,a) related?',
    options: [
      { text: 'V(s) is the policy-weighted average of Q(s,a) over the actions π might take in s', correct: true, explain: 'Q says how good each action is; V says how good the state is when you act as π does, so it averages Q with π’s probabilities. For a deterministic policy V(s) = Q(s, π(s)).' },
      { text: 'V(s) is always the largest Q(s,a) in that state', correct: false, explain: 'Only for the optimal policy (next lesson). For any other policy, V averages over what π actually does, which may not be the best action.' },
      { text: 'Q(s,a) is V(s) plus the immediate reward of a', correct: false, explain: 'Q(s,a) = Σ P(s′|s,a)(r + γV(s′)): it uses the next state’s value, not V(s) of the same state.' },
    ],
  },
  {
    id: 'rl-shortcut-value',
    type: 'choice',
    prompt: 'The shortcut policy reaches the goal in fewer moves than the safe policy, yet V(start) is 0.508 against 0.705. What explains it?',
    options: [
      { text: 'Its route passes next to the pit, so slips send it into the −1 some of the time', correct: true, explain: 'V is an expected return. Walking up beside the pit risks a 0.1 slip into it on each try; averaging in those −1 outcomes costs more than the saved steps gain.' },
      { text: 'Policy evaluation has not converged yet for the shortcut', correct: false, explain: 'Both values are converged (the shortcut settles after 18 sweeps). The difference is real.' },
      { text: 'The shortcut takes more moves because it bumps into the wall', correct: false, explain: 'Its intended route is shorter. Bumps happen only on slips, for both policies.' },
    ],
  },
  {
    id: 'rl-why-sweeps',
    type: 'choice',
    prompt: 'The Bellman equation defines V(s) using V of the next states. Why can we still compute it by starting from all zeros and sweeping?',
    options: [
      { text: 'Each sweep makes the values correct for one more step of the future, and with γ < 1 or episodes that end, the error shrinks every sweep', correct: true, explain: 'After k sweeps, V is the expected return of the first k steps. The remaining error is about the steps further out, which shrink (by γ or by the chance of having already finished), so the sweeps converge.' },
      { text: 'Because the values do not depend on each other once the policy is fixed', correct: false, explain: 'They depend on each other a lot; that is why one cell’s value takes several sweeps to reach the start.' },
      { text: 'Because starting from zero is the exact answer for most states', correct: false, explain: 'Zero is just a starting guess. The sweeps replace it with the real values.' },
    ],
  },
  {
    id: 'rl-random-negative',
    type: 'choice',
    prompt: 'Under the random policy every value is negative, even (0,2), right next to the goal. Why?',
    options: [
      { text: 'A random walker usually wanders for many −0.04 steps and often falls into the pit before reaching the goal', correct: true, explain: 'V is the average over everything the policy does. From (0,2) the random policy reaches the goal often, but it also slips or walks into the pit, and pays −0.04 for every aimless step.' },
      { text: 'The random policy never reaches the goal', correct: false, explain: 'It reaches it in many episodes, just not reliably or quickly.' },
      { text: 'Policy evaluation is not defined for random policies, so the numbers are meaningless', correct: false, explain: 'It is defined for any policy: V(s) = Σ π(a|s) Q(s,a) with π = 0.25 for each action.' },
    ],
  },
];

export const evaluateExercise: Exercise = {
  id: 'rl-policy-evaluation',
  prompt:
    'An MDP is given as `P[state][action]` = list of `(probability, next_state, reward, done)`. A policy is `policy[state]` = `{action: probability}`. Write `evaluate(P, policy, gamma, sweeps)` that starts from V = 0 for every state in P and applies `sweeps` synchronous sweeps of the Bellman expectation equation, returning V as a dict. After a `done` transition, add no future value.',
  starter: `def evaluate(P, policy, gamma, sweeps):
    return {s: 0.0 for s in P}`,
  hints: [
    'Q(s, a) = sum(p * (r + (0 if done else gamma * V[n])) for p, n, r, done in P[s][a]).',
    'Each sweep: V = {s: sum(prob * Q(s, a) for a, prob in policy[s].items()) for s in P}, built from the old V.',
  ],
  solution: `def evaluate(P, policy, gamma, sweeps):
    V = {s: 0.0 for s in P}
    for _ in range(sweeps):
        def q(s, a):
            return sum(p * (r + (0 if done else gamma * V[n])) for p, n, r, done in P[s][a])
        V = {s: sum(prob * q(s, a) for a, prob in policy[s].items()) for s in P}
    return V`,
  explanation:
    'Building the new dict from the old V makes the sweep synchronous. With γ = 0.9 the values converge to V(B) = 0.5/0.595 ≈ 0.840 and V(A) = 0.9 × V(B) ≈ 0.756, which you can check by solving the two Bellman equations by hand.',
  tests: `P = {
    "A": {"go": [(1.0, "B", 0.0, False)]},
    "B": {"go": [(0.5, "END", 1.0, True), (0.5, "A", 0.0, False)]},
}
pi = {"A": {"go": 1.0}, "B": {"go": 1.0}}
V1 = evaluate(P, pi, 0.9, 1)
assert abs(V1["A"]) < 1e-12 and abs(V1["B"] - 0.5) < 1e-12
V2 = evaluate(P, pi, 0.9, 2)
assert abs(V2["A"] - 0.45) < 1e-12 and abs(V2["B"] - 0.5) < 1e-12, "sweeps must use the previous sweep's values"
V = evaluate(P, pi, 0.9, 500)
assert abs(V["B"] - 0.5 / 0.595) < 1e-9 and abs(V["A"] - 0.9 * 0.5 / 0.595) < 1e-9
P2 = {"S": {"a": [(1.0, "END", 1.0, True)], "b": [(1.0, "END", 3.0, True)]}}
assert abs(evaluate(P2, {"S": {"a": 0.5, "b": 0.5}}, 1.0, 1)["S"] - 2.0) < 1e-12`,
};
