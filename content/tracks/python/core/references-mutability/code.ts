// Code for "Names, objects and mutability". Runnable examples were run with CPython 3.13 (NumPy 2.5) and
// their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The object explorer's
// groups were recorded by src/lib/pycourse/fixtures/aliasing.py, which compares objects with `is`.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/aliasing.json';
import type { CodeExample } from '@/lib/types';

const alias = fixture as RecordedFixture;
const SRC = alias.template;

export const experiment = recordedExperiment('py-aliasing', alias, 'Operation');

export const aliasCode: CodeExample = {
  id: 'py-aliasing-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(alias),
  annotations: [
    {
      id: 'nested',
      ...span(SRC, 4, 'a = [row, [5, 6]]'),
      kind: 'variable',
      title: 'A list that holds other lists',
      what: 'a holds references to two list objects. The first is the very object row names, not a copy of it.',
      why: 'Containers store references. That is why a change through row shows up in a[0].',
    },
    {
      id: 'setup',
      ...span(SRC, 5, '{{setup}}'),
      kind: 'syntax',
      title: 'How b is made',
      what: 'b = a binds a second name to the same object. a.copy() makes a new outer list holding the same inner lists. copy.deepcopy(a) copies the inner lists too.',
      why: 'Which one you pick decides what a later change can reach.',
      inputs: 'the operation chosen above',
    },
    {
      id: 'change',
      ...span(SRC, 6, '{{change}}'),
      kind: 'syntax',
      title: 'The change',
      what: 'append and += change a list in place. b = ... rebinds the name b to another object and changes no object at all.',
      why: 'Only in-place changes are visible through other names.',
    },
    {
      id: 'is',
      ...span(SRC, 9, 'a is b'),
      kind: 'syntax',
      title: 'is: the same object?',
      what: 'True when both names refer to one object. == only asks whether the values are equal.',
      why: 'Two lists can be equal and still be separate objects; is tells them apart.',
      output: 'True or False',
    },
  ],
};

/** Functions that change their argument, immutable values, and a tuple holding a list. */
export const functionsRunner: CodeExample = {
  id: 'py-aliasing-functions',
  language: 'python',
  run: 'pyodide',
  source: `def drop_negatives(values):
    values.sort()                       # changes the caller's list in place
    return [v for v in values if v >= 0]

def drop_negatives_safe(values):
    return [v for v in sorted(values) if v >= 0]   # sorted() builds a new list

readings = [3, -1, 2]
print(drop_negatives_safe(readings), readings)
print(drop_negatives(readings), readings)

x = 10
y = x
y += 1                                  # ints are immutable: y now names a new object
print(x, y)

name = "relu"
upper = name.upper()                    # str methods return new strings
print(name, upper)

t = ([1], 2)
t[0].append(9)                          # the tuple cannot change, the list inside it can
print(t)`,
  annotations: [],
  expectedOutput: `[2, 3] [3, -1, 2]
[2, 3] [-1, 2, 3]
10 11
relu RELU
([1, 9], 2)`,
};

/** The same aliasing with a NumPy array, where in-place operators are common. */
export const numpyRunner: CodeExample = {
  id: 'py-aliasing-numpy',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

weights = np.array([0.5, 1.5, 2.5])
backup = weights                # an alias, not a backup
weights *= 2                    # in place: the one array changes
print(backup)

weights = np.array([0.5, 1.5, 2.5])
backup = weights.copy()         # a real, separate copy
weights *= 2
print(backup, weights)

weights = weights * 2           # not in place: builds a new array and rebinds the name
print(backup is weights, np.shares_memory(backup, weights))`,
  annotations: [],
  expectedOutput: `[1. 3. 5.]
[0.5 1.5 2.5] [1. 3. 5.]
False False`,
};
