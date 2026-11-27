// Code for "Learning from experience: Monte Carlo and TD". random_walk.py runs under CPython 3.13 and Pyodide with a
// fixed seed; its output was copied from a CPython run and is checked by content/tracks/rl/python-outputs.test.ts.
// The chart uses src/lib/rl/randomWalk.ts (the same updates, unit-tested on a hand-worked episode) with the
// browser's own seeded generator, so individual episodes differ from Python's while the averages agree closely.
import { walkExperiment, type WalkState } from '@/lib/rl/experiments';
import type { CodeExample } from '@/lib/types';

export const walk = walkExperiment('rl-walk');

export const walkPy: CodeExample = {
  id: 'rl-random-walk-py',
  language: 'python',
  run: 'pyodide',
  source: `import math
import random

TRUE = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]        # true values of states A..E

def episode(rng):
    """Start in C (index 2); step left or right; off the left end pays 0, off the right end pays 1."""
    states, rewards, s = [2], [], 2
    while True:
        s += rng.choice((-1, 1))
        if s < 0 or s > 4:
            rewards.append(1 if s > 4 else 0)
            return states, rewards
        rewards.append(0)
        states.append(s)

def mc_update(V, states, rewards, alpha):
    G = 0
    for s, r in zip(reversed(states), reversed(rewards)):
        G += r                                   # gamma = 1: the return is what is left to collect
        V[s] += alpha * (G - V[s])               # move toward the actual return

def td_update(V, states, rewards, alpha):
    for t, s in enumerate(states):
        nxt = V[states[t + 1]] if t + 1 < len(states) else 0.0
        V[s] += alpha * (rewards[t] + nxt - V[s])  # move toward reward + estimate of the next state

def rms(V):
    return math.sqrt(sum((v - t) ** 2 for v, t in zip(V, TRUE)) / 5)

rng = random.Random(1)
states, rewards = episode(rng)
print("one episode:", "".join("ABCDE"[s] for s in states), "-> reward", rewards[-1])
mc, td = [0.5] * 5, [0.5] * 5
mc_update(mc, states, rewards, 0.1)
td_update(td, states, rewards, 0.1)
print("after it, MC:", [round(v, 3) for v in mc])
print("after it, TD:", [round(v, 3) for v in td])

err_mc = err_td = 0.0
for run in range(100):
    rng = random.Random(run)
    mc, td = [0.5] * 5, [0.5] * 5
    for _ in range(100):
        states, rewards = episode(rng)           # both methods learn from the same episodes
        mc_update(mc, states, rewards, 0.1)
        td_update(td, states, rewards, 0.1)
    err_mc += rms(mc) / 100
    err_td += rms(td) / 100
print(f"RMS error after 100 episodes, averaged over 100 runs: MC {err_mc:.3f}, TD {err_td:.3f}")`,
  expectedOutput: `one episode: CBABABCDEDCDCDEDE -> reward 1
after it, MC: [0.595, 0.636, 0.672, 0.705, 0.636]
after it, TD: [0.5, 0.5, 0.5, 0.5, 0.55]
RMS error after 100 episodes, averaged over 100 runs: MC 0.158, TD 0.054`,
  annotations: [
    {
      id: 'mc-target',
      range: { line: 21 },
      kind: 'math',
      title: 'Monte Carlo target: the real return',
      what: 'After the episode ends, walk back through it and move each visited state a fraction α toward the return that actually followed it.',
      why: 'The target is real experience, so it is unbiased, but one episode’s return depends on every random step after it, so it is noisy.',
    },
    {
      id: 'td-target',
      range: { line: 26 },
      kind: 'math',
      title: 'TD target: reward plus the next estimate',
      what: 'Right after each step, move V(s) toward r + V(next state). The bracket is the TD error.',
      why: 'The target uses only one real step plus an estimate, so it is far less noisy than a full return, but it is only as good as that estimate (bootstrapping).',
    },
    {
      id: 'same-episodes',
      range: { line: 45 },
      kind: 'syntax',
      title: 'A fair comparison',
      what: 'Both methods update from exactly the same episodes.',
      why: 'Any difference in error comes from the update rule, not from luck in the episodes.',
    },
  ],
};

export const yourSettings: CodeExample = {
  id: 'rl-your-walk',
  language: 'python',
  source: `# The explorer's settings for the loop above
alpha = {{alpha}}
episodes = {{episodes}}`,
  slots: {
    alpha: (s) => (s as WalkState).alpha.toFixed(2),
    episodes: (s) => String((s as WalkState).episodes),
  },
  annotations: [
    {
      id: 'linked',
      range: { line: 2 },
      kind: 'parameter',
      title: 'Linked to the explorer',
      what: 'The step size and number of episodes chosen above.',
      why: 'α is the fraction of each surprise that one update absorbs: big α learns fast but jitters, small α is smooth but slow.',
    },
  ],
};
