import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'knee',
    type: 'choice',
    prompt:
      'In an open-loop ramp, the service keeps up at 450 requests per second, but at 600 most requests end up seconds late. What is happening?',
    options: [
      {
        text: 'The server is saturated: requests arrive faster than it can finish them, so a queue grows and every request waits in it',
        correct: true,
        explain:
          'Past the saturation point, extra load only adds waiting. Plan capacity well below the knee.',
      },
      {
        text: 'The load generator is broken, because latency should stay flat',
        correct: false,
        explain:
          'Rising latency near saturation is expected. A closed-loop generator would hide it, not an open-loop one.',
      },
      {
        text: 'The model became less accurate under load',
        correct: false,
        explain: 'Load changes timing, not the model’s arithmetic.',
      },
    ],
  },
  {
    id: 'average',
    type: 'choice',
    prompt: 'Why alert on p99 latency and error-budget burn instead of average latency?',
    options: [
      {
        text: 'Averages hide the slow and failing requests that a minority of users experience, and do not say how much of the allowed unreliability is being used',
        correct: true,
        explain:
          'An SLO states what users may expect; burn rate measures how fast you are departing from it.',
      },
      {
        text: 'Averages are harder to compute',
        correct: false,
        explain: 'They are easier, which is why they are tempting.',
      },
      {
        text: 'p99 is always higher, so alerts fire sooner',
        correct: false,
        explain: 'Firing sooner is not the goal; firing for incidents that matter is.',
      },
    ],
  },
  {
    id: 'spike',
    type: 'choice',
    prompt:
      'A 2-minute spike fails 20% of requests (0.9% of the monthly budget). The 1% threshold pages; the fast burn-rate rule does not. Which behavior do you want at 3 a.m.?',
    options: [
      {
        text: 'Usually the burn-rate rule: the spike is over before anyone can act, and it used under 1% of the budget; review it in working hours',
        correct: true,
        explain:
          'Pages should be for problems that need a human now. A dashboard and a daily report catch the rest.',
      },
      {
        text: 'The threshold rule, because any error spike needs a person immediately',
        correct: false,
        explain: 'Paging on every blip trains people to ignore pages.',
      },
      {
        text: 'Neither: errors under 50% never matter',
        correct: false,
        explain:
          'A 0.8% error rate for ten hours used 11.1% of the budget; small rates matter when they last.',
      },
    ],
  },
  {
    id: 'burn',
    type: 'numeric',
    prompt:
      'The SLO is 99.9% of requests succeeding over 30 days. For a full hour, 1.44% of requests fail. What share of the 30-day error budget did that hour use? (percent)',
    answer: 2,
    tolerance: 0.01,
    hint: 'Burn rate = 1.44% ÷ 0.1%. At burn rate 1, one hour uses 1/720 of a 30-day budget.',
    explain:
      'Burn rate 14.4 for 1 hour out of 720: 14.4 / 720 = 2%. That is why the fast rule uses 14.4 over 1 hour.',
  },
];

export const burnExercise: Exercise = {
  id: 'slo-burn',
  prompt:
    'Write `burn_alert(errors, requests, target, threshold, long_w, short_w)` that returns True when the error rate over the last `long_w` minutes and over the last `short_w` minutes both exceed `threshold` times the error budget. `errors` and `requests` are lists with one count per minute, newest last.',
  starter: `def burn_alert(errors, requests, target, threshold, long_w, short_w):
    pass`,
  hints: [
    'budget = 1 - target, for example 1 - 0.999 = 0.001.',
    'The rate over the last w minutes is sum(errors[-w:]) / sum(requests[-w:]).',
    'Return rate(long_w) / budget > threshold and rate(short_w) / budget > threshold.',
  ],
  solution: `def burn_alert(errors, requests, target, threshold, long_w, short_w):
    budget = 1 - target

    def rate(w):
        return sum(errors[-w:]) / sum(requests[-w:])

    return rate(long_w) / budget > threshold and rate(short_w) / budget > threshold`,
  explanation:
    'The long window makes the alert significant (enough budget is at stake); the short window makes it stop soon after the problem is fixed, instead of firing for the rest of the hour.',
  tests: `reqs = [10_000] * 60
quiet = [2] * 60
assert burn_alert(quiet, reqs, 0.999, 14.4, 60, 5) is False, '0.02% errors is well within budget'
outage = [2] * 30 + [500] * 30
assert burn_alert(outage, reqs, 0.999, 14.4, 60, 5) is True, '30 minutes at 5% burns fast enough'
fixed = [2] * 20 + [500] * 30 + [2] * 10
assert burn_alert(fixed, reqs, 0.999, 14.4, 60, 5) is False, 'once fixed, the short window stops the alert'`,
};
