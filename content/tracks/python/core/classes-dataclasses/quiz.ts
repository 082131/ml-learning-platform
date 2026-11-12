import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'self',
    type: 'choice',
    prompt: 'In `kitchen.mean()`, what is `self` inside `mean`?',
    options: [
      {
        text: 'The Readings class',
        correct: false,
        explain: 'self is the instance. The class is type(self), or Readings itself.',
      },
      {
        text: 'The kitchen object',
        correct: true,
        explain:
          'kitchen.mean() is shorthand for Readings.mean(kitchen); the instance is passed as the first argument.',
      },
      {
        text: 'A copy of kitchen',
        correct: false,
        explain:
          'Nothing is copied: self is another name for the same object, so changes through self are visible on kitchen.',
      },
      {
        text: 'Nothing; mean has no arguments',
        correct: false,
        explain:
          'Methods receive the instance automatically as their first parameter, by convention named self.',
      },
    ],
  },
  {
    id: 'for-getitem',
    type: 'choice',
    prompt:
      'A class defines only `__getitem__` (returning `self.values[i]`), no `__iter__`. What does `for v in obj:` do?',
    options: [
      {
        text: 'TypeError: object is not iterable',
        correct: false,
        explain: 'Python falls back to the old sequence protocol when __getitem__ exists.',
      },
      {
        text: 'Calls obj[0], obj[1], … until IndexError',
        correct: true,
        explain: 'That fallback is why a list-backed __getitem__ makes the object loopable.',
      },
      {
        text: 'Loops forever',
        correct: false,
        explain: 'Only if __getitem__ never raises IndexError. Indexing a list past its end does raise it.',
      },
    ],
  },
  {
    id: 'dataclass-eq',
    type: 'choice',
    prompt: 'With `@dataclass class P: x: int`, what is `P(1) == P(1)`?',
    options: [
      {
        text: 'False',
        correct: false,
        explain:
          'That is the default for a plain class (it compares identity), but @dataclass writes an __eq__ that compares fields.',
      },
      {
        text: 'True',
        correct: true,
        explain: 'The generated __eq__ compares the fields in order, and both have x == 1.',
      },
      {
        text: 'TypeError',
        correct: false,
        explain: 'Comparing two instances of the same dataclass is always allowed.',
      },
    ],
  },
  {
    id: 'mutable-field',
    type: 'choice',
    prompt: 'Why does `@dataclass class C: items: list = []` fail when the class is defined?',
    options: [
      {
        text: 'Fields cannot have type list',
        correct: false,
        explain: 'list fields are fine; the problem is the shared default object.',
      },
      {
        text: 'A mutable default would be shared by every instance',
        correct: true,
        explain:
          'The dataclass decorator refuses it with ValueError and tells you to use field(default_factory=list).',
      },
      {
        text: 'Defaults must come before fields without defaults',
        correct: false,
        explain: 'That is a different rule. Here there is only one field.',
      },
      {
        text: 'Class bodies cannot contain assignments',
        correct: false,
        explain: 'Class bodies can assign; that is how class attributes and defaults are written.',
      },
    ],
  },
  {
    id: 'torch-protocol',
    type: 'choice',
    prompt:
      'What must a map-style `torch.utils.data.Dataset` subclass implement for a DataLoader to batch it?',
    options: [
      {
        text: '__iter__ and __next__',
        correct: false,
        explain: 'Those make an iterable-style dataset. A map-style dataset is indexed.',
      },
      {
        text: '__len__ and __getitem__',
        correct: true,
        explain:
          'The DataLoader asks for len(ds) to build indices, then calls ds[i] for each index in a batch.',
      },
      {
        text: 'forward and backward',
        correct: false,
        explain: 'Those belong to models and autograd, not datasets.',
      },
    ],
  },
];

export const vocabExercise: Exercise = {
  id: 'py-classes-vocab',
  prompt: 'Write a Vocabulary class that assigns each new token the next integer id.',
  starter: `class Vocabulary:
    def __init__(self):
        self.ids = {}

    def add(self, token):
        pass

    # add __len__, __getitem__ and __contains__`,
  hints: [
    'add(token): if the token is new, store it with id len(self.ids). Return its id either way.',
    '__getitem__(token) returns self.ids[token]; __contains__(token) returns token in self.ids.',
    '__len__ returns how many tokens are stored.',
  ],
  solution: `class Vocabulary:
    def __init__(self):
        self.ids = {}

    def add(self, token):
        if token not in self.ids:
            self.ids[token] = len(self.ids)
        return self.ids[token]

    def __len__(self):
        return len(self.ids)

    def __getitem__(self, token):
        return self.ids[token]

    def __contains__(self, token):
        return token in self.ids`,
  explanation:
    'Three dunder methods make the object work with len(), v["cat"] and "cat" in v, exactly like the built-in containers. Tokenizers keep a table like this one.',
  tests: `v = Vocabulary()
assert v.add("cat") == 0 and v.add("dog") == 1 and v.add("cat") == 0
assert len(v) == 2, len(v)
assert v["dog"] == 1
assert "cat" in v and "emu" not in v
try:
    v["emu"]
except KeyError:
    pass
else:
    raise AssertionError("unknown tokens should raise KeyError")`,
};
