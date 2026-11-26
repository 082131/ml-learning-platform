import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rl-pit-risk',
    type: 'numeric',
    prompt: 'With slip 0.2, the agent at (1,2) chooses up three times in a row and never falls in. What was the probability of that? (Staying put counts as not falling.)',
    answer: 0.729,
    tolerance: 0.001,
    hint: 'Each try avoids the pit with probability 1 − 0.1.',
    explain: 'Each up from (1,2) falls in with probability 0.1, so survives with 0.9. Three in a row: 0.9³ = 0.729. Repeated small risks add up, which is why the safe route can be worth its extra steps.',
  },
  {
    id: 'rl-expected-reward',
    type: 'numeric',
    prompt: 'What is the expected immediate reward of "up" from (1,2) with slip 0.2? (−0.04 per move; the pit adds −1.)',
    answer: -0.14,
    tolerance: 0.001,
    hint: 'Weight each outcome’s reward by its probability: 0.8 and 0.1 earn −0.04, the 0.1 into the pit earns −1.04.',
    explain: '0.8 × (−0.04) + 0.1 × (−0.04) + 0.1 × (−1.04) = −0.032 − 0.004 − 0.104 = −0.14.',
  },
  {
    id: 'rl-markov-test',
    type: 'choice',
    prompt: 'A self-driving car’s state is its position on the road. Why might this break the Markov property, and what fixes it?',
    options: [
      { text: 'Two cars at the same spot can be moving at different speeds; add velocity to the state', correct: true, explain: 'Same state, different futures means the state is missing information. Adding velocity (and heading) makes the present enough to predict the next step.' },
      { text: 'Roads are random; make the transition probabilities deterministic', correct: false, explain: 'Randomness is allowed in an MDP. The Markov property is about whether the state holds everything relevant, not about randomness.' },
      { text: 'The car has too many possible positions; use fewer states', correct: false, explain: 'Fewer states would throw away even more information and make the problem less Markov, not more.' },
    ],
  },
  {
    id: 'rl-p-vs-pi',
    type: 'choice',
    prompt: 'An agent follows the deterministic policy "always up" from (1,2). Is its episode deterministic?',
    options: [
      { text: 'Yes: a deterministic policy always produces the same episode', correct: false, explain: 'Only if the environment is deterministic too. Here P still slips sideways 20% of the time.' },
      { text: 'No: the policy fixes the action, but the transition probabilities still decide where it lands', correct: true, explain: 'Randomness can come from π, from P, or both. A deterministic policy removes only the first.' },
      { text: 'No: a deterministic policy picks a random action when the intended one is blocked', correct: false, explain: 'A deterministic policy never picks at random. Blocked moves simply leave the agent in place.' },
    ],
  },
  {
    id: 'rl-left-safe',
    type: 'choice',
    prompt: 'At (1,2) with slip 0.2, which action has zero chance of entering the pit?',
    options: [
      { text: 'Up, because the pit is to the right, not above', correct: false, explain: 'Up slips right with probability 0.1, and right of (1,2) is the pit.' },
      { text: 'Left, because its slips go up and down, never right', correct: true, explain: 'Slips are at right angles to the chosen direction. For left they are up (to (0,2)) and down (to (2,2)); the intended move bumps the wall and stays.' },
      { text: 'Down, because it moves away from the pit', correct: false, explain: 'Down slips left (the wall, stay) or right (the pit), so it still has a 0.1 chance.' },
    ],
  },
];

export const transitionExercise: Exercise = {
  id: 'rl-expected-step-reward',
  prompt:
    'A transition row is a list of (probability, next_state, reward) tuples. Write `expected_reward(row)` that returns the probability-weighted average reward, and `check_row(row)` that returns True when the probabilities are all between 0 and 1 and add up to 1 (within 1e-9).',
  starter: `def expected_reward(row):
    return 0.0

def check_row(row):
    return False`,
  hints: [
    'expected_reward: sum(p * r for p, _, r in row).',
    'check_row: every 0 <= p <= 1, and abs(sum of p − 1) < 1e-9.',
  ],
  solution: `def expected_reward(row):
    return sum(p * r for p, _, r in row)

def check_row(row):
    probs = [p for p, _, _ in row]
    return all(0 <= p <= 1 for p in probs) and abs(sum(probs) - 1) < 1e-9`,
  explanation:
    'An expected value weighs each outcome by how likely it is. The same weighting, applied to reward plus the value of the next state, is the Bellman equation in the next lesson.',
  tests: `up_from_12 = [(0.8, (0, 2), -0.04), (0.1, (1, 2), -0.04), (0.1, (1, 3), -1.04)]
assert abs(expected_reward(up_from_12) - (-0.14)) < 1e-9
assert check_row(up_from_12)
assert not check_row([(0.8, (0, 2), -0.04), (0.1, (1, 2), -0.04)]), "sums to 0.9"
assert not check_row([(1.2, (0, 2), 0), (-0.2, (1, 2), 0)]), "probabilities must be in [0, 1]"
assert expected_reward([(1.0, (0, 3), 0.96)]) == 0.96`,
};
