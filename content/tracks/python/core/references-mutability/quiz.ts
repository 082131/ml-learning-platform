import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'iadd',
    type: 'choice',
    prompt: 'After `a = [1, 2]`, `b = a`, `b += [3]`, what is `a`?',
    options: [
      {
        text: '[1, 2]',
        correct: false,
        explain: 'That would be true for b = b + [3], which builds a new list. += on a list extends it in place.',
      },
      {
        text: '[1, 2, 3]',
        correct: true,
        explain: 'list += is in place (it calls extend), and a and b name the same list, so a sees the change.',
      },
      {
        text: '[1, 2, [3]]',
        correct: false,
        explain: 'extend adds the items of [3], not the list itself. append([3]) would nest it.',
      },
      {
        text: 'TypeError',
        correct: false,
        explain: 'Adding a list to a list is allowed; only list + int or similar mixes raise TypeError.',
      },
    ],
  },
  {
    id: 'shallow',
    type: 'choice',
    prompt: '`a = [[0], [1]]`, `b = a.copy()`, `b[0].append(9)`. What is `a`?',
    options: [
      {
        text: '[[0], [1]]',
        correct: false,
        explain: 'copy() copies only the outer list. b[0] and a[0] are still one inner list.',
      },
      {
        text: '[[0, 9], [1]]',
        correct: true,
        explain: 'A shallow copy shares its items. Appending through b[0] changes the inner list a[0] also names.',
      },
      {
        text: '[[0], [1], 9]',
        correct: false,
        explain: 'The append targets b[0], an inner list, not the outer list b, and certainly not a.',
      },
    ],
  },
  {
    id: 'rebinding',
    type: 'choice',
    prompt: 'Inside `def f(xs): xs = [0]`, the caller passes its list `data`. What happens to `data`?',
    options: [
      {
        text: 'It becomes [0]',
        correct: false,
        explain: 'Assignment rebinds the local name xs. No object is changed, so data keeps its value.',
      },
      {
        text: 'It is unchanged',
        correct: true,
        explain: 'xs = [0] makes the local name point at a new list. Only in-place changes such as xs[0] = 0 reach data.',
      },
      {
        text: 'It is emptied',
        correct: false,
        explain: 'Nothing calls clear() or deletes items. The function only rebinds a local name.',
      },
    ],
  },
  {
    id: 'is-vs-eq',
    type: 'choice',
    prompt: '`a = [1, 2]` and `b = [1, 2]` are made separately. What do `a == b` and `a is b` give?',
    options: [
      {
        text: 'True and True',
        correct: false,
        explain: 'Two list displays create two objects, so is is False even though the values match.',
      },
      {
        text: 'False and False',
        correct: false,
        explain: '== compares values, and both lists hold 1 and 2, so it is True.',
      },
      {
        text: 'True and False',
        correct: true,
        explain: 'Equal values, separate objects. Use == for values; use is mainly for None checks.',
      },
      {
        text: 'False and True',
        correct: false,
        explain: 'If two names were the same object, their values would have to be equal too.',
      },
    ],
  },
  {
    id: 'numpy-inplace',
    type: 'choice',
    prompt: '`w = np.zeros(3)`, `old = w`. Which line leaves `old` still all zeros?',
    options: [
      {
        text: 'w += 1',
        correct: false,
        explain: '+= on an array writes into the existing array, which old also names.',
      },
      {
        text: 'w[:] = 1',
        correct: false,
        explain: 'Slice assignment writes into the existing array: old changes too.',
      },
      {
        text: 'w = w + 1',
        correct: true,
        explain: 'w + 1 builds a new array and w is rebound to it. old still names the original zeros.',
      },
      {
        text: 'np.add(w, 1, out=w)',
        correct: false,
        explain: 'out=w tells NumPy to write the result into w’s existing memory, which old shares.',
      },
    ],
  },
];

export const scaleExercise: Exercise = {
  id: 'py-aliasing-scaled',
  prompt: 'Write scaled(rows, factor) that returns a scaled copy of a list of lists and leaves rows unchanged.',
  starter: `def scaled(rows, factor):
    out = rows.copy()
    for row in out:
        for j in range(len(row)):
            row[j] *= factor      # bug: these are still the caller's inner lists
    return out`,
  hints: [
    'rows.copy() is shallow: out[0] is rows[0].',
    'Build each inner list new, for example with list(row) or a loop that appends to a fresh list.',
  ],
  solution: `def scaled(rows, factor):
    out = []
    for row in rows:
        new_row = []
        for v in row:
            new_row.append(v * factor)
        out.append(new_row)
    return out`,
  explanation:
    'A shallow copy shares the inner lists, so scaling them in place changed the caller’s data. Building new inner lists keeps the input untouched; copy.deepcopy(rows) would also work.',
  tests: `data = [[1, 2], [3, 4]]
result = scaled(data, 10)
assert result == [[10, 20], [30, 40]], result
assert data == [[1, 2], [3, 4]], f"input was changed: {data}"
assert result[0] is not data[0], "inner lists must be new objects"`,
};
