// Code for "Classes, dataclasses and the data model". Runnable examples were run with CPython 3.13 and their
// output copied. The PyTorch example was run with PyTorch 2.14.1 on CPU (CPython 3.13); it does not run in
// the browser. content/tracks/python/python-outputs.test.ts re-runs all of them (PyTorch when TORCH_PYTHON
// is set).
import { lineOf, span } from '@/lib/foundations/annotate';
import type { CodeExample } from '@/lib/types';

const CLS = `class Readings:
    """A named series of sensor readings."""

    unit = "°C"                          # class attribute: shared by every instance

    def __init__(self, name, values):
        self.name = name                 # instance attributes: one per object
        self.values = list(values)

    def mean(self):
        return sum(self.values) / len(self.values)

    def __len__(self):
        return len(self.values)

    def __getitem__(self, i):
        return self.values[i]

    def __repr__(self):
        return f"Readings({self.name!r}, {len(self)} values)"

kitchen = Readings("kitchen", [21.5, 22.0, 23.1])
print(kitchen)
print(len(kitchen), kitchen[0], kitchen[-1])
print(round(kitchen.mean(), 2), kitchen.unit)
print([v for v in kitchen if v > 21.9])
print(Readings.mean(kitchen) == kitchen.mean())`;

/** A class with attributes, a method and the dunder methods that make it behave like a sequence. */
export const classProgram: CodeExample = {
  id: 'py-classes-readings',
  language: 'python',
  run: 'pyodide',
  source: CLS,
  annotations: [
    {
      id: 'class-attr',
      ...span(CLS, lineOf(CLS, 'unit = '), 'unit = "°C"'),
      kind: 'variable',
      title: 'A class attribute',
      what: 'Defined in the class body, so it lives on the class and every instance can read it.',
      why: 'Good for constants. A mutable class attribute (a list) would be shared by all instances, like a mutable default.',
    },
    {
      id: 'init',
      ...span(CLS, lineOf(CLS, 'def __init__'), 'def __init__(self, name, values):'),
      kind: 'function',
      title: '__init__',
      what: 'Runs when you call Readings(...). self is the new, still-empty object; __init__ fills in its attributes.',
      why: 'Every instance gets its own name and values.',
    },
    {
      id: 'copy',
      ...span(CLS, lineOf(CLS, 'self.values = list(values)'), 'list(values)'),
      kind: 'function',
      title: 'A defensive copy',
      what: 'Stores a new list rather than the caller’s list.',
      why: 'Without it, the object and the caller would share one list (aliasing, from the previous lesson).',
    },
    {
      id: 'len',
      ...span(CLS, lineOf(CLS, 'def __len__'), '__len__'),
      kind: 'function',
      title: '__len__',
      what: 'Python calls it for len(kitchen).',
      why: 'Datasets define it so a DataLoader knows how many examples there are.',
    },
    {
      id: 'getitem',
      ...span(CLS, lineOf(CLS, 'def __getitem__'), '__getitem__'),
      kind: 'function',
      title: '__getitem__',
      what: 'Python calls it for kitchen[i]. With it, a for loop also works: Python tries index 0, 1, 2, … until IndexError.',
      why: 'This pair, __len__ and __getitem__, is the whole contract of a PyTorch map-style Dataset.',
    },
    {
      id: 'repr',
      ...span(CLS, lineOf(CLS, 'def __repr__'), '__repr__'),
      kind: 'function',
      title: '__repr__',
      what: 'What print and the console show for the object. Without it you get <__main__.Readings object at 0x…>.',
      why: 'A good repr makes debugging and logs readable.',
    },
  ],
  expectedOutput: `Readings('kitchen', 3 values)
3 21.5 23.1
22.2 °C
[22.0, 23.1]
True`,
};

/** Dataclasses: generated __init__, __repr__ and __eq__, safe defaults, validation and frozen instances. */
export const dataclassRunner: CodeExample = {
  id: 'py-classes-dataclass',
  language: 'python',
  run: 'pyodide',
  source: `from dataclasses import asdict, dataclass, field

@dataclass
class RunConfig:
    name: str
    lr: float = 0.001
    epochs: int = 10
    tags: list[str] = field(default_factory=list)

    def __post_init__(self):
        if self.lr <= 0:
            raise ValueError(f"lr must be positive, got {self.lr}")

base = RunConfig("baseline")
fast = RunConfig("fast", lr=0.01, tags=["sweep"])
print(base)
print(fast == RunConfig("fast", lr=0.01, tags=["sweep"]))
print(asdict(fast))

@dataclass(frozen=True)
class Point:
    x: float
    y: float

p = Point(1.0, 2.0)
try:
    p.x = 5.0
except AttributeError as e:
    print(type(e).__name__, e)

try:
    RunConfig("bad", lr=0)
except ValueError as e:
    print("ValueError:", e)`,
  annotations: [],
  expectedOutput: `RunConfig(name='baseline', lr=0.001, epochs=10, tags=[])
True
{'name': 'fast', 'lr': 0.01, 'epochs': 10, 'tags': ['sweep']}
FrozenInstanceError cannot assign to field 'x'
ValueError: lr must be positive, got 0`,
};

/** The Dataset protocol in plain Python, with a tiny loader that batches it. */
export const datasetRunner: CodeExample = {
  id: 'py-classes-dataset',
  language: 'python',
  run: 'pyodide',
  source: `import random

class PairsDataset:
    """x -> 2x + 1, the shape of a PyTorch Dataset: __len__ and __getitem__."""

    def __init__(self, n):
        self.xs = list(range(n))

    def __len__(self):
        return len(self.xs)

    def __getitem__(self, i):
        x = self.xs[i]
        return x, 2 * x + 1

def simple_loader(dataset, batch_size, shuffle, seed=0):
    order = list(range(len(dataset)))
    if shuffle:
        random.Random(seed).shuffle(order)
    for start in range(0, len(order), batch_size):
        batch = [dataset[i] for i in order[start:start + batch_size]]
        xs, ys = zip(*batch)                # turn pairs into two tuples
        yield list(xs), list(ys)

ds = PairsDataset(5)
print(len(ds), ds[3])
for xs, ys in simple_loader(ds, batch_size=2, shuffle=False):
    print(xs, ys)`,
  annotations: [],
  expectedOutput: `5 (3, 7)
[0, 1] [1, 3]
[2, 3] [5, 7]
[4] [9]`,
};

/** The same dataset as a real torch Dataset with DataLoader. Recorded; PyTorch does not run in the browser. */
export const torchDataset: CodeExample = {
  id: 'py-classes-torch-dataset',
  language: 'python',
  source: `import torch
from torch.utils.data import DataLoader, Dataset

class PairsDataset(Dataset):
    def __init__(self, n):
        self.xs = torch.arange(n, dtype=torch.float32)

    def __len__(self):
        return len(self.xs)

    def __getitem__(self, i):
        x = self.xs[i]
        return x, 2 * x + 1

loader = DataLoader(PairsDataset(5), batch_size=2, shuffle=False)
for xs, ys in loader:
    print(xs, ys)`,
  annotations: [],
  expectedOutput: `tensor([0., 1.]) tensor([1., 3.])
tensor([2., 3.]) tensor([5., 7.])
tensor([4.]) tensor([9.])`,
};
