import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'capacity',
    type: 'numeric',
    prompt:
      'A batch of B requests takes 20 + 3·B ms. How many requests per second can the replica finish at most with batches of 8? (one decimal)',
    answer: 181.8,
    tolerance: 0.05,
    hint: 'One full batch of 8 takes 20 + 24 = 44 ms. How many requests is that per 1,000 ms?',
    explain: '8 requests every 44 ms: 8 / 0.044 s = 181.8 requests per second. With batches of 1 it is only 1 / 0.023 s = 43.5.',
  },
  {
    id: 'why-batching',
    type: 'choice',
    prompt: 'Why does batching raise throughput on a GPU when the batch is small?',
    options: [
      {
        text: 'Each pass reads every weight from memory once, whatever the batch size, so a batch shares that fixed cost',
        correct: true,
        explain:
          'At small batch sizes the time is dominated by moving weights (memory-bound). More requests per pass add little arithmetic time until compute becomes the limit.',
      },
      {
        text: 'Batched requests need fewer arithmetic operations per request',
        correct: false,
        explain: 'The arithmetic per request is the same. What is shared is the weight traffic and fixed overheads.',
      },
      {
        text: 'Batching makes each individual request faster',
        correct: false,
        explain: 'Each request waits for others and runs in a longer batch, so its own latency usually goes up.',
      },
    ],
  },
  {
    id: 'max-wait-light',
    type: 'choice',
    prompt: 'Traffic is light: 20 requests per second, far below capacity. What does raising max_wait from 0 to 50 ms mostly do?',
    options: [
      {
        text: 'Raises latency, because requests sit waiting for partners that rarely come, while throughput stays at 20 req/s',
        correct: true,
        explain: 'Throughput cannot exceed the arrival rate. Below capacity, waiting longer only adds latency.',
      },
      {
        text: 'Raises throughput, because batches get bigger',
        correct: false,
        explain: 'Bigger batches only raise throughput when the replica is the bottleneck. Here it is idle most of the time.',
      },
      {
        text: 'Nothing, because max_wait only matters when batches are full',
        correct: false,
        explain: 'It matters exactly when batches are not full: it decides how long the first request waits for others.',
      },
    ],
  },
  {
    id: 'overload',
    type: 'choice',
    prompt: 'Requests arrive at 100 per second but the replica can finish only 43.5 per second. What happens to p95 latency?',
    options: [
      {
        text: 'It keeps growing for as long as the overload lasts, because the queue grows by about 56 requests every second',
        correct: true,
        explain:
          'An overloaded queue has no steady state. In the simulation it reaches tens of seconds, and in a real server requests time out or memory runs out.',
      },
      {
        text: 'It settles at about twice the service time',
        correct: false,
        explain: 'That is the kind of value you see below capacity. Above it, the backlog never clears.',
      },
      {
        text: 'It stays the same, because the replica is 100% busy',
        correct: false,
        explain: 'Being fully busy is the problem: work arrives faster than it is finished.',
      },
    ],
  },
  {
    id: 'little',
    type: 'numeric',
    prompt:
      'A service handles 100 requests per second with a mean latency of 50 ms and is not overloaded. On average, how many requests are inside it at once?',
    answer: 5,
    tolerance: 0,
    hint: 'Little’s law: L = λW. Use seconds for W.',
    explain: 'L = 100 req/s × 0.05 s = 5 requests. That is the concurrency a load test must sustain to reproduce this load.',
  },
];

export const percentileExercise: Exercise = {
  id: 'percentile-capacity',
  prompt:
    'Write `percentile(values, p)` using the nearest-rank method and `capacity(t0, per_item, batch)` in requests per second.',
  starter: `import math


def percentile(values, p):
    # Nearest rank: sort, then take position ceil(p * n / 100) (counting from 1).
    pass


def capacity(t0, per_item, batch):
    # Requests per second when every batch is full; t0 and per_item are in ms.
    pass`,
  hints: [
    'Sort a copy: `s = sorted(values)`. The rank is `math.ceil(p * len(s) / 100)`, and Python lists start at 0.',
    'Guard p = 0 with `max(1, ...)` so the index is never -1.',
    'A full batch takes `t0 + per_item * batch` ms and finishes `batch` requests: multiply by 1000 to get per second.',
  ],
  solution: `import math


def percentile(values, p):
    s = sorted(values)
    rank = max(1, math.ceil(p * len(s) / 100))
    return s[rank - 1]


def capacity(t0, per_item, batch):
    return 1000 * batch / (t0 + per_item * batch)`,
  explanation:
    'With nearest rank, p95 of 20 values is the 19th smallest: at least 95% of values are at or below it. capacity divides the requests in one full batch by the time that batch takes.',
  tests: `assert percentile(list(range(1, 11)), 50) == 5, 'p50 of 1..10 should be 5'
assert percentile(list(range(1, 11)), 95) == 10, 'p95 of 1..10 should be 10'
assert percentile([30, 10, 20], 100) == 30, 'p100 should be the largest value, without an IndexError'
assert percentile([30, 10, 20], 0) == 10, 'p0 should be the smallest value'
assert percentile(list(range(1, 21)), 95) == 19, 'p95 of 1..20 should be 19'
assert abs(capacity(20, 3, 8) - 181.818) < 0.01, 'batches of 8 at 20 + 3 * 8 ms: about 181.8 req/s'
assert abs(capacity(20, 3, 1) - 43.478) < 0.01, 'batches of 1: about 43.5 req/s'`,
};
