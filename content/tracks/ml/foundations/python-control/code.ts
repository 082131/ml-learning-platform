// Code for "Functions, conditions, loops". Outputs were produced by running the code with CPython 3.13 and
// with Pyodide 314.0.7 (Python 3.14.2); both print the same. The computed step-through of the grading loop is
// checked line by line against CPython's tracer in src/lib/foundations/pythonControl.test.ts.
import { lineOf, span } from '@/lib/foundations/annotate';
import {
  CONTROL_SOURCE,
  controlExperiment,
  controlSlots,
  type ControlState,
} from '@/lib/foundations/pythonControl';
import type { CodeExample } from '@/lib/types';

const PROGRAM_ID = 'grading-loop';

/** One state for the lesson: the code literals, the computed step-through and the readout read it. */
export const experiment = controlExperiment(
  'grading',
  { scores: '72, 45, 90, 61', passMark: 60 },
  PROGRAM_ID,
);

const st = (s: unknown) => s as ControlState;
const src = CONTROL_SOURCE;
const L = {
  if: lineOf(src, 'if score >='),
  ret: lineOf(src, 'return "pass"'),
  fail: lineOf(src, 'return "fail"'),
  for: lineOf(src, 'for s in scores:'),
  call: lineOf(src, 'result = grade('),
  check: lineOf(src, 'if result =='),
  add: lineOf(src, 'passed += 1'),
  print: lineOf(src, 'print(passed'),
};

export const gradingLoop: CodeExample = {
  id: PROGRAM_ID,
  language: 'python',
  source: src,
  slots: Object.fromEntries(
    ['scores', 'pass_mark'].map((name) => [name, (s: unknown) => controlSlots(st(s))[name]!]),
  ),
  annotations: [
    {
      id: 'def',
      ...span(src, 1, 'def grade(score, pass_mark):'),
      kind: 'syntax',
      title: 'def grade(score, pass_mark):',
      what: 'Defines a function named grade with two parameters. The indented lines below are its body.',
      why: 'A function gives a piece of logic a name, so the loop can reuse it for every score.',
      inputs: 'score and pass_mark: whatever values a call passes in',
    },
    {
      id: 'compare',
      ...span(src, L.if, 'score >= pass_mark'),
      kind: 'math',
      title: 'score >= pass_mark',
      what: 'A comparison: True when score is at least pass_mark, otherwise False.',
      why: 'if runs its indented block only when the condition is True.',
      output: 'a bool',
    },
    {
      id: 'return',
      ...span(src, L.ret, 'return'),
      kind: 'syntax',
      title: 'return',
      what: 'Ends the function and hands the value back to the caller.',
      why: 'Once a return runs, nothing after it in the function runs, so the second return acts as "otherwise".',
    },
    {
      id: 'indent',
      range: { line: L.fail },
      kind: 'syntax',
      title: 'Indentation',
      what: 'This return is indented once (inside the function) but not twice (not inside the if).',
      why: 'Python uses indentation, not braces, to decide which lines belong to which block.',
    },
    {
      id: 'scores',
      ...span(src, lineOf(src, 'scores = '), '{{scores}}'),
      kind: 'parameter',
      title: 'scores',
      what: 'A list of whole numbers, filled from the scores box below.',
      why: 'The for loop runs its body once per item of this list.',
    },
    {
      id: 'for',
      ...span(src, L.for, 'for s in scores:'),
      kind: 'syntax',
      title: 'for s in scores:',
      what: 'Repeats the indented block once per item, with s naming the current item.',
      why: 'Loops let one block of code handle any number of values.',
    },
    {
      id: 'call',
      ...span(src, L.call, 'grade(s, pass_mark)'),
      kind: 'function',
      title: 'grade(s, pass_mark)',
      what: 'Calls the function: score becomes s and pass_mark becomes pass_mark inside it, its body runs, and the call is replaced by what it returns.',
      why: 'The step-through shows the jump into grade() and back.',
      output: '"pass" or "fail"',
    },
    {
      id: 'eq',
      ...span(src, L.check, '=='),
      kind: 'math',
      title: '== (equals)',
      what: 'Compares two values and gives True or False.',
      why: 'One = assigns; two == compares. if result = "pass" is a SyntaxError.',
    },
    {
      id: 'plus-eq',
      ...span(src, L.add, '+='),
      kind: 'syntax',
      title: '+=',
      what: 'passed += 1 is short for passed = passed + 1.',
      why: 'A counter that grows inside a loop is one of the most common patterns in code.',
    },
    {
      id: 'len',
      ...span(src, L.print, 'len(scores)'),
      kind: 'function',
      title: 'len(scores)',
      what: 'The number of items in the list.',
      why: 'So the message says "3 of 4" for any number of scores.',
    },
  ],
};

/** A while loop recorded in Pyodide when the learner asks: a real trace, not a computed one. */
export const compoundLoop: CodeExample = {
  id: 'compound-while',
  language: 'python',
  run: 'pyodide',
  source: `balance = 100
years = 0
while balance < 150:
    balance = balance * 1.1
    years += 1
print(years, round(balance, 2))`,
  annotations: [],
  expectedOutput: '5 161.05',
};

/** Functions, for, range and while together. Runs in the browser with Pyodide. */
export const controlRunner: CodeExample = {
  id: 'control-runner',
  language: 'python',
  run: 'pyodide',
  source: `def describe(n):
    if n % 2 == 0:
        return "even"
    else:
        return "odd"

for n in range(1, 6):
    print(n, describe(n))

total = 0
for n in range(1, 101):
    total += n
print("1 + 2 + ... + 100 =", total)

countdown = 3
while countdown > 0:
    print("countdown", countdown)
    countdown -= 1
print("liftoff")`,
  annotations: [],
  expectedOutput: `1 odd
2 even
3 odd
4 even
5 odd
1 + 2 + ... + 100 = 5050
countdown 3
countdown 2
countdown 1
liftoff`,
};
