import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rl-return-small',
    type: 'numeric',
    prompt: 'Rewards [0, 0, 1] with γ = 0.9. What is the return from the first step?',
    answer: 0.81,
    tolerance: 0.001,
    hint: 'The 1 arrives two steps after the first reward, so it is multiplied by γ².',
    explain: '0 + 0.9 × 0 + 0.9² × 1 = 0.81.',
  },
  {
    id: 'rl-return-forever',
    type: 'numeric',
    prompt: 'An agent earns +2 every step, forever, with γ = 0.95. What is its return?',
    answer: 40,
    tolerance: 0.01,
    hint: 'A reward of 1 forever is worth 1/(1 − γ). This one is twice as large.',
    explain: '2 × 1/(1 − 0.95) = 2 × 20 = 40. Without discounting it would be infinite.',
  },
  {
    id: 'rl-gamma-zero',
    type: 'choice',
    prompt: 'With γ = 0, what does the agent end up maximising?',
    options: [
      { text: 'The next reward only; everything after it counts as 0', correct: true, explain: 'γ⁰ = 1 for the next reward and every later term is multiplied by 0. The agent is completely short-sighted.' },
      { text: 'The plain sum of all rewards, since nothing is discounted', correct: false, explain: 'That is γ = 1. γ = 0 discounts the future completely.' },
      { text: 'The average reward per step over the episode', correct: false, explain: 'Average reward is a different objective. γ = 0 keeps only the first term of the sum.' },
    ],
  },
  {
    id: 'rl-recursion-link',
    type: 'choice',
    prompt: 'The goal route has returns 0.492, 0.591, 0.702, 0.824, 0.96 at γ = 0.9. Which relationship links two neighbours, say 0.702 and 0.824?',
    options: [
      { text: '0.702 = 0.9 × 0.824', correct: false, explain: 'Close, but it forgets the reward collected on the step between them: 0.9 × 0.824 = 0.742.' },
      { text: '0.702 = −0.04 + 0.9 × 0.824', correct: true, explain: 'G_t = r_(t+1) + γ·G_(t+1): the step costs −0.04, and the rest of the future is worth 0.824 one step later, so 0.9 × 0.824 today.' },
      { text: '0.702 = 0.824 − 0.04 × 3', correct: false, explain: 'That treats the return as a plain sum minus costs. With γ < 1 the future is also scaled down.' },
    ],
  },
  {
    id: 'rl-gamma-meaning',
    type: 'choice',
    prompt: 'A robot vacuum’s battery dies with probability 5% after each step, ending the episode. Which γ makes the discounted return equal the expected total reward?',
    options: [
      { text: '0.05, the chance that the episode stops', correct: false, explain: 'That would almost ignore the future. γ is the chance of continuing, not of stopping.' },
      { text: '0.95, the chance that the episode goes on for another step', correct: true, explain: 'A reward k steps away is collected only if the robot survives k steps, probability 0.95^k. That is exactly the discount factor.' },
      { text: '1, because the robot should value all rewards equally', correct: false, explain: 'With a 5% stop chance, far rewards really are less likely to arrive, so counting them in full overestimates the total.' },
    ],
  },
  {
    id: 'rl-gamma-choice',
    type: 'choice',
    prompt: '1 now or 10 after nine empty steps. At γ = 0.8 the agent waits; at γ = 0.7 it takes the 1. What changed?',
    options: [
      { text: 'At 0.7 the 10 is worth 0.7⁹ × 10 ≈ 0.40 today, less than the 1 available now', correct: true, explain: 'At 0.8 it is worth 0.8⁹ × 10 ≈ 1.34, more than 1. The switch happens where γ⁹ × 10 = 1, at γ ≈ 0.774.' },
      { text: 'At 0.7 the agent can no longer see rewards more than five steps away', correct: false, explain: 'Discounting never hides a reward completely; it shrinks it. The 10 is still counted, just at 0.40.' },
      { text: 'At 0.7 the episode is more likely to end before the 10 arrives', correct: false, explain: 'The episode length is the same in both cases. Only how much the agent values delay changed.' },
    ],
  },
];

export const returnsExercise: Exercise = {
  id: 'rl-returns-per-step',
  prompt:
    'Write `returns_per_step(rewards, gamma)` that returns a list with the return G_t from every time step t, using the backward recursion G_t = r_(t+1) + γ·G_(t+1) (the return after the last reward is 0). Round nothing.',
  starter: `def returns_per_step(rewards, gamma):
    return []`,
  hints: ['Loop over reversed(rewards) with a running G that starts at 0.0.', 'Each step: G = r + gamma * G; append G; reverse the list at the end.'],
  solution: `def returns_per_step(rewards, gamma):
    G, out = 0.0, []
    for r in reversed(rewards):
        G = r + gamma * G
        out.append(G)
    return out[::-1]`,
  explanation:
    'Walking backwards, each return reuses the one after it, so the whole list costs one pass. The same "reward plus γ times what comes next" shape is the Bellman equation of lesson 5.',
  tests: `def close(a, b):
    return len(a) == len(b) and all(abs(x - y) < 1e-9 for x, y in zip(a, b))
assert close(returns_per_step([1, 0, 2], 0.9), [2.62, 1.8, 2.0])
assert close(returns_per_step([-0.04, -0.04, -0.04, -0.04, 0.96], 1.0), [0.8, 0.84, 0.88, 0.92, 0.96])
assert close(returns_per_step([5, 5], 0.0), [5.0, 5.0])
assert returns_per_step([], 0.9) == []`,
};
