// Code for "Markov decision processes". transitions.py runs under CPython 3.13 and Pyodide with a fixed seed; its
// output was copied from a CPython run and is checked by content/tracks/rl/python-outputs.test.ts. The visual uses
// src/lib/rl/grid.ts, whose transition probabilities are unit-tested against the same hand-worked cases.
import { transitionExperiment, type TransitionState } from '@/lib/rl/experiments';
import type { CodeExample } from '@/lib/types';

export const transitions = transitionExperiment('rl-transitions');

export const transitionsPy: CodeExample = {
  id: 'rl-transitions-py',
  language: 'python',
  run: 'pyodide',
  source: `import random

ROWS, COLS = 3, 4
WALLS = {(1, 1)}
GOAL, PIT = (0, 3), (1, 3)
MOVES = {"up": (-1, 0), "right": (0, 1), "down": (1, 0), "left": (0, -1)}
SIDEWAYS = {"up": ("left", "right"), "down": ("left", "right"), "left": ("up", "down"), "right": ("up", "down")}

def move(state, direction):
    r, c = state[0] + MOVES[direction][0], state[1] + MOVES[direction][1]
    if not (0 <= r < ROWS and 0 <= c < COLS) or (r, c) in WALLS:
        return state                                  # bump: stay put
    return (r, c)

def transitions(state, action, slip=0.2):
    """P(next state | state, action): the intended move with 1 - slip, each sideways move with slip / 2."""
    probs = {}
    for direction, p in [(action, 1 - slip), (SIDEWAYS[action][0], slip / 2), (SIDEWAYS[action][1], slip / 2)]:
        nxt = move(state, direction)
        probs[nxt] = probs.get(nxt, 0) + p            # two directions can land on the same cell
    return probs

P = transitions((1, 2), "up")
print({cell: round(p, 2) for cell, p in P.items()})
print("sums to", round(sum(P.values()), 10))

rng = random.Random(0)
cells, weights = list(P), list(P.values())
landed = [rng.choices(cells, weights)[0] for _ in range(1000)]
print({cell: landed.count(cell) for cell in cells}, "in 1000 tries")
print("from the start, up:", {cell: round(p, 2) for cell, p in transitions((2, 0), "up").items()})`,
  expectedOutput: `{(0, 2): 0.8, (1, 2): 0.1, (1, 3): 0.1}
sums to 1.0
{(0, 2): 810, (1, 2): 86, (1, 3): 104} in 1000 tries
from the start, up: {(1, 0): 0.8, (2, 0): 0.1, (2, 1): 0.1}`,
  annotations: [
    {
      id: 'three-directions',
      range: { line: 18 },
      kind: 'math',
      title: 'Three possible directions',
      what: 'The intended direction with probability 1 − slip, and each of the two sideways directions with slip/2. Never backwards.',
      why: 'This is the transition model of the classic grid world: an action is a request, not a guarantee.',
    },
    {
      id: 'merge-cells',
      range: { line: 20 },
      kind: 'syntax',
      title: 'Merge outcomes that land on the same cell',
      what: 'If two directions both bump into walls, both leave you where you are, so their probabilities add up.',
      why: 'A transition model gives one probability per next state. From the top-left corner (0, 0), "up" and a slip to the left both bump into the edge, so "stay put" gets 0.8 + 0.1 = 0.9.',
    },
    {
      id: 'sample-check',
      range: { line: 29 },
      kind: 'function',
      title: 'Sampling the environment',
      what: 'random.choices draws one next cell with the given probabilities, 1,000 times.',
      why: 'A real agent never sees P. It only sees samples like these, which is the starting point of lesson 7.',
    },
  ],
};

export const yourMove: CodeExample = {
  id: 'rl-your-move',
  language: 'python',
  source: `# The cell, action and slip from the explorer (uses transitions() above)
print(transitions(({{row}}, {{col}}), "{{action}}", slip={{slip}}))`,
  slots: {
    row: (s) => String(Math.floor((s as TransitionState).cell / 4)),
    col: (s) => String((s as TransitionState).cell % 4),
    action: (s) => (s as TransitionState).action,
    slip: (s) => (s as TransitionState).slip.toFixed(2),
  },
  annotations: [
    {
      id: 'linked',
      range: { line: 2 },
      kind: 'function',
      title: 'Linked to the explorer',
      what: 'The same question the visual answers: where can this action lead, and how likely is each cell?',
      why: 'Change the cell, action or slip above and this call changes with it.',
    },
  ],
};
