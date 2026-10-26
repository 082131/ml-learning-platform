import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the ML Foundations chapter (thread 4). Merged with content/glossary.ts.
export default [
  {
    id: 'rule-based-system',
    term: 'Rule-based system',
    short:
      'A program whose decisions follow rules a person wrote by hand, such as "spam if it contains free".',
    long: 'Rule-based systems are a classic form of AI. They need no training data, but someone must update the rules whenever the problem changes.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['hand-written rules', 'expert system'],
  },
  {
    id: 'generalization',
    term: 'Generalization',
    short: 'How well a trained model does on new examples it did not see during training.',
    long: 'A model can fit its training examples perfectly and still do badly on new ones. That is why models are always evaluated on examples kept out of training.',
    introducedIn: 'ml/foundations/what-is-ml',
  },
  {
    id: 'reinforcement-learning',
    term: 'Reinforcement learning (RL)',
    short:
      'Learning by trial and error: an agent takes actions, receives rewards, and learns which actions pay off.',
    long: 'There are no labeled answers. The agent learns from the rewards that follow its actions, which may arrive much later than the action that earned them.',
    introducedIn: 'ml/foundations/types-of-ml',
    aliases: ['RL'],
  },
  {
    id: 'variable',
    term: 'Variable',
    short:
      'A name that refers to a value, such as price = 2.5. Assigning again makes the name refer to a new value.',
    introducedIn: 'ml/foundations/python-basics',
  },
  {
    id: 'data-type',
    term: 'Type (data type)',
    short:
      'The kind of a value, which decides what you can do with it: int (whole number), float (decimal number), str (text), bool (True or False).',
    long: 'type(x) tells you the type of x. Operators depend on it: + adds two numbers but joins two strings, and mixing them raises TypeError.',
    introducedIn: 'ml/foundations/python-basics',
    aliases: ['type', 'int', 'float', 'str'],
  },
  {
    id: 'string',
    term: 'String (str)',
    short: 'Text in Python, written between quotes: "apples" or \'apples\'.',
    introducedIn: 'ml/foundations/python-basics',
    aliases: ['str', 'text'],
  },
  {
    id: 'python-function',
    term: 'Function (in code)',
    short:
      'A named, reusable block of code: def grade(score): ... runs when called as grade(72) and can return a value.',
    long: 'Parameters are the names in the def line; arguments are the values passed in a call. Variables created inside a function exist only while it runs.',
    introducedIn: 'ml/foundations/python-control',
    aliases: ['def', 'return'],
  },
  {
    id: 'loop',
    term: 'Loop',
    short:
      'Code that runs again and again: for repeats once per item of a list or range, while repeats as long as a condition is True.',
    introducedIn: 'ml/foundations/python-control',
    aliases: ['for loop', 'while loop', 'iteration'],
  },
  {
    id: 'python-list',
    term: 'List',
    short: 'An ordered, changeable collection in Python, written [72, 45, 90]. Items are numbered from 0.',
    introducedIn: 'ml/foundations/python-collections',
    aliases: ['list'],
  },
  {
    id: 'python-dict',
    term: 'Dictionary (dict)',
    short:
      'A collection of key-value pairs, written {"Ada": 36}, where you look values up by key instead of by position.',
    introducedIn: 'ml/foundations/python-collections',
    aliases: ['dict', 'mapping'],
  },
  {
    id: 'slice',
    term: 'Slice',
    short: 'A part of a sequence picked by start:stop:step, such as letters[1:6:2]. Stop is not included.',
    long: 'Blank parts take defaults (start of the list, end of the list, step 1), and out-of-range bounds are clipped rather than raising an error. NumPy arrays and pandas use the same notation.',
    introducedIn: 'ml/foundations/python-collections',
    aliases: ['slicing'],
  },
  {
    id: 'numpy-array',
    term: 'NumPy array',
    short: 'A grid of numbers of one type, with a shape, that NumPy can compute on in one step.',
    long: 'Unlike a Python list, every element has the same dtype and the elements sit side by side in memory, so NumPy processes them in compiled code. Pandas and most ML libraries are built on arrays like it.',
    introducedIn: 'ml/foundations/numpy-arrays',
    aliases: ['array', 'np.array'],
  },
  {
    id: 'dtype',
    term: 'dtype',
    short: 'The type every element of a NumPy array has, such as int64, int32 or float64.',
    long: 'The dtype fixes how many bytes each number takes and what it can hold. NumPy picks one when you create an array: whole numbers give an integer dtype, any decimal gives float64.',
    introducedIn: 'ml/foundations/numpy-arrays',
    aliases: ['data type of an array'],
  },
  {
    id: 'vectorization',
    term: 'Vectorization',
    short:
      'Writing a computation as operations on whole arrays instead of a Python loop over their elements.',
    long: 'prices * qty multiplies every pair at once. The loop still happens, but inside NumPy’s compiled code, which is much faster than the Python interpreter running it one item at a time.',
    introducedIn: 'ml/foundations/vectorization',
    aliases: ['vectorized', 'vectorize'],
  },
  {
    id: 'broadcasting',
    term: 'Broadcasting',
    short:
      'NumPy’s rule for combining arrays of different shapes: line the shapes up from the right; each axis must match or be 1.',
    long: 'Axes of size 1, and axes one array lacks, are stretched to match the other array without copying data. Two different sizes where neither is 1 raise "operands could not be broadcast together".',
    introducedIn: 'ml/foundations/vectorization',
    aliases: ['broadcast'],
  },
  {
    id: 'boolean-mask',
    term: 'Boolean mask',
    short:
      'An array of True and False, such as P > 10, used to pick the elements where it is True: P[P > 10].',
    introducedIn: 'ml/foundations/vectorization',
    aliases: ['mask', 'boolean indexing'],
  },
] satisfies GlossaryTerm[];
