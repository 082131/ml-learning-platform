import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'retryable',
    type: 'choice',
    prompt: 'Which response should your code retry?',
    options: [
      {
        text: '429 Too Many Requests with Retry-After: 4',
        correct: true,
        explain: 'A rate limit is temporary. Wait the 4 seconds the server asked for, then try again.',
      },
      {
        text: '400 Bad Request: max_tokens must be a positive integer',
        correct: false,
        explain: 'The request itself is wrong. Every retry gets the same 400; fix the code instead.',
      },
      {
        text: '401 Unauthorized',
        correct: false,
        explain: 'The API key is missing or invalid. Retrying will not make it valid.',
      },
    ],
  },
  {
    id: 'backoff',
    type: 'numeric',
    prompt:
      'With exponential backoff, a base delay of 2 s and no jitter, how many seconds in total does a client wait across its first three retries?',
    answer: 14,
    tolerance: 0,
    hint: 'The waits are base · 2^0, base · 2^1 and base · 2^2.',
    explain: '2 + 4 + 8 = 14 seconds.',
  },
  {
    id: 'jitter',
    type: 'choice',
    prompt: 'Why add random jitter to retry waits?',
    options: [
      {
        text: 'So clients that failed at the same moment spread their retries out instead of hitting the server together again',
        correct: true,
        explain:
          'Without jitter, a burst of failures turns into a burst of synchronized retries at 1 s, 2 s, 4 s …',
      },
      {
        text: 'To make each retry faster',
        correct: false,
        explain: 'Full jitter can shorten some waits, but the goal is spreading load, not speed.',
      },
      {
        text: 'Because servers reject requests sent at round-second times',
        correct: false,
        explain: 'They don’t. The problem is many clients retrying at the same time.',
      },
    ],
  },
  {
    id: 'usage-cost',
    type: 'numeric',
    prompt:
      'A response reports 2,000 input tokens and 500 output tokens. At $3 per million input tokens and $15 per million output tokens, what did it cost in dollars?',
    answer: 0.0135,
    tolerance: 0.00001,
    hint: 'Input: 2000 · 3 / 1,000,000. Output: 500 · 15 / 1,000,000.',
    explain: '0.006 + 0.0075 = $0.0135.',
  },
  {
    id: 'local-vs-hosted',
    type: 'choice',
    prompt: 'What do you take on when you run a pretrained model yourself instead of calling a hosted API?',
    options: [
      {
        text: 'Servers, scaling, updates and monitoring, in exchange for control over the data and a fixed cost',
        correct: true,
        explain: 'The model is free to download, but running it reliably is your job.',
      },
      {
        text: 'Nothing: open models are free',
        correct: false,
        explain: 'The weights may be free; the GPUs, the engineering time and the on-call duty are not.',
      },
      {
        text: 'Per-token pricing',
        correct: false,
        explain: 'Self-hosting is a fixed cost per hour, not per token.',
      },
    ],
  },
];

export const backoffExercise: Exercise = {
  id: 'backoff-schedule',
  prompt:
    'Write `waits(base, retries, cap)` returning the list of exponential backoff waits (no jitter), each capped at `cap`.',
  starter: `def waits(base, retries, cap):
    pass`,
  hints: ['The wait before retry i (from 0) is base * 2 ** i.', 'Use min(cap, ...) to cap each one.'],
  solution: `def waits(base, retries, cap):
    return [min(cap, base * 2 ** i) for i in range(retries)]`,
  explanation:
    'Doubling grows fast: with base 1, the tenth wait would be 512 seconds, which is why every real backoff has a cap and a maximum number of retries.',
  tests: `assert waits(1, 4, 30) == [1, 2, 4, 8], 'base 1: 1, 2, 4, 8'
assert waits(2, 3, 30) == [2, 4, 8], 'base 2: 2, 4, 8'
assert waits(4, 5, 30) == [4, 8, 16, 30, 30], 'each wait is capped at 30'
assert waits(1, 0, 30) == [], 'no retries, no waits'`,
};
