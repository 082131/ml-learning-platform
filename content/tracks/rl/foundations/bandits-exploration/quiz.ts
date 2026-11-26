import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rl-incremental',
    type: 'numeric',
    prompt: 'An arm has estimate Q = 0.5 after N = 4 pulls. The fifth pull pays 1. What is the new estimate?',
    answer: 0.6,
    tolerance: 0.001,
    hint: 'Q ← Q + (R − Q)/N, with N = 5 after counting this pull.',
    explain: '0.5 + (1 − 0.5)/5 = 0.5 + 0.1 = 0.6. Check: four pulls averaging 0.5 gave 2 in total; 3/5 = 0.6.',
  },
  {
    id: 'rl-greedy-stuck',
    type: 'choice',
    prompt: 'A greedy agent shows headline D twice early on and gets no clicks. Why can this bad estimate last forever?',
    options: [
      { text: 'Two zeros make D’s estimate 0, and greedy will never show D again to correct it', correct: true, explain: 'An estimate is only updated when its action is taken. Greedy only takes the current best, so a wrongly low estimate is never retested.' },
      { text: 'The incremental mean gives early rewards more weight than later ones', correct: false, explain: 'It gives every reward equal weight, which is why it equals the plain average.' },
      { text: 'D’s click rate drops after it is shown without a click', correct: false, explain: 'The true click rates are fixed. Only the agent’s estimate is wrong.' },
    ],
  },
  {
    id: 'rl-ucb-bonus',
    type: 'choice',
    prompt: 'Two arms both have estimate 0.5 after 100 pulls in total. Arm X was pulled 90 times, arm Y 10 times. Which does UCB pick, and why?',
    options: [
      { text: 'X, because 90 pulls make its estimate more reliable', correct: false, explain: 'Reliability is exactly why X gets a small bonus. UCB prefers the arm it is less sure about when estimates are equal.' },
      { text: 'Y, because its uncertainty bonus √(ln t / N) is three times larger with N = 10', correct: true, explain: '√(ln 100/10) ≈ 0.68 versus √(ln 100/90) ≈ 0.23. Same estimate, more room to be better than it looks, so Y is explored.' },
      { text: 'Either, because UCB breaks ties at random', correct: false, explain: 'The estimates tie but the scores do not: the bonus differs.' },
    ],
  },
  {
    id: 'rl-epsilon-cost',
    type: 'choice',
    prompt: 'With ε = 0.5 the explorer finds headline D quickly, yet its average reward per pull is lower than with ε = 0.1. Why?',
    options: [
      { text: 'Half the pulls stay random forever, even after D is known to be best', correct: true, explain: 'ε-greedy never stops exploring. With ε = 0.5 roughly 37.5% of pulls go to A, B or C even at the end (half are random, and three quarters of those miss D).' },
      { text: 'A large ε makes the estimates less accurate', correct: false, explain: 'More exploration makes the estimates more accurate, not less. The cost is in the choices, not the estimates.' },
      { text: 'A large ε resets the estimates more often', correct: false, explain: 'ε only decides which arm is pulled. Estimates are never reset.' },
    ],
  },
  {
    id: 'rl-optimistic-ucb',
    type: 'choice',
    prompt: 'Optimistic starting values help greedy a lot but make no difference to UCB in the explorer. Why?',
    options: [
      { text: 'UCB scores never-tried arms as infinite, so it tries each once anyway, and the first real reward replaces the starting value', correct: true, explain: 'The incremental update with N = 1 sets Q to the first reward exactly, so whatever Q started at is forgotten after one pull, and UCB guarantees that pull.' },
      { text: 'UCB ignores the estimates and uses only the counts', correct: false, explain: 'UCB uses estimate plus bonus. The estimates matter a lot after the first pulls.' },
      { text: 'UCB only works with estimates that start at 0', correct: false, explain: 'Any starting value works; it just stops mattering after the first pull of each arm.' },
    ],
  },
];

export const ucbExercise: Exercise = {
  id: 'rl-ucb-choice',
  prompt:
    'Write two functions. `update(Q, N, a, reward)` adds one pull of arm `a` with `reward` to the lists Q (estimates) and N (counts) in place, using the incremental mean. `ucb_choice(Q, N, t, c)` returns the index of the arm with the highest UCB score Q[i] + c·√(ln t / N[i]); an arm with N[i] == 0 scores infinity; ties go to the lowest index.',
  starter: `import math

def update(Q, N, a, reward):
    pass

def ucb_choice(Q, N, t, c):
    return 0`,
  hints: [
    'update: N[a] += 1 first, then Q[a] += (reward − Q[a]) / N[a].',
    'ucb_choice: build a list of scores (math.inf for N[i] == 0) and return scores.index(max(scores)).',
  ],
  solution: `import math

def update(Q, N, a, reward):
    N[a] += 1
    Q[a] += (reward - Q[a]) / N[a]

def ucb_choice(Q, N, t, c):
    scores = [math.inf if n == 0 else q + c * math.sqrt(math.log(t) / n) for q, n in zip(Q, N)]
    return scores.index(max(scores))`,
  explanation:
    'The update is the running average; UCB adds a bonus that shrinks as an arm is pulled more. Together they are a complete bandit agent: choose with ucb_choice, observe the reward, update.',
  tests: `Q, N = [0.0, 0.0], [0, 0]
for r in (1, 0, 1):
    update(Q, N, 0, r)
assert N == [3, 0] and abs(Q[0] - 2 / 3) < 1e-12
assert ucb_choice(Q, N, 3, 1.0) == 1, "an arm never pulled must be tried"
assert ucb_choice([0.5, 0.5], [90, 10], 100, 1.0) == 1, "same estimate: the less-tried arm has the bigger bonus"
assert ucb_choice([0.9, 0.5], [50, 50], 100, 1.0) == 0, "same counts: the better estimate wins"
assert ucb_choice([0.9, 0.5], [90, 10], 100, 0.0) == 0, "c = 0 is plain greedy"`,
};
