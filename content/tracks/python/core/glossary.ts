import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the Python course's core chapter. Merged with content/glossary.ts.
export default [
  {
    id: 'keyword-argument',
    term: 'Keyword argument',
    short: 'An argument passed by parameter name, such as scale=10, instead of by position.',
    long: 'Keyword arguments can come in any order and make calls readable. Positional arguments must come first, and a parameter after a bare * in the definition can only be passed by keyword.',
    introducedIn: 'python/core/functions-scope',
    aliases: ['kwarg', 'named argument'],
  },
  {
    id: 'variable-scope',
    term: 'Scope',
    short:
      'The region of code where a name can be looked up. Python searches local, enclosing, global, then built-in (LEGB).',
    long: 'Assigning to a name anywhere inside a function makes it local to that function for the whole body, unless the name is declared global or nonlocal.',
    introducedIn: 'python/core/functions-scope',
    aliases: ['LEGB', 'local variable', 'global variable'],
  },
  {
    id: 'type-hint',
    term: 'Type hint',
    short:
      'An annotation such as values: list[float] -> float that documents the expected types of a function.',
    long: 'Python does not check type hints when the code runs. Editors and tools such as mypy read them to catch mistakes before you run anything.',
    introducedIn: 'python/core/functions-scope',
    aliases: ['type annotation'],
  },
  {
    id: 'aliasing',
    term: 'Aliasing',
    short:
      'Two or more names referring to the same object, so a change made through one name is visible through the other.',
    introducedIn: 'python/core/references-mutability',
    aliases: ['alias'],
  },
  {
    id: 'mutable-object',
    term: 'Mutable object',
    short:
      'An object that can be changed in place after it is created, such as a list, dict, set or NumPy array.',
    long: 'Immutable objects (int, float, str, tuple) can never change; an operation on them makes a new object. Only mutable objects can surprise you through aliasing.',
    introducedIn: 'python/core/references-mutability',
    aliases: ['mutable', 'immutable', 'mutability'],
  },
  {
    id: 'shallow-copy',
    term: 'Shallow copy',
    short: 'A new outer container whose items are the same objects as the original’s items.',
    long: 'list(x), x.copy() and x[:] make shallow copies. copy.deepcopy(x) also copies every nested object, so nothing is shared.',
    introducedIn: 'python/core/references-mutability',
    aliases: ['deep copy', 'deepcopy'],
  },
  {
    id: 'iterator',
    term: 'Iterator',
    short:
      'An object that hands out the next value each time next() is called, and raises StopIteration when it has no more.',
    long: 'A for loop calls iter() on what it loops over and then next() until StopIteration. Lists can be looped over many times; an iterator is used up after one pass.',
    introducedIn: 'python/core/iterators-comprehensions',
    aliases: ['iterable'],
  },
  {
    id: 'comprehension',
    term: 'Comprehension',
    short:
      'A one-expression way to build a list, dict or set from a loop, such as [x * 2 for x in xs if x > 0].',
    introducedIn: 'python/core/iterators-comprehensions',
    aliases: ['list comprehension', 'dict comprehension'],
  },
  {
    id: 'generator',
    term: 'Generator',
    short:
      'A function containing yield, or an expression in parentheses, that produces values one at a time, only when asked.',
    long: 'A generator keeps its place between values, so it can stream a file far bigger than memory. Like every iterator, it can be consumed only once.',
    introducedIn: 'python/core/iterators-comprehensions',
    aliases: ['yield', 'generator expression'],
  },
  {
    id: 'python-class',
    term: 'Class',
    short:
      'A template for objects that bundles data (attributes) with the functions that act on it (methods).',
    long: 'Calling the class creates an instance and runs __init__ on it. Inside methods, self is that instance.',
    introducedIn: 'python/core/classes-dataclasses',
    aliases: ['class', 'instance', 'method', 'self'],
  },
  {
    id: 'dunder-method',
    term: 'Dunder method',
    short:
      'A method with double underscores, such as __len__ or __getitem__, that Python calls for built-in syntax like len(x) or x[i].',
    introducedIn: 'python/core/classes-dataclasses',
    aliases: ['magic method', 'special method'],
  },
  {
    id: 'dataclass',
    term: 'Dataclass',
    short:
      'A class decorated with @dataclass, which writes __init__, __repr__ and __eq__ for you from the annotated fields.',
    introducedIn: 'python/core/classes-dataclasses',
    aliases: ['@dataclass'],
  },
  {
    id: 'exception',
    term: 'Exception',
    short:
      'An object Python raises to signal an error, such as ValueError or KeyError. It stops the code unless a try/except catches it.',
    introducedIn: 'python/core/errors-files-environments',
    aliases: ['raise', 'try/except'],
  },
  {
    id: 'traceback',
    term: 'Traceback',
    short:
      'The report Python prints when an exception is not caught: the chain of calls that led to it, ending with the failing line and the error message.',
    introducedIn: 'python/core/errors-files-environments',
    aliases: ['stack trace'],
  },
  {
    id: 'context-manager',
    term: 'Context manager',
    short:
      'An object used with a with block that sets something up and is guaranteed to clean it up, for example closing a file, even if an error happens.',
    introducedIn: 'python/core/errors-files-environments',
    aliases: ['with statement'],
  },
  {
    id: 'virtual-environment',
    term: 'Virtual environment',
    short:
      'A folder with its own Python interpreter and installed packages, so each project can pin its own library versions.',
    introducedIn: 'python/core/errors-files-environments',
    aliases: ['venv', 'requirements.txt'],
  },
] satisfies GlossaryTerm[];
