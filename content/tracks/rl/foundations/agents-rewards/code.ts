// Code for "Agents, environments and rewards". gridworld.py runs under CPython 3.13 and in the browser (Pyodide):
// its output was copied from a CPython run and is checked by content/tracks/rl/python-outputs.test.ts.
// The play view uses src/lib/rl/grid.ts and experiments.ts (playGrid), which follow the same rules, and the
// gymnasium snippet was run with gymnasium 1.4.0 under CPython (it does not run in the browser).
import { playExperiment, playGrid, type PlayState } from '@/lib/rl/experiments';
import type { CodeExample } from '@/lib/types';

export const play = playExperiment('rl-play');

export const gridworld: CodeExample = {
  id: 'rl-gridworld-step',
  language: 'python',
  run: 'pyodide',
  source: `# A tiny grid world: 3 rows, 4 columns, row 0 at the top.
WALLS = {(1, 1)}
GOAL, PIT = (0, 3), (1, 3)
MOVES = {"up": (-1, 0), "right": (0, 1), "down": (1, 0), "left": (0, -1)}

def step(state, action, step_reward=-0.04):
    """The environment: where you end up, what reward you get, and whether the episode is over."""
    dr, dc = MOVES[action]
    r, c = state[0] + dr, state[1] + dc
    if not (0 <= r < 3 and 0 <= c < 4) or (r, c) in WALLS:
        r, c = state                      # bumped into the edge or a wall: stay put
    next_state = (r, c)
    reward = step_reward                  # every move costs a little
    if next_state == GOAL:
        reward += 1
    elif next_state == PIT:
        reward -= 1
    done = next_state in (GOAL, PIT)
    return next_state, reward, done

state, total = (2, 0), 0.0                # the start cell, bottom left
for t, action in enumerate(["up", "up", "right", "right", "right"]):
    next_state, reward, done = step(state, action)
    total += reward
    print(f"t={t}: {state} {action:>5} -> {next_state}  reward {reward:+.2f}  total {total:+.2f}")
    state = next_state
    if done:
        print("episode over: reached", "the goal" if state == GOAL else "the pit")
        break`,
  expectedOutput: `t=0: (2, 0)    up -> (1, 0)  reward -0.04  total -0.04
t=1: (1, 0)    up -> (0, 0)  reward -0.04  total -0.08
t=2: (0, 0) right -> (0, 1)  reward -0.04  total -0.12
t=3: (0, 1) right -> (0, 2)  reward -0.04  total -0.16
t=4: (0, 2) right -> (0, 3)  reward +0.96  total +0.80
episode over: reached the goal`,
  annotations: [
    {
      id: 'environment-step',
      range: { line: 5 },
      kind: 'function',
      title: 'The environment is a function',
      what: 'step takes the current state and the chosen action, and returns the next state, the reward and a done flag.',
      why: 'This is the whole interface between agent and environment. Gymnasium, the standard RL library, uses the same idea: env.step(action) returns the next observation, the reward and whether the episode ended.',
    },
    {
      id: 'stay-put',
      range: { line: 10 },
      kind: 'syntax',
      title: 'Walls and edges',
      what: 'A move into a wall or off the grid leaves you where you were.',
      why: 'The move still costs the step reward, so bumping into walls is never free.',
    },
    {
      id: 'reward-rule',
      range: { line: 12 },
      kind: 'variable',
      title: 'The reward rule',
      what: 'Every move earns −0.04; entering the goal adds +1 and entering the pit adds −1.',
      why: 'The small cost is what makes shorter routes better. Nothing in the code says "hurry"; the reward says it for you.',
    },
    {
      id: 'done-flag',
      range: { line: 17 },
      kind: 'variable',
      title: 'Terminal states',
      what: 'The goal and the pit end the episode.',
      why: 'An episode is one complete attempt. Learning happens across many episodes.',
    },
    {
      id: 'the-loop',
      range: { line: 22 },
      kind: 'syntax',
      title: 'The agent–environment loop',
      what: 'Choose an action, call step, collect the reward, move to the next state, repeat until done.',
      why: 'Here the actions are a fixed list. In later lessons a policy chooses them, and a learning rule improves the policy from the rewards.',
    },
  ],
};

const quote = (s: PlayState) => s.moves.map((m) => `"${m}"`).join(', ');

export const yourEpisode: CodeExample = {
  id: 'rl-your-episode',
  language: 'python',
  source: `# The episode you just played, in the same loop (uses step() from gridworld.py above)
step_reward = {{step}}
actions = [{{moves}}]
state, total = (2, 0), 0.0
for action in actions:
    state, reward, done = step(state, action, step_reward)
    total += reward
    if done:
        break
print(state, round(total, 2))   # {{result}}`,
  slots: {
    step: (s) => String((s as PlayState).stepReward),
    moves: (s) => quote(s as PlayState),
    result: (s) => {
      const r = playGrid(s as PlayState);
      const [row, col] = [Math.floor(r.at / 4), r.at % 4];
      return `prints (${row}, ${col}) ${Number(r.total.toFixed(2))}`;
    },
  },
  annotations: [
    {
      id: 'your-moves',
      range: { line: 3 },
      kind: 'variable',
      title: 'Your moves',
      what: 'The buttons you pressed above, in order.',
      why: 'An agent’s experience is exactly this kind of record, plus the rewards that came back.',
    },
  ],
};

export const gymnasiumCode: CodeExample = {
  id: 'rl-gymnasium-loop',
  language: 'python',
  source: `import gymnasium as gym               # pip install gymnasium  (run with 1.4.0)

env = gym.make("FrozenLake-v1")       # a 4x4 icy grid: reach the gift, avoid the holes
state, info = env.reset(seed=0)       # start a new episode; state 0 is the top-left cell
next_state, reward, terminated, truncated, info = env.step(1)   # action 1 = move down
print(state, next_state, reward, terminated, truncated, info)
# 0 0 0 False False {'prob': 0.33333333333333337}`,
  annotations: [
    {
      id: 'gym-reset',
      range: { line: 4 },
      kind: 'function',
      title: 'reset',
      what: 'Starts a new episode and returns the first state (Gymnasium calls it the observation) and an info dict.',
      why: 'Seeding reset makes the episode reproducible.',
    },
    {
      id: 'gym-step',
      range: { line: 5 },
      kind: 'function',
      title: 'step returns five things',
      what: 'next state, reward, terminated (a terminal state was reached), truncated (a time limit cut the episode short), info.',
      why: 'FrozenLake is slippery by default: "down" only goes down one time in three. Here the move slipped sideways into the edge of the grid, so the agent stayed in cell 0. The next lessons are about exactly this kind of randomness.',
    },
  ],
};
