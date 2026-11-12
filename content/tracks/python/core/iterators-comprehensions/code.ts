// Code for "Iterators, comprehensions and generators". Runnable examples were run with CPython 3.13 and
// their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The explorer's values were
// recorded by src/lib/pycourse/fixtures/iterators.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/iterators.json';
import type { CodeExample } from '@/lib/types';

const iters = fixture as RecordedFixture;
const SRC = iters.template;

export const experiment = recordedExperiment('py-iterators', iters, 'Expression');

export const iterCode: CodeExample = {
  id: 'py-iterators-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(iters),
  annotations: [
    {
      id: 'expr',
      ...span(SRC, 2, '{{expr}}'),
      kind: 'syntax',
      title: 'What data is',
      what: 'Square brackets build a whole list now. Parentheses build a generator that computes values only when asked. map and iter also return iterators.',
      why: 'Lists cost memory for every item; iterators cost almost none but can be read only once.',
      inputs: 'the expression chosen above',
    },
    {
      id: 'sum1',
      ...span(SRC, 3, 'sum(data)'),
      kind: 'function',
      title: 'The first pass',
      what: 'sum loops over data, asking for one value after another until there are none left.',
      why: 'For an iterator, this pass uses up every value.',
    },
    {
      id: 'sum2',
      ...span(SRC, 4, 'sum(data)'),
      kind: 'function',
      title: 'The second pass',
      what: 'A list, set, dict or range starts a fresh pass. An exhausted iterator has nothing left, so the sum is 0.',
      why: 'No error is raised, which is why this bug is easy to miss.',
    },
  ],
};

/** enumerate, zip, dict comprehensions, sorted with a key, any/all and nested comprehensions. */
export const toolsRunner: CodeExample = {
  id: 'py-iterators-tools',
  language: 'python',
  run: 'pyodide',
  source: `names = ["ada", "bo", "cy"]
scores = [0.91, 0.78, 0.85]

for i, name in enumerate(names, start=1):
    print(i, name)

pairs = list(zip(names, scores))
print(pairs)

by_name = {name: score for name, score in zip(names, scores)}
print(by_name)

ranked = sorted(by_name.items(), key=lambda kv: kv[1], reverse=True)
print(ranked[0])

print(any(s > 0.9 for s in scores), all(s > 0.8 for s in scores))

grid = [[r * 3 + c for c in range(3)] for r in range(2)]
print(grid)
flat = [x for row in grid for x in row]
print(flat)`,
  annotations: [],
  expectedOutput: `1 ada
2 bo
3 cy
[('ada', 0.91), ('bo', 0.78), ('cy', 0.85)]
{'ada': 0.91, 'bo': 0.78, 'cy': 0.85}
('ada', 0.91)
True False
[[0, 1, 2], [3, 4, 5]]
[0, 1, 2, 3, 4, 5]`,
};

/** A generator that streams and parses a file lazily. */
export const streamRunner: CodeExample = {
  id: 'py-iterators-stream',
  language: 'python',
  run: 'pyodide',
  source: `import io
from itertools import islice

raw = io.StringIO("id,amount\\n1,20\\n2,oops\\n3,35\\n4,15\\n")  # stands in for a huge file

def parse(lines):
    next(lines)                       # skip the header
    for line in lines:
        rid, amount = line.strip().split(",")
        if amount.isdigit():
            yield int(rid), int(amount)

rows = parse(raw)                     # nothing has been read yet
print(type(rows).__name__)
print(next(rows))
print(list(islice(rows, 2)))
print(list(rows))`,
  annotations: [],
  expectedOutput: `generator
(1, 20)
[(3, 35), (4, 15)]
[]`,
};

const GEN = `def countdown(n):
    while n > 0:
        yield n
        n -= 1

gen = countdown(3)
a = next(gen)
b = next(gen)
rest = list(gen)
print(a, b, rest)`;

/** A generator function, stepped through: it pauses at yield and resumes on the next request. */
export const countdownProgram: CodeExample = {
  id: 'py-iterators-countdown',
  language: 'python',
  run: 'pyodide',
  source: GEN,
  annotations: [
    {
      id: 'yield',
      ...span(GEN, 3, 'yield n'),
      kind: 'syntax',
      title: 'yield',
      what: 'Hands n to whoever asked and pauses the function right here, keeping its local variables.',
      why: 'The next request resumes on the line after yield. A return (or falling off the end) ends the generator.',
    },
    {
      id: 'call',
      ...span(GEN, 6, 'countdown(3)'),
      kind: 'function',
      title: 'Calling a generator function',
      what: 'Runs none of the body yet. It returns a generator object ready to start.',
      why: 'That is why a generator can describe an endless or huge sequence without computing it.',
    },
  ],
  expectedOutput: '3 2 [1]',
};
