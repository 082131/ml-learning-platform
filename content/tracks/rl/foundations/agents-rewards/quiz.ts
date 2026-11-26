import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rl-direct-total',
    type: 'numeric',
    prompt: 'With a reward of −0.04 per move, what is the total reward of the route up, up, right, right, right from (2,0) to the goal?',
    answer: 0.8,
    tolerance: 0.001,
    hint: 'Every one of the 5 moves costs 0.04, and the last one also enters the goal.',
    explain: 'Five moves cost 5 × 0.04 = 0.20, and the goal adds +1: 1 − 0.20 = 0.80.',
  },
  {
    id: 'rl-step-cost-why',
    type: 'choice',
    prompt: 'Nothing in the grid world says "be fast", yet a trained agent takes the shortest safe route. Why?',
    options: [
      { text: 'The environment ends episodes that take too many steps', correct: false, explain: 'Our grid has no step limit. Even with one, a limit cuts episodes off; it does not by itself make shorter routes score higher.' },
      { text: 'Each move costs 0.04, so a longer route to the same goal has a lower total', correct: true, explain: 'The +1 is the same for every route, so the step cost is the only thing that separates a short route from a long one. The preference for speed lives in the reward.' },
      { text: 'The policy always prefers the action that points straight at the goal', correct: false, explain: 'A policy is learned, not given. It ends up pointing at the goal only because those actions earned more reward.' },
      { text: 'Walls block every long route, leaving only the short one open', correct: false, explain: 'There are many open routes, including ones that bump into walls. They all reach the goal, just with more −0.04 steps.' },
    ],
  },
  {
    id: 'rl-reward-vs-label',
    type: 'choice',
    prompt: 'In supervised learning each example has a label. What is the closest thing in RL, and how is it different?',
    options: [
      { text: 'The reward, but it scores what happened instead of naming the right action', correct: true, explain: 'A label says "the answer was X". A reward of −0.04 says "that step cost a little", and every move gets the same −0.04, the best ones included. The agent has to compare outcomes over many tries to learn which action was right.' },
      { text: 'The next state, because it tells the agent where it should have gone', correct: false, explain: 'The next state is where the agent did go. It says nothing about where it should have gone.' },
      { text: 'The policy, because it lists the correct action for every state', correct: false, explain: 'The policy is what the agent is trying to learn, not something it is given.' },
    ],
  },
  {
    id: 'rl-who-controls',
    type: 'choice',
    prompt: 'In the loop state → action → reward and next state, which part does the agent control?',
    options: [
      { text: 'The action, and through it, indirectly, which states it visits next', correct: true, explain: 'The agent only chooses actions. The environment decides the reward and the next state. By choosing well, the agent steers which states it tends to reach.' },
      { text: 'The reward, by deciding how to score each of its own steps', correct: false, explain: 'If the agent could set its own reward the problem would be meaningless. The environment (designed by us) gives the reward.' },
      { text: 'The next state, since moves always go where the agent points', correct: false, explain: 'Only in this first deterministic version. With slipping (lesson 4) the same action can land in different cells, and the agent cannot choose which.' },
    ],
  },
  {
    id: 'rl-cleaning-robot',
    type: 'choice',
    prompt: 'A cleaning robot gets +1 for every piece of dirt it picks up. After training it tips dirt out of its bin and picks it up again. What is the real problem?',
    options: [
      { text: 'The robot did not explore enough to find the better behaviour', correct: false, explain: 'It explored very well: it found a way to earn more reward than cleaning gives.' },
      { text: 'The reward paid for an action (picking up), not the outcome we wanted (a clean floor)', correct: true, explain: 'The agent maximises exactly what it is paid for. Paying for picking up dirt, rather than for the floor being clean, made re-dirtying the floor profitable.' },
      { text: 'Episodes were too long, so the robot ran out of real dirt', correct: false, explain: 'Shorter episodes would reduce the damage, but the reward would still pay for the wrong thing.' },
    ],
  },
];

export const episodeExercise: Exercise = {
  id: 'rl-run-episode',
  prompt:
    'Using the `step(state, action, step_reward)` function given in the starter (the same rules as the lesson), write `run_episode(actions, step_reward=-0.04)`. It starts at (2, 0), applies the actions in order, and stops early when an action ends the episode. Return a tuple `(final_state, total_reward, moves_taken)`, with the total rounded to 2 decimals.',
  starter: `WALLS = {(1, 1)}
GOAL, PIT = (0, 3), (1, 3)
MOVES = {"up": (-1, 0), "right": (0, 1), "down": (1, 0), "left": (0, -1)}

def step(state, action, step_reward=-0.04):
    dr, dc = MOVES[action]
    r, c = state[0] + dr, state[1] + dc
    if not (0 <= r < 3 and 0 <= c < 4) or (r, c) in WALLS:
        r, c = state
    reward = step_reward + (1 if (r, c) == GOAL else -1 if (r, c) == PIT else 0)
    return (r, c), reward, (r, c) in (GOAL, PIT)

def run_episode(actions, step_reward=-0.04):
    return None`,
  hints: [
    'Keep three variables: state (starts at (2, 0)), total (starts at 0.0) and moves (starts at 0).',
    'Inside the loop: call step, add the reward, count the move, then `if done: break`.',
  ],
  solution: `WALLS = {(1, 1)}
GOAL, PIT = (0, 3), (1, 3)
MOVES = {"up": (-1, 0), "right": (0, 1), "down": (1, 0), "left": (0, -1)}

def step(state, action, step_reward=-0.04):
    dr, dc = MOVES[action]
    r, c = state[0] + dr, state[1] + dc
    if not (0 <= r < 3 and 0 <= c < 4) or (r, c) in WALLS:
        r, c = state
    reward = step_reward + (1 if (r, c) == GOAL else -1 if (r, c) == PIT else 0)
    return (r, c), reward, (r, c) in (GOAL, PIT)

def run_episode(actions, step_reward=-0.04):
    state, total, moves = (2, 0), 0.0, 0
    for action in actions:
        state, reward, done = step(state, action, step_reward)
        total += reward
        moves += 1
        if done:
            break
    return state, round(total, 2), moves`,
  explanation:
    'The loop is the whole agent–environment interaction: act, collect the reward, move on, stop at a terminal state. Actions after the goal are never taken, which is why the moves count stops at 5 in the second test.',
  tests: `assert run_episode(["up", "up", "right", "right", "right"]) == ((0, 3), 0.8, 5)
assert run_episode(["up", "up", "right", "right", "right", "left", "left"]) == ((0, 3), 0.8, 5)
assert run_episode(["right", "right", "right", "up"]) == ((1, 3), -1.16, 4)
assert run_episode(["up", "right"]) == ((1, 0), -0.08, 2), "right from (1, 0) bumps into the wall"
assert run_episode(["up", "up", "right", "right", "right"], step_reward=0) == ((0, 3), 1.0, 5)
assert run_episode([]) == ((2, 0), 0.0, 0)`,
};
