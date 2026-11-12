import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'twice',
    type: 'choice',
    prompt: '`g = (x * x for x in [1, 2, 3])`. What does `print(sum(g), sum(g))` print?',
    options: [
      {
        text: '14 14',
        correct: false,
        explain: 'A list would give 14 twice; a generator is used up by the first sum.',
      },
      {
        text: '14 0',
        correct: true,
        explain:
          'The first sum consumes every value. The second finds nothing and returns 0, the sum of no numbers.',
      },
      {
        text: '14, then StopIteration',
        correct: false,
        explain: 'sum catches the end of the iterator itself, so no exception reaches you.',
      },
      {
        text: '0 14',
        correct: false,
        explain: 'Generators produce values on the first request; nothing is delayed until a second pass.',
      },
    ],
  },
  {
    id: 'comp',
    type: 'choice',
    prompt: 'Which comprehension gives the squares of the **even** numbers in `xs`?',
    options: [
      {
        text: '[x * x if x % 2 == 0 for x in xs]',
        correct: false,
        explain:
          'A trailing if after the for filters; an if before for needs an else and is a SyntaxError without one.',
      },
      {
        text: '[x * x for x in xs if x % 2]',
        correct: false,
        explain: 'x % 2 is 1 (truthy) for odd numbers, so this keeps the odd ones.',
      },
      {
        text: '[x * x for x in xs if x % 2 == 0]',
        correct: true,
        explain: 'The expression comes first, then the loop, then the filter.',
      },
    ],
  },
  {
    id: 'lazy',
    type: 'choice',
    prompt:
      'A generator function `parse(path)` opens a 50 GB file and yields one row at a time. What does `rows = parse("big.csv")` do?',
    options: [
      {
        text: 'Reads the whole file into memory',
        correct: false,
        explain: 'Calling a generator function runs none of its body.',
      },
      {
        text: 'Reads the first row only',
        correct: false,
        explain: 'Not even that: the body starts on the first next() call.',
      },
      {
        text: 'Creates a generator; no line is read yet',
        correct: true,
        explain: 'Work happens only as values are requested, one row at a time.',
      },
      {
        text: 'Raises an error because the file is too big',
        correct: false,
        explain: 'Streaming exists precisely so file size does not matter.',
      },
    ],
  },
  {
    id: 'zip',
    type: 'choice',
    prompt: 'What is `list(zip([1, 2, 3], ["a", "b"]))`?',
    options: [
      {
        text: "[(1, 'a'), (2, 'b'), (3, None)]",
        correct: false,
        explain: 'zip does not pad. itertools.zip_longest fills with None.',
      },
      {
        text: "[(1, 'a'), (2, 'b')]",
        correct: true,
        explain:
          'zip stops at the shortest input. Use zip(..., strict=True) to raise an error on a length mismatch instead.',
      },
      {
        text: 'ValueError: lengths differ',
        correct: false,
        explain: 'Only with strict=True. By default the extra item is silently dropped.',
      },
    ],
  },
  {
    id: 'sorted-key',
    type: 'numeric',
    prompt: 'What is `sorted([("a", 3), ("b", 1), ("c", 2)], key=lambda r: r[1])[0][1]`?',
    answer: 1,
    tolerance: 0,
    hint: 'The key sorts by the second item of each tuple, ascending.',
    explain: 'Sorted by the numbers, ("b", 1) comes first, and [0][1] is its number, 1.',
  },
];

export const batchesExercise: Exercise = {
  id: 'py-iterators-batches',
  prompt: 'Write a generator batches(items, size) that yields lists of up to size items.',
  starter: `def batches(items, size):
    # Must be a generator (use yield). The last batch may be shorter.
    return [items[i:i + size] for i in range(0, len(items), size)]`,
  hints: [
    'Keep a list called batch, append to it, and yield it when it reaches size.',
    'After the loop, yield what is left if it is not empty.',
    'Start a new list after each yield; do not clear the one you just yielded.',
  ],
  solution: `def batches(items, size):
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch`,
  explanation:
    'This works on any iterable, even an endless stream or a file, because it never needs len() or slicing. Rebinding batch = [] (instead of batch.clear()) keeps every yielded list intact.',
  tests: `import inspect
assert inspect.isgeneratorfunction(batches), "use yield"
assert list(batches([1, 2, 3, 4, 5], 2)) == [[1, 2], [3, 4], [5]]
assert list(batches(iter(range(4)), 2)) == [[0, 1], [2, 3]], "must accept any iterable"
assert list(batches([], 3)) == []`,
};
