// Code for "Finding the best policy: value iteration". value_iteration.py runs under CPython 3.13 and Pyodide; its
// output was copied from a CPython run and is checked by content/tracks/rl/python-outputs.test.ts. The visual uses
// src/lib/rl/mdp.ts; src/lib/rl/rl.test.ts checks the same values against Russell and Norvig's published numbers.
import { viExperiment, type ViState } from '@/lib/rl/experiments';
import type { CodeExample } from '@/lib/types';
import { GRID_PY } from '../../grid-py';

export const vi = viExperiment('rl-vi');

export const valueIterationPy: CodeExample = {
  id: 'rl-value-iteration-py',
  language: 'python',
  run: 'pyodide',
  source: `${GRID_PY}
ARROW = {"up": "^", "right": ">", "down": "v", "left": "<"}

def q_value(V, s, a, gamma, step):
    return sum(p * (r + (0 if done else gamma * V[n])) for p, n, r, done in outcomes(s, a, step=step))

def value_iteration(gamma=1.0, step=-0.04, theta=1e-4):
    """Sweep the Bellman optimality equation: each state takes the value of its best action."""
    V = {s: 0.0 for s in STATES}
    sweeps = 0
    while True:
        new = {s: max(q_value(V, s, a, gamma, step) for a in MOVES) for s in STATES}
        sweeps += 1
        delta = max(abs(new[s] - V[s]) for s in STATES)
        V = new
        if delta < theta:
            break
    policy = {s: max(MOVES, key=lambda a: q_value(V, s, a, gamma, step)) for s in STATES}
    return V, policy, sweeps

for step in (-0.04, -2.0):
    V, policy, sweeps = value_iteration(step=step)
    print(f"step reward {step}: converged after {sweeps} sweeps, V(start) = {V[(2, 0)]:.3f}")
    for r in range(ROWS):
        print("  " + " ".join("#" if (r, c) in WALLS else "G" if (r, c) == GOAL else "P" if (r, c) == PIT
                              else ARROW[policy[(r, c)]] for c in range(COLS)))`,
  expectedOutput: `step reward -0.04: converged after 22 sweeps, V(start) = 0.705
  > > > G
  ^ # ^ P
  ^ < < <
step reward -2.0: converged after 18 sweeps, V(start) = -10.815
  > > > G
  ^ # > P
  > > > ^`,
  annotations: [
    {
      id: 'max-backup',
      range: { line: 29 },
      kind: 'math',
      title: 'The only change from policy evaluation',
      what: 'Instead of averaging the action values with the policy’s probabilities, take the largest one.',
      why: 'This is the Bellman optimality backup: assume you will act as well as possible from here on.',
    },
    {
      id: 'extract-policy',
      range: { line: 35 },
      kind: 'function',
      title: 'Reading off the policy',
      what: 'In every state, pick the action with the highest one-step lookahead value under the final V.',
      why: 'Value iteration produces values, not arrows. The greedy policy with respect to the optimal values is an optimal policy.',
    },
  ],
};

export const yourSettings: CodeExample = {
  id: 'rl-your-vi',
  language: 'python',
  source: `# The explorer's settings (uses value_iteration() above; slip is set inside outcomes())
V, policy, sweeps = value_iteration(gamma={{gamma}}, step={{step}})
# slip = {{slip}}; the explorer shows sweep {{sweeps}} of this computation`,
  slots: {
    gamma: (s) => (s as ViState).gamma.toFixed(2),
    step: (s) => String((s as ViState).stepReward),
    slip: (s) => (s as ViState).slip.toFixed(2),
    sweeps: (s) => String((s as ViState).sweeps),
  },
  annotations: [
    {
      id: 'linked',
      range: { line: 2 },
      kind: 'function',
      title: 'Linked to the explorer',
      what: 'The step reward and γ chosen above.',
      why: 'Change them and the arrows in the visual change exactly as this call’s policy would.',
    },
  ],
};
