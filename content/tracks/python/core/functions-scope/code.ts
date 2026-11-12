// Code for "Functions in depth". Every runnable example was run with CPython 3.13 and its output copied;
// content/tracks/python/python-outputs.test.ts re-runs them. The binding explorer's values were recorded
// by src/lib/pycourse/fixtures/functions_bind.py (inspect.signature(...).bind on each call).
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/functions_bind.json';
import type { CodeExample } from '@/lib/types';

const bind = fixture as RecordedFixture;
const BIND = bind.template;

export const experiment = recordedExperiment('py-functions-bind', bind, 'Call');

export const bindCode: CodeExample = {
  id: 'py-functions-bind-code',
  language: 'python',
  source: BIND,
  slots: recordedSlots(bind),
  annotations: [
    {
      id: 'values',
      ...span(BIND, 1, 'values'),
      kind: 'parameter',
      title: 'values: a required parameter',
      what: 'No default value, so every call must supply it, by position or as values=...',
      why: 'Required parameters come first; Python fills them from the call’s positional arguments, left to right.',
    },
    {
      id: 'fill',
      ...span(BIND, 1, 'fill=0'),
      kind: 'parameter',
      title: 'fill=0: a parameter with a default',
      what: 'If the call does not pass fill, it is 0. It can be passed by position (the second argument) or by name.',
      why: 'Defaults let a function have many options while the common call stays short, as in pd.read_csv.',
    },
    {
      id: 'star',
      ...span(BIND, 1, '*,'),
      kind: 'syntax',
      title: 'A bare *',
      what: 'Every parameter after it is keyword-only: it can be passed by name but never by position.',
      why: 'describe(r, 3, 10) would be ambiguous to a reader. Forcing scale=10 makes the call say what 10 means.',
    },
    {
      id: 'kwargs',
      ...span(BIND, 1, '**options'),
      kind: 'syntax',
      title: '**options',
      what: 'Collects every keyword argument that no other parameter claims into a dict.',
      why: 'Libraries use it to pass settings through to another function, for example plotting style options.',
      output: 'a dict, {} when there are no extra keywords',
    },
    {
      id: 'ternary',
      ...span(BIND, 4, 'fill if v is None else v'),
      kind: 'syntax',
      title: 'A conditional expression',
      what: 'Gives fill when v is None, otherwise v itself.',
      why: 'None marks a missing reading here; fill decides what a missing reading counts as.',
    },
    {
      id: 'return-tuple',
      ...span(BIND, 5, 'return round(total / len(values) * scale, 2), options'),
      kind: 'syntax',
      title: 'Returning two values',
      what: 'A comma makes a tuple, so the function returns (mean, options).',
      why: 'The caller unpacks it in one line: mean, options = describe(...).',
    },
    {
      id: 'call',
      ...span(BIND, 7, '{{args}}'),
      kind: 'variable',
      title: 'The arguments of the call',
      what: 'Python binds them to parameters: positional ones left to right, then keyword ones by name, then defaults for anything left.',
      why: 'A value that matches no parameter, or two values for one parameter, raises TypeError before the body runs.',
      inputs: 'the call chosen above',
    },
  ],
};

/** The mutable default trap, run in the browser. */
export const defaultsRunner: CodeExample = {
  id: 'py-functions-defaults',
  language: 'python',
  run: 'pyodide',
  source: `def add_reading(value, readings=[]):
    readings.append(value)
    return readings

print(add_reading(1))
print(add_reading(2))          # the same list as the first call
print(add_reading.__defaults__)

def add_reading_fixed(value, readings=None):
    if readings is None:
        readings = []          # a new list on every call
    readings.append(value)
    return readings

print(add_reading_fixed(1))
print(add_reading_fixed(2))`,
  annotations: [],
  expectedOutput: `[1]
[1, 2]
([1, 2],)
[1]
[2]`,
};

const SCOPE = `threshold = 10                 # global

def count_high(values):
    count = 0                  # local to count_high
    for v in values:
        if v > threshold:      # not assigned here, so Python reads the global
            count += 1
    return count

def make_scaler(factor):
    def scale(x):
        return x * factor      # factor comes from the enclosing function
    return scale

high = count_high([5, 12, 30])
double = make_scaler(2)
doubled = double(21)
print(high, doubled)`;

/** Local, enclosing and global names; step through it to watch each scope's variables. */
export const scopeProgram: CodeExample = {
  id: 'py-functions-scope',
  language: 'python',
  run: 'pyodide',
  source: SCOPE,
  annotations: [
    {
      id: 'global',
      ...span(SCOPE, 1, 'threshold = 10'),
      kind: 'variable',
      title: 'A global variable',
      what: 'Assigned at the top level of the file, so every function in the file can read it.',
      why: 'Reading globals is fine for constants. Changing them from inside functions makes code hard to follow.',
    },
    {
      id: 'local',
      ...span(SCOPE, 4, 'count = 0'),
      kind: 'variable',
      title: 'A local variable',
      what: 'Created fresh each time count_high runs and gone when it returns.',
      why: 'Because count is assigned inside the function, every use of count in the body means this local one.',
    },
    {
      id: 'closure',
      ...span(SCOPE, 12, 'factor'),
      kind: 'variable',
      title: 'An enclosing variable',
      what: 'scale is defined inside make_scaler, so it can read make_scaler’s factor, even after make_scaler has returned.',
      why: 'This is a closure. Learning-rate schedules and callbacks in ML libraries are often built this way.',
    },
  ],
  expectedOutput: '2 42',
};

/** *args, **kwargs, unpacking with * and **, and a lambda as a sort key. */
export const argsRunner: CodeExample = {
  id: 'py-functions-args',
  language: 'python',
  run: 'pyodide',
  source: `def log_metrics(step, *values, sep=" | ", **tags):
    text = sep.join(f"{v:.2f}" for v in values)
    print(f"step {step}: {text} {tags}")

log_metrics(1, 0.912, 0.48)
log_metrics(2, 0.95, 0.31, 0.2, sep=", ", run="baseline")

row = [3, 0.97, 0.25]
log_metrics(*row)              # * spreads a list into positional arguments
config = {"sep": " / ", "split": "val"}
log_metrics(4, 0.5, 0.2, **config)  # ** spreads a dict into keyword arguments

records = [("b", 3), ("a", 9), ("c", 1)]
print(sorted(records, key=lambda r: r[1]))`,
  annotations: [],
  expectedOutput: `step 1: 0.91 | 0.48 {}
step 2: 0.95, 0.31, 0.20 {'run': 'baseline'}
step 3: 0.97 | 0.25 {}
step 4: 0.50 / 0.20 {'split': 'val'}
[('c', 1), ('b', 3), ('a', 9)]`,
};
