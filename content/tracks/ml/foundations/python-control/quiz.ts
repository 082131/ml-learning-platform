import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'range-sum',
    type: 'numeric',
    prompt: '`total = 0`, then `for i in range(4): total += i`. What is `total` after the loop?',
    answer: 6,
    tolerance: 0,
    hint: '`range(4)` counts 0, 1, 2, 3: it stops before 4.',
    explain: '0 + 1 + 2 + 3 = 6. After the loop, i is still 3, because Python keeps the last value.',
  },
  {
    id: 'while-stop',
    type: 'numeric',
    prompt: '`n = 0`, then `while n < 10: n += 3`. What is `n` when the loop stops?',
    answer: 12,
    tolerance: 0,
    hint: 'The condition is checked before each pass: n goes 0, 3, 6, 9, then one more pass.',
    explain:
      'At n = 9 the condition 9 < 10 is still True, so the body runs once more and n becomes 12. Then 12 < 10 is False and the loop stops.',
  },
  {
    id: 'missing-return',
    type: 'choice',
    prompt: '`def double(x):` with the body `x * 2` (no return). What does `print(double(3))` print?',
    options: [
      {
        text: 'None',
        correct: true,
        explain:
          'The function computes 6 and throws it away. A function without a return statement returns None.',
      },
      {
        text: '6',
        correct: false,
        explain: 'Only return hands a value back to the caller. Computing x * 2 is not enough.',
      },
      {
        text: 'An error',
        correct: false,
        explain: 'It runs fine, which is what makes this mistake hard to spot: the result is silently None.',
      },
    ],
  },
  {
    id: 'scope',
    type: 'choice',
    prompt:
      'While grade() runs in the step-through, why are scores and passed missing from the variables panel?',
    options: [
      {
        text: 'Inside a function, only its own parameters and local variables are in its scope',
        correct: true,
        explain:
          'The panel shows the variables of the code that is running. Back in the loop, scores and passed reappear unchanged.',
      },
      {
        text: 'Calling a function deletes the other variables',
        correct: false,
        explain: 'They still exist; they are just not part of the function’s own scope.',
      },
      {
        text: 'The panel only shows numbers',
        correct: false,
        explain: 'It shows strings too, such as result = "pass".',
      },
    ],
  },
  {
    id: 'loop-order',
    type: 'order',
    prompt: 'For one score that passes, put what Python does in order.',
    items: [
      'for gives s the next score',
      'grade(s, pass_mark) checks score >= pass_mark',
      'grade returns "pass"',
      'result == "pass" is True, so passed += 1 runs',
    ],
    explain:
      'The loop picks the item, the call runs the function body, the return value lands in result, and the if decides whether to count it.',
  },
];

export const countExercise: Exercise = {
  id: 'count-above',
  prompt:
    'Write `count_above(values, limit)` that returns how many items of `values` are strictly greater than `limit`.',
  starter: `def count_above(values, limit):
    count = 0
    # Loop over values and add 1 for each one above limit.
    return count`,
  hints: [
    'Use `for v in values:` to visit each item.',
    'Inside the loop, `if v > limit:` then `count += 1`.',
    'Make sure `return count` is outside the loop (indented once, not twice), or the function stops after the first item.',
  ],
  solution: `def count_above(values, limit):
    count = 0
    for v in values:
        if v > limit:
            count += 1
    return count`,
  explanation:
    'This is the counter pattern from the grading loop. Strictly greater means 60 is not above 60, so `>` and not `>=`.',
  tests: `assert count_above([72, 45, 90, 61], 60) == 3, f'three scores are above 60, got {count_above([72, 45, 90, 61], 60)}'
assert count_above([60, 60], 60) == 0, '60 is not strictly greater than 60'
assert count_above([], 5) == 0, 'an empty list has no items above the limit'
assert count_above([1, 2, 3], 0) == 3, 'all three are above 0; is return inside the loop?'`,
};
