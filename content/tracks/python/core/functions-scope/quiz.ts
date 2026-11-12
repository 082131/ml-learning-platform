import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'bind-fill',
    type: 'choice',
    prompt:
      'With `def describe(values, fill=0, *, scale=1.0, **options)`, what is `fill` in the call `describe([1, None], unit="kg")`?',
    options: [
      {
        text: '"kg"',
        correct: false,
        explain:
          'unit is not a parameter name, so "kg" goes into options as {"unit": "kg"}; it never touches fill.',
      },
      {
        text: '0',
        correct: true,
        explain: 'The call passes no second positional argument and no fill=, so fill keeps its default, 0.',
      },
      {
        text: 'None',
        correct: false,
        explain:
          'None is an item inside the values list. Items of a list are never spread into other parameters.',
      },
      {
        text: 'It raises TypeError',
        correct: false,
        explain: 'Unknown keywords are allowed here because **options collects them.',
      },
    ],
  },
  {
    id: 'keyword-only',
    type: 'choice',
    prompt: 'Why does `describe([2, None, 7], 3, 10)` raise TypeError?',
    options: [
      {
        text: 'scale is keyword-only, so only 2 positional slots exist',
        correct: true,
        explain:
          'Parameters after the bare * accept only name=value. The third positional value has nowhere to go.',
      },
      {
        text: '10 is an int, and scale was declared as a float',
        correct: false,
        explain:
          'Defaults do not declare types; Python never checks that 10 matches 1.0. The message is about positions.',
      },
      {
        text: 'fill cannot be passed by position',
        correct: false,
        explain: 'fill comes before the *, so describe(values, 3) passes it by position just fine.',
      },
      {
        text: '**options does not accept integers',
        correct: false,
        explain: '**options collects keyword arguments of any type. It never receives positional values.',
      },
    ],
  },
  {
    id: 'mutable-default',
    type: 'choice',
    prompt:
      '`def add(x, acc=[]): acc.append(x); return acc`. What does the second call print in `print(add(1)); print(add(2))`?',
    options: [
      {
        text: '[2]',
        correct: false,
        explain:
          'That is what you would get if the default were created on every call, but it is created once.',
      },
      {
        text: '[2, 1]',
        correct: false,
        explain: 'append adds at the end, so the order is the order of the calls.',
      },
      {
        text: '[1, 2]',
        correct: true,
        explain:
          'The default list is created once, when def runs, and every call that omits acc shares and mutates it.',
      },
    ],
  },
  {
    id: 'unbound',
    type: 'choice',
    prompt:
      'At the top level `total = 0`; inside `def add(x):` the body is `total += x`. What happens when you call `add(5)`?',
    options: [
      {
        text: 'total becomes 5',
        correct: false,
        explain:
          'Only with `global total` inside the function. Without it, the assignment makes total local.',
      },
      {
        text: 'UnboundLocalError',
        correct: true,
        explain:
          'Because the body assigns total, total is local in the whole body; += reads it before it has a value.',
      },
      {
        text: 'A new local total of 5',
        correct: false,
        explain: 'total += x must read the old value first, and the local total does not have one yet.',
      },
      {
        text: 'NameError: total is not defined',
        correct: false,
        explain:
          'Python knows total is a local name here; its error type is UnboundLocalError, a subclass of NameError with its own message.',
      },
    ],
  },
  {
    id: 'hints',
    type: 'choice',
    prompt:
      'A function is declared as `def mean(xs: list[float]) -> float`. What happens on `mean(["a", "b"])`?',
    options: [
      {
        text: 'Python raises a TypeError before the body runs',
        correct: false,
        explain:
          'Python does not check type hints at run time. Any error comes from the body, for example from sum().',
      },
      {
        text: 'The hint converts the strings to floats',
        correct: false,
        explain: 'Hints never convert anything. They are only read by tools and by people.',
      },
      {
        text: 'The body runs; a checker like mypy would flag the call',
        correct: true,
        explain:
          'Hints are documentation that tools can check before you run the code. At run time they are ignored.',
      },
    ],
  },
  {
    id: 'order-binding',
    type: 'order',
    prompt: 'Put the steps Python follows to bind a call’s arguments in order.',
    items: [
      'Fill parameters from positional arguments, left to right',
      'Fill named parameters from keyword arguments',
      'Put leftover keywords in **kwargs, or raise TypeError if there is none',
      'Use defaults for parameters that are still empty',
      'Raise TypeError if a required parameter is still empty',
    ],
    explain:
      'Positional first, then keywords by name. Extra keywords go to **kwargs. Then defaults fill the gaps, and anything still missing is an error.',
  },
];

export const normalizeExercise: Exercise = {
  id: 'py-functions-normalize',
  prompt:
    'Write normalize(values, *, low=0.0, high=1.0) that rescales values linearly so the smallest becomes low and the largest becomes high.',
  starter: `def normalize(values, *, low=0.0, high=1.0):
    # Return a new list. low and high must be keyword-only.
    pass`,
  hints: [
    'Find lo = min(values) and hi = max(values) first.',
    'Each value v maps to low + (v - lo) / (hi - lo) * (high - low).',
    'The * in the signature already makes low and high keyword-only; keep it.',
  ],
  solution: `def normalize(values, *, low=0.0, high=1.0):
    lo, hi = min(values), max(values)
    out = []
    for v in values:
        out.append(low + (v - lo) / (hi - lo) * (high - low))
    return out`,
  explanation:
    'The keyword-only low and high make every call self-describing: normalize(xs, low=-1, high=1). Returning a new list leaves the caller’s data untouched.',
  tests: `assert normalize([2, 4, 6]) == [0.0, 0.5, 1.0], normalize([2, 4, 6])
assert normalize([2, 4, 6], low=-1, high=1) == [-1.0, 0.0, 1.0]
data = [10, 0, 5]
normalize(data)
assert data == [10, 0, 5], "normalize must not change its input"
try:
    normalize([1, 2], 0, 10)
except TypeError:
    pass
else:
    raise AssertionError("low and high must be keyword-only")`,
};
