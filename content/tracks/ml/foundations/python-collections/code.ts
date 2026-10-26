// Code for "Lists, dicts, indexing and slicing". Outputs were produced by running the code with CPython 3.13
// and with Pyodide 314.0.7 (Python 3.14.2); both print the same. The slice arithmetic is checked against
// CPython for every bound and step the experiment offers in src/lib/foundations/slicing.test.ts.
import { lineOf, span } from '@/lib/foundations/annotate';
import { sliceExperiment, sliceText, type SliceState } from '@/lib/foundations/slicing';
import type { CodeExample } from '@/lib/types';

/** One state: the list picture, the slice in the code and the readout read it. */
export const experiment = sliceExperiment('slice', { start: 1, stop: 6, step: 2 });

const st = (s: unknown) => s as SliceState;
const SLICE_SOURCE = `letters = ["a", "b", "c", "d", "e", "f", "g", "h"]
part = letters[{{slice}}]
print(part)
print(len(part))`;

export const sliceCode: CodeExample = {
  id: 'slice-code',
  language: 'python',
  source: SLICE_SOURCE,
  slots: { slice: (s) => sliceText(st(s).start, st(s).stop, st(s).step) },
  annotations: [
    {
      id: 'list',
      ...span(SLICE_SOURCE, 1, '["a", "b", "c", "d", "e", "f", "g", "h"]'),
      kind: 'syntax',
      title: 'A list literal',
      what: 'Square brackets with items separated by commas make a list: an ordered collection.',
      why: 'Lists keep their order, so every item has a position (index) starting at 0.',
      output: 'a list of 8 strings',
    },
    {
      id: 'brackets',
      ...span(SLICE_SOURCE, 2, 'letters[{{slice}}]'),
      kind: 'syntax',
      title: 'letters[start:stop:step]',
      what: 'A slice: a new list with the items from start up to, but not including, stop, taking every step-th one.',
      why: 'Slices pick out runs of items without a loop. Blank parts get defaults; out-of-range ones are clipped, never an error.',
      inputs: 'start, stop and step from the controls above (blank means default)',
      output: 'a new list; letters itself is unchanged',
    },
    {
      id: 'len',
      ...span(SLICE_SOURCE, lineOf(SLICE_SOURCE, 'len('), 'len(part)'),
      kind: 'function',
      title: 'len(part)',
      what: 'The number of items in the list.',
      why: 'For a step of 1, the length is stop − start (when that is positive).',
    },
  ],
};

/** Lists, dicts and sharing, in the browser with Pyodide. */
export const collectionsRunner: CodeExample = {
  id: 'collections-runner',
  language: 'python',
  run: 'pyodide',
  source: `letters = ["a", "b", "c", "d", "e", "f", "g", "h"]
print(letters[0], letters[-1], len(letters))
print(letters[2:5], letters[:3], letters[::2])

scores = [72, 45, 90]
scores.append(61)
scores[1] = 50
print(scores, sum(scores) / len(scores))

ages = {"Ada": 36, "Alan": 41}
ages["Grace"] = 85
print(ages["Alan"], len(ages))
for name, age in ages.items():
    print(name, age)
print("Linus" in ages, ages.get("Linus", 0))

a = [1, 2, 3]
b = a
b.append(4)
print(a)
c = a.copy()
c.append(5)
print(a, c)`,
  annotations: [],
  expectedOutput: `a h 8
['c', 'd', 'e'] ['a', 'b', 'c'] ['a', 'c', 'e', 'g']
[72, 50, 90, 61] 68.25
41 3
Ada 36
Alan 41
Grace 85
False 0
[1, 2, 3, 4]
[1, 2, 3, 4] [1, 2, 3, 4, 5]`,
};
