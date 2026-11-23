import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-retry',
    type: 'choice',
    prompt: 'Your nightly export calls an API. Which response should NOT be retried?',
    options: [
      { text: '503 Service Unavailable', correct: false, explain: 'The service is temporarily unable to answer. Retry with backoff.' },
      { text: '429 Too Many Requests', correct: false, explain: 'You are over the rate limit. Wait (Retry-After if sent) and try again.' },
      { text: '401 Unauthorized', correct: true, explain: 'Your credentials are wrong or expired. Retrying sends the same bad credentials; fail and alert instead.' },
      { text: 'A read timeout after 10 seconds', correct: false, explain: 'Usually transient. Safe to retry for reads; for writes, use an idempotency key.' },
    ],
  },
  {
    id: 'backoff-sum',
    type: 'numeric',
    prompt: 'Exponential backoff with base 2 s, cap 20 s and 5 attempts in total, every attempt failing. How many seconds does the client wait in total before giving up? (No jitter.)',
    answer: 30,
    tolerance: 0,
    hint: 'There are 4 waits between 5 attempts: 2, 4, 8, then 16. Is any above the cap?',
    explain: 'Waits are 2, 4, 8, 16 (all under the 20 s cap): 2 + 4 + 8 + 16 = 30 s.',
  },
  {
    id: 'jitter-why',
    type: 'choice',
    prompt: 'A database restarts and 500 workers fail at the same instant. Why add jitter to their backoff?',
    options: [
      { text: 'It shortens the average wait of each worker', correct: false, explain: 'Full jitter halves the average wait, but that is a side effect, not the reason.' },
      { text: 'Without it, all 500 retry in the same instant, again and again', correct: true, explain: 'Identical schedules keep the herd synchronised; each burst can knock the database over again. Randomness spreads them out.' },
      { text: 'It lets each worker skip retries the server would reject', correct: false, explain: 'Jitter only changes when a retry happens, not whether it is sent.' },
    ],
  },
  {
    id: 'timeout',
    type: 'choice',
    prompt: 'requests.get(url) hangs for six hours inside a cron job. What was missing?',
    options: [
      { text: 'A timeout= argument, since requests waits forever by default', correct: true, explain: 'The requests docs say nearly all production code should set a timeout. Without one, a stalled connection never raises, so no retry happens either.' },
      { text: 'A retry policy, since it would have tried again after a minute', correct: false, explain: 'A retry needs a failure first. A hung request never fails.' },
      { text: 'A smaller response, since requests stalls on large downloads', correct: false, explain: 'Large downloads are slow, not hung. The problem is a connection that sends nothing.' },
    ],
  },
  {
    id: 'post-retry',
    type: 'choice',
    prompt: 'A POST that launches a training job times out. Why is a blind retry risky, and what fixes it?',
    options: [
      { text: 'Retries reuse the same TCP connection; open a new session', correct: false, explain: 'The transport is not the risk. The server may already have started the job.' },
      { text: 'The server may have started the job; send an idempotency key', correct: true, explain: 'A timeout says nothing about whether the work happened. With a key, the server recognises the repeat and returns the first result.' },
      { text: 'POST bodies are lost on retry; resend them with PUT instead', correct: false, explain: 'Bodies are resent fine, and switching verbs does not make the operation idempotent.' },
    ],
  },
];

export const backoffExercise: Exercise = {
  id: 'backoff-waits',
  prompt:
    'Write `backoff_waits(base, cap, attempts, retry_after=None)`. It returns the list of waits (seconds) a client makes between `attempts` failed attempts using exponential backoff without jitter: base, 2×base, 4×base, ... each capped at `cap`. `retry_after` is an optional dict from wait index (0 = the wait after the first attempt) to a Retry-After value; when present and larger, it replaces that wait. With 1 attempt there are no waits.',
  starter: `def backoff_waits(base, cap, attempts, retry_after=None):
    return []`,
  hints: [
    'There are attempts − 1 waits. Wait i (from 0) is min(cap, base * 2 ** i).',
    'retry_after = retry_after or {}; then wait = max(wait, retry_after.get(i, 0)).',
  ],
  solution: `def backoff_waits(base, cap, attempts, retry_after=None):
    retry_after = retry_after or {}
    waits = []
    for i in range(attempts - 1):
        wait = min(cap, base * 2 ** i)
        waits.append(max(wait, retry_after.get(i, 0)))
    return waits`,
  explanation:
    'The cap keeps late waits sane; Retry-After overrides the schedule when the server asks for longer. Add jitter on top by drawing uniformly from [0, wait].',
  tests: `assert backoff_waits(1, 30, 5) == [1, 2, 4, 8]
assert backoff_waits(2, 20, 6) == [2, 4, 8, 16, 20]
assert backoff_waits(1, 30, 1) == []
assert backoff_waits(1, 30, 4, {1: 10}) == [1, 10, 4]
assert backoff_waits(1, 30, 3, {0: 0.5}) == [1, 2]`,
};
