// Code for "Python: values, variables, types, printing". Outputs were produced by running the code with
// CPython 3.13 and with Pyodide 314.0.7 (Python 3.14.2); both print the same. The computed step-through is
// checked line by line against CPython's own tracer in src/lib/foundations/pythonBasics.test.ts.
import { lineOf, span } from '@/lib/foundations/annotate';
import {
  BASICS_SOURCE,
  basicsExperiment,
  basicsSlots,
  type BasicsState,
} from '@/lib/foundations/pythonBasics';
import type { CodeExample } from '@/lib/types';

const PROGRAM_ID = 'basics-program';

/** One state for the lesson: the code literals, the step-through and the readout read it. */
export const experiment = basicsExperiment('basics', { item: 'apples', price: 2.5, quantity: 3 }, PROGRAM_ID);

const st = (s: unknown) => s as BasicsState;
const src = BASICS_SOURCE;
const L = {
  total: lineOf(src, 'total = '),
  label: lineOf(src, 'label = '),
  print: lineOf(src, 'print(label'),
  type: lineOf(src, 'print(type'),
};

export const basicsProgram: CodeExample = {
  id: PROGRAM_ID,
  language: 'python',
  source: src,
  slots: Object.fromEntries(
    ['item', 'price', 'quantity'].map((name) => [name, (s: unknown) => basicsSlots(st(s))[name]!]),
  ),
  annotations: [
    {
      id: 'item',
      ...span(src, 1, 'item'),
      kind: 'variable',
      title: 'item',
      what: 'A variable: a name that refers to a value. From this line on, item means this text.',
      why: 'Names let you reuse a value and say what it means. Python creates the variable the first time you assign to it.',
    },
    {
      id: 'assign',
      ...span(src, 1, '='),
      kind: 'syntax',
      title: '= (assignment)',
      what: 'Makes the name on the left refer to the value on the right.',
      why: 'It is not an equation: x = x + 1 is fine in Python and means "make x one bigger". Comparing uses ==.',
    },
    {
      id: 'str',
      ...span(src, 1, '"{{item}}"'),
      kind: 'parameter',
      title: 'A string (str)',
      what: 'Text between quotes. Filled from the item box above.',
      why: 'The quotes tell Python this is text, not a variable name. Single and double quotes mean the same.',
      output: "type str, for example 'apples'",
    },
    {
      id: 'float',
      ...span(src, 2, '{{price}}'),
      kind: 'parameter',
      title: 'A float',
      what: 'A number with a decimal point. Filled from the price slider.',
      why: 'Prices have fractions. 3.0 is a float too: the decimal point decides the type, not the value.',
      output: 'type float',
    },
    {
      id: 'int',
      ...span(src, 3, '{{quantity}}'),
      kind: 'parameter',
      title: 'An int',
      what: 'A whole number written without a decimal point.',
      why: 'Counts are whole numbers. Python ints have no size limit.',
      output: 'type int',
    },
    {
      id: 'times',
      ...span(src, L.total, '*'),
      kind: 'math',
      title: '* (multiply)',
      what: 'Multiplies the two numbers.',
      why: 'A float times an int gives a float, so total is a float even when the result is whole.',
      inputs: 'price (float), quantity (int)',
      output: 'total (float)',
    },
    {
      id: 'concat',
      ...span(src, L.label, '+'),
      kind: 'math',
      title: '+ on strings',
      what: 'Joins two strings end to end ("concatenation").',
      why: 'On numbers + adds; on strings it joins. Mixing a str and an int with + is an error, which is why str() comes first.',
    },
    {
      id: 'str-call',
      ...span(src, L.label, 'str(quantity)'),
      kind: 'function',
      title: 'str(quantity)',
      what: 'Converts the int to its text form, for example 3 to "3".',
      why: '"apples x" + 3 would raise TypeError: can only concatenate str (not "int") to str.',
    },
    {
      id: 'print',
      ...span(src, L.print, 'print'),
      kind: 'function',
      title: 'print(...)',
      what: 'Writes its values to the output, separated by spaces, then starts a new line.',
      why: 'Printing is how you see what a program computed. Strings print without their quotes.',
    },
    {
      id: 'type',
      ...span(src, L.type, 'type(price)'),
      kind: 'function',
      title: 'type(value)',
      what: "Returns the value's type, which prints as <class 'float'>.",
      why: 'When a result surprises you, checking its type is a quick first step.',
    },
  ],
};

/** A playground for the learner. Runs in the browser with Pyodide. */
export const basicsRunner: CodeExample = {
  id: 'basics-runner',
  language: 'python',
  run: 'pyodide',
  source: `a = 7
b = 2
print(a / b, a // b, a % b)
print(type(a / b), type(a // b))

name = "Ada"
print("Hello, " + name + "!")
print(f"{name} has {a} apples and {b} pears")
print(len(name), name.upper())

print(0.1 + 0.2)
print(round(0.1 + 0.2, 2))`,
  annotations: [],
  expectedOutput: `3.5 3 1
<class 'float'> <class 'int'>
Hello, Ada!
Ada has 7 apples and 2 pears
3 ADA
0.30000000000000004
0.3`,
};

/** Experiment settings as variables, for the practice section. Prints the line quoted in the lesson. */
export const settingsExample: CodeExample = {
  id: 'basics-settings',
  language: 'python',
  run: 'pyodide',
  source: `learning_rate = 0.01
epochs = 20
model_name = "spam-filter"
print(f"Training {model_name} for {epochs} epochs at lr={learning_rate}")`,
  annotations: [],
  expectedOutput: 'Training spam-filter for 20 epochs at lr=0.01',
};
