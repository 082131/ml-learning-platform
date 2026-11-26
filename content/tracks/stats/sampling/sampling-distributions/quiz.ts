import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'sd-vs-se',
    type: 'choice',
    prompt: 'You measure 400 support wait times: mean 19.6 min, SD 20 min. A manager asks "how precise is the 19.6?". Which number answers that?',
    options: [
      { text: 'The SD, 20 minutes', correct: false, explain: 'The SD describes how much single wait times differ from each other. It does not shrink with more data, so it cannot measure the precision of the mean.' },
      { text: 'The standard error, 20 / √400 = 1 minute', correct: true, explain: 'The SE is how much the sample mean would vary across different samples of 400. A different sample would typically give a mean within a minute or two of 19.6.' },
      { text: 'The variance, 400 minutes²', correct: false, explain: 'That is the SD squared: still about single waits, and in squared units.' },
    ],
  },
  {
    id: 'quadruple',
    type: 'numeric',
    prompt: 'A survey of 2,500 users estimates a mean with standard error 0.8. To get a standard error of 0.4, how many users do you need?',
    answer: 10000,
    tolerance: 0,
    hint: 'SE = σ / √n. Halving the SE means √n must double.',
    explain: '√n must double, so n must quadruple: 4 × 2,500 = 10,000. This is the diminishing return of sampling: each extra digit of precision costs 100 times the data.',
  },
  {
    id: 'pop-size',
    type: 'choice',
    prompt: 'Country A has 5 million voters, country B has 300 million. Both polls survey 1,000 random voters. Which poll is more precise?',
    options: [
      { text: 'A, because 1,000 is a bigger share of its population', correct: false, explain: 'The share sampled hardly matters when it is small. σ / √n has no population size in it.' },
      { text: 'About the same', correct: true, explain: 'For a random sample that is a small part of the population, precision depends on n (and σ), not on the population size. 1,000 random voters is about as informative in both countries.' },
      { text: 'B, because a bigger population averages out more', correct: false, explain: 'Only the sample is averaged. The 299 million voters you did not ask add nothing.' },
    ],
  },
  {
    id: 'what-varies',
    type: 'choice',
    prompt: 'In the explorer the histogram on the right gets narrower as n grows. What is it a histogram of?',
    options: [
      { text: 'All the values in one big sample', correct: false, explain: 'A histogram of raw values would keep the population’s width (its SD), however big the sample.' },
      { text: 'The means of 1,000 separate samples, each of size n', correct: true, explain: 'Each bar counts samples whose mean fell in that range. That distribution of a statistic is the sampling distribution, and its SD is the standard error.' },
      { text: 'The population', correct: false, explain: 'The population is the curve on the left. It does not change with n.' },
    ],
  },
  {
    id: 'biased-sample',
    type: 'choice',
    prompt: 'You estimate average session length from 50,000 sessions, all logged by the desktop app (mobile logging was broken). How does the huge n help?',
    options: [
      { text: 'It makes the estimate precise and accurate', correct: false, explain: 'Precise, yes: the SE is tiny. Accurate, no: every session comes from desktop users, who may behave differently.' },
      { text: 'It shrinks the random error, but not the bias from leaving out mobile users', correct: true, explain: 'σ / √n describes random sampling error only. A non-random sample can be precisely wrong; more of the same data does not fix it.' },
      { text: 'It does not help, because n must be at least 10% of all sessions', correct: false, explain: 'No such rule. The problem is who was sampled, not how many.' },
    ],
  },
];

export const seExercise: Exercise = {
  id: 'standard-error',
  prompt:
    'Write `standard_error(sample)` that estimates the standard error of the mean from a single sample: the sample SD (with n − 1) divided by √n. Then write `n_for_se(sigma, target)` that returns the smallest whole n with σ / √n ≤ target.',
  starter: `import math
import statistics

def standard_error(sample):
    return 0.0

def n_for_se(sigma, target):
    return 0`,
  hints: [
    'statistics.stdev uses n − 1. Divide it by math.sqrt(len(sample)).',
    'Solve σ / √n ≤ target for n: n ≥ (σ / target)². Round up with math.ceil.',
  ],
  solution: `import math
import statistics

def standard_error(sample):
    return statistics.stdev(sample) / math.sqrt(len(sample))

def n_for_se(sigma, target):
    return math.ceil((sigma / target) ** 2)`,
  explanation:
    'With one sample we do not know σ, so we plug in the sample SD. That is what every standard error printed by a library does. The second function shows the √n cost: halving the target quadruples n.',
  tests: `import math
assert abs(standard_error([2, 4, 4, 4, 5, 5, 7, 9]) - 2.138089935299395 / math.sqrt(8)) < 1e-12
assert abs(standard_error([10, 12]) - 1.0) < 1e-12
assert n_for_se(20, 1) == 400
assert n_for_se(20, 0.5) == 1600
assert n_for_se(10, 3) == 12`,
};
