// Code for "Exploration vs exploitation". bandit.py runs under CPython 3.13 and Pyodide with a fixed seed; its
// output was copied from a CPython run and is checked by content/tracks/rl/python-outputs.test.ts. The explorer
// uses src/lib/rl/bandit.ts (the same algorithms, unit-tested) with the browser's own seeded generator, so its
// individual random draws differ from Python's while the averages behave the same way.
import { banditExperiment, type BanditState } from '@/lib/rl/experiments';
import type { CodeExample } from '@/lib/types';

export const bandit = banditExperiment('rl-bandit');

export const banditPy: CodeExample = {
  id: 'rl-bandit-py',
  language: 'python',
  run: 'pyodide',
  source: `import math
import random

PROBS = [0.3, 0.5, 0.45, 0.6]          # true click rates of headlines A to D (hidden from the agent)

def run(strategy, steps=1000, epsilon=0.1, c=1.0, seed=0):
    rng = random.Random(seed)
    Q = [0.0] * 4                       # estimated click rate of each headline
    N = [0] * 4                         # how often each headline was shown
    clicks = 0
    for t in range(1, steps + 1):
        if strategy == "epsilon" and rng.random() < epsilon:
            a = rng.randrange(4)                                   # explore: any headline
        elif strategy == "ucb":
            scores = [math.inf if N[i] == 0 else Q[i] + c * math.sqrt(math.log(t) / N[i]) for i in range(4)]
            a = scores.index(max(scores))                          # optimism about the uncertain
        else:
            a = Q.index(max(Q))                                    # exploit: best estimate so far
        reward = 1 if rng.random() < PROBS[a] else 0               # the environment answers
        N[a] += 1
        Q[a] += (reward - Q[a]) / N[a]                             # incremental mean
        clicks += reward
    return clicks, N, [round(q, 2) for q in Q]

for strategy in ("greedy", "epsilon", "ucb"):
    clicks, N, Q = run(strategy)
    print(f"{strategy:>7}: {clicks} clicks in 1000, shown {N}, estimates {Q}")`,
  expectedOutput: ` greedy: 296 clicks in 1000, shown [1000, 0, 0, 0], estimates [0.3, 0.0, 0.0, 0.0]
epsilon: 472 clicks in 1000, shown [137, 490, 275, 98], estimates [0.32, 0.49, 0.49, 0.51]
    ucb: 553 clicks in 1000, shown [29, 147, 96, 728], estimates [0.21, 0.48, 0.43, 0.6]`,
  annotations: [
    {
      id: 'explore-branch',
      range: { line: 12 },
      kind: 'syntax',
      title: 'ε-greedy: explore with probability ε',
      what: 'One time in ten, ignore the estimates and pick a headline uniformly at random.',
      why: 'Without this, a headline that looked bad early on is never shown again, so its bad estimate is never corrected.',
    },
    {
      id: 'ucb-score',
      range: { line: 15 },
      kind: 'math',
      title: 'The UCB score',
      what: 'Estimate plus a bonus √(ln t / N) that is large when a headline has been shown rarely and shrinks as it is shown more.',
      why: 'Instead of exploring at random, UCB explores the options it is least sure about. An option never shown scores infinity, so each one is tried once first.',
    },
    {
      id: 'greedy-branch',
      range: { line: 18 },
      kind: 'syntax',
      title: 'Greedy choice',
      what: 'Pick the headline with the highest estimate (the first one if several tie).',
      why: 'This is exploitation: use what you know. On its own it can lock onto whichever headline got lucky first.',
    },
    {
      id: 'incremental-mean',
      range: { line: 21 },
      kind: 'math',
      title: 'Incremental mean',
      what: 'Q moves a fraction 1/N of the way from its old value toward the new reward.',
      why: 'This equals the plain average of all rewards seen for that headline, without storing them. "Old estimate + step size × (target − old estimate)" is the shape of every RL update from here on.',
    },
  ],
};

export const policyCode: CodeExample = {
  id: 'rl-bandit-settings',
  language: 'python',
  source: `# The explorer's settings, for run() above
strategy = "{{strategy}}"
epsilon = {{epsilon}}        # used by "epsilon"
c = {{c}}              # used by "ucb"
Q = [{{initial}}] * 4         # starting estimates: 1.0 is "optimistic"`,
  slots: {
    strategy: (s) => (s as BanditState).strategy,
    epsilon: (s) => (s as BanditState).epsilon.toFixed(2),
    c: (s) => (s as BanditState).c.toFixed(1),
    initial: (s) => (s as BanditState).initial.toFixed(1),
  },
  annotations: [
    {
      id: 'optimistic',
      range: { line: 5 },
      kind: 'parameter',
      title: 'Optimistic starting values',
      what: 'Starting every estimate at 1.0, higher than any real click rate.',
      why: 'Each headline disappoints the first few times it is shown, so even a greedy agent moves on to the others: early exploration for free.',
    },
  ],
};
