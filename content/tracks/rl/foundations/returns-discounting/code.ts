// Code for "Returns and discounting". returns.py runs under CPython 3.13 and Pyodide; its output was copied from a
// CPython run and is checked by content/tracks/rl/python-outputs.test.ts. The bars use src/lib/rl/returns.ts,
// which computes the same sums (unit-tested in src/lib/rl/rl.test.ts).
import { returnsExperiment, returnsResult, type ReturnState } from '@/lib/rl/experiments';
import type { CodeExample } from '@/lib/types';

export const returns = returnsExperiment('rl-returns');

export const returnsPy: CodeExample = {
  id: 'rl-returns-py',
  language: 'python',
  run: 'pyodide',
  source: `def discounted_return(rewards, gamma):
    """G = r1 + gamma*r2 + gamma**2*r3 + ...  (front to back, one term at a time)"""
    total = 0.0
    for t, r in enumerate(rewards):
        total += gamma ** t * r
    return total

def returns_per_step(rewards, gamma):
    """G_t for every step, back to front: G_t = r_(t+1) + gamma * G_(t+1)"""
    G, out = 0.0, []
    for r in reversed(rewards):
        G = r + gamma * G
        out.append(G)
    return out[::-1]

walk = [-0.04, -0.04, -0.04, -0.04, 0.96]      # the five-move route to the goal
for gamma in (1.0, 0.9, 0.5):
    per_step = [round(g, 3) for g in returns_per_step(walk, gamma)]
    print(f"gamma={gamma}: G={discounted_return(walk, gamma):.4f}  from each step: {per_step}")

now, later = [1], [0] * 9 + [10]                # 1 right away, or 10 after nine empty steps
for gamma in (0.7, 0.8, 0.9):
    a, b = discounted_return(now, gamma), discounted_return(later, gamma)
    print(f"gamma={gamma}: 1 now is worth {a:.3f}, 10 later is worth {b:.3f} -> take {'now' if a > b else 'later'}")`,
  expectedOutput: `gamma=1.0: G=0.8000  from each step: [0.8, 0.84, 0.88, 0.92, 0.96]
gamma=0.9: G=0.4923  from each step: [0.492, 0.591, 0.702, 0.824, 0.96]
gamma=0.5: G=-0.0150  from each step: [-0.015, 0.05, 0.18, 0.44, 0.96]
gamma=0.7: 1 now is worth 1.000, 10 later is worth 0.404 -> take now
gamma=0.8: 1 now is worth 1.000, 10 later is worth 1.342 -> take later
gamma=0.9: 1 now is worth 1.000, 10 later is worth 3.874 -> take later`,
  annotations: [
    {
      id: 'gamma-power',
      range: { line: 5 },
      kind: 'math',
      title: 'γ to the power t',
      what: 'The reward t steps away is multiplied by γ once per step of waiting: γ⁰ = 1 for the first reward, then γ, γ², …',
      why: 'This is the whole meaning of discounting: each step of delay shrinks a reward by the same factor γ.',
    },
    {
      id: 'backwards',
      range: { line: 12 },
      kind: 'math',
      title: 'The recursion',
      what: 'Walking backwards, the return from step t is this step’s reward plus γ times the return from the next step.',
      why: 'It gives the return from every step in one pass, and it is the seed of the Bellman equation in lesson 5.',
    },
    {
      id: 'reverse-again',
      range: { line: 14 },
      kind: 'syntax',
      title: 'Put them back in order',
      what: 'The list was built from the last step to the first, so it is reversed before returning.',
      why: 'Index t of the result should be the return from time step t.',
    },
  ],
};

const fmtList = (xs: number[]) => `[${xs.map((x) => String(+x.toFixed(4))).join(', ')}]`;

export const yourReturn: CodeExample = {
  id: 'rl-your-return',
  language: 'python',
  source: `gamma = {{gamma}}
rewards = {{rewards}}
print(round(discounted_return(rewards, gamma), 3))   # {{total}}`,
  slots: {
    gamma: (s) => (s as ReturnState).gamma.toFixed(2),
    rewards: (s) => {
      const r = returnsResult(s as ReturnState);
      return r.options.length > 1 ? fmtList(r.options[1]!.rewards) + '   # the "10 later" option' : (s as ReturnState).scenario === 'forever' ? '[1] * 60' : fmtList(r.options[0]!.rewards);
    },
    total: (s) => {
      const r = returnsResult(s as ReturnState);
      return `prints ${(r.options[1] ?? r.options[0]!).total.toFixed(3)}`;
    },
  },
  annotations: [
    {
      id: 'linked-gamma',
      range: { line: 1 },
      kind: 'parameter',
      title: 'Linked to the slider',
      what: 'The γ you chose above.',
      why: 'Change the slider and the code and its printed result change with the bars.',
    },
  ],
};
