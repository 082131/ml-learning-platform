// Code for "Value functions and the Bellman equation". evaluate.py runs under CPython 3.13 and Pyodide; its output
// was copied from a CPython run and is checked by content/tracks/rl/python-outputs.test.ts. The visual uses
// src/lib/rl/mdp.ts (synchronous sweeps, like this code); src/lib/rl/rl.test.ts pins the same values
// (0.705 from the start for the safe policy, 0.508 for the shortcut).
import { evaluationExperiment, type EvalState } from '@/lib/rl/experiments';
import type { CodeExample } from '@/lib/types';
import { GRID_PY } from '../../grid-py';

export const evaluation = evaluationExperiment('rl-evaluate');


export const evaluatePy: CodeExample = {
  id: 'rl-evaluate-py',
  language: 'python',
  run: 'pyodide',
  source: `${GRID_PY}
def q_value(V, s, a, gamma):
    """Expected reward now plus discounted value of where we land (0 after a terminal state)."""
    return sum(p * (r + (0 if done else gamma * V[n])) for p, n, r, done in outcomes(s, a))

def evaluate(policy, gamma=1.0, theta=1e-4):
    """Policy evaluation: sweep the Bellman expectation equation until no value moves by theta."""
    V = {s: 0.0 for s in STATES}
    sweeps = 0
    while True:
        new = {s: sum(prob * q_value(V, s, a, gamma) for a, prob in policy(s).items()) for s in STATES}
        sweeps += 1
        delta = max(abs(new[s] - V[s]) for s in STATES)
        V = new
        if delta < theta:
            return V, sweeps

SAFE = {(0, 0): "right", (0, 1): "right", (0, 2): "right", (1, 0): "up", (1, 2): "up",
        (2, 0): "up", (2, 1): "left", (2, 2): "left", (2, 3): "left"}
safe = lambda s: {SAFE[s]: 1.0}
random_policy = lambda s: {a: 0.25 for a in MOVES}

for name, policy in [("safe", safe), ("random", random_policy)]:
    V, sweeps = evaluate(policy)
    print(f"{name} policy, {sweeps} sweeps:")
    for r in range(ROWS):
        print("  " + "  ".join("  wall" if (r, c) in WALLS else "  goal" if (r, c) == GOAL else
                              "   pit" if (r, c) == PIT else f"{V[(r, c)]:6.3f}" for c in range(COLS)))`,
  expectedOutput: `safe policy, 22 sweeps:
   0.812   0.868   0.918    goal
   0.762    wall   0.660     pit
   0.705   0.655   0.611   0.388
random policy, 169 sweeps:
  -1.269  -0.872  -0.315    goal
  -1.507    wall  -0.912     pit
  -1.585  -1.503  -1.262  -1.211`,
  annotations: [
    {
      id: 'q-value',
      range: { line: 21 },
      kind: 'math',
      title: 'One action’s value',
      what: 'For each possible landing cell: its probability × (reward + γ × value of that cell). Terminal cells add nothing after their reward.',
      why: 'This is the inner sum of the Bellman equation: what this action is worth, given the current value estimates.',
    },
    {
      id: 'bellman-sweep',
      range: { line: 28 },
      kind: 'math',
      title: 'One sweep of the Bellman equation',
      what: 'Every state’s new value is the policy-weighted average of its action values, all computed from the previous sweep’s V.',
      why: 'Computing every new value from the old table (a synchronous sweep) is the simplest version and matches the visual exactly.',
    },
    {
      id: 'stop-when-stable',
      range: { line: 32 },
      kind: 'syntax',
      title: 'Stop when nothing moves',
      what: 'delta is the largest change any state made in this sweep; stop when it falls below theta.',
      why: 'Each sweep shrinks the error, so the values settle. 0.0001 is far below the precision we print.',
    },
    {
      id: 'safe-policy',
      range: { line: 35 },
      kind: 'variable',
      title: 'A policy as a lookup table',
      what: 'One action per state: up the left column, along the top row, and away from the pit on the bottom row.',
      why: 'policy(s) returns {action: probability}, so the same evaluate() works for deterministic and random policies.',
    },
  ],
};

export const yourPolicy: CodeExample = {
  id: 'rl-your-evaluation',
  language: 'python',
  source: `# The explorer's settings (uses evaluate() above; slip is set inside outcomes())
policy = {{policy}}
V, sweeps = evaluate(policy, gamma={{gamma}})
# the explorer shows sweep {{sweeps}} of this computation, with slip = {{slip}}`,
  slots: {
    policy: (s) => ({ safe: 'safe', shortcut: 'shortcut   # along the bottom, then up beside the pit', random: 'random_policy' })[(s as EvalState).policy],
    gamma: (s) => (s as EvalState).gamma.toFixed(2),
    sweeps: (s) => String((s as EvalState).sweeps),
    slip: (s) => (s as EvalState).slip.toFixed(2),
  },
  annotations: [
    {
      id: 'linked',
      range: { line: 3 },
      kind: 'function',
      title: 'Linked to the explorer',
      what: 'The policy and γ chosen above.',
      why: 'The visual stops after the number of sweeps on the slider so you can watch the values form; evaluate() runs until they stop changing.',
    },
  ],
};
