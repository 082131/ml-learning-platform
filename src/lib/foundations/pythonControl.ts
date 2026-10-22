import type { ExperimentDef, ReadoutItem, Trace, TraceStep } from '../types';
import { pyPrint, traceVars, type Py } from './pyValues';

/** The program the python-control step-through walks. */
export const CONTROL_SOURCE = `def grade(score, pass_mark):
    if score >= pass_mark:
        return "pass"
    return "fail"

scores = {{scores}}
pass_mark = {{pass_mark}}
passed = 0
for s in scores:
    result = grade(s, pass_mark)
    if result == "pass":
        passed += 1
print(passed, "of", len(scores), "passed")`;

const LINE = {
  def: 1,
  if: 2,
  pass: 3,
  fail: 4,
  scores: 6,
  mark: 7,
  passed: 8,
  for: 9,
  call: 10,
  check: 11,
  add: 12,
  print: 13,
};

export interface ControlState {
  /** Comma-separated whole numbers, as typed. */
  scores: string;
  passMark: number;
}

export const MAX_SCORES = 6;
export const MARK_LIMITS = { min: 0, max: 100, step: 5 } as const;

/** The typed scores: whole numbers from 0 to 100, at most six. Anything else is dropped. */
export const parseScores = (text: string) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^\d{1,3}$/.test(t))
    .map(Number)
    .filter((n) => n <= 100)
    .slice(0, MAX_SCORES);

export const grade = (score: number, passMark: number) => (score >= passMark ? 'pass' : 'fail');

export interface ControlResult {
  scores: number[];
  grades: ('pass' | 'fail')[];
  passed: number;
  output: string;
}

export function computeControl(s: ControlState): ControlResult {
  const scores = parseScores(s.scores);
  const grades = scores.map((x) => grade(x, s.passMark));
  const passed = grades.filter((g) => g === 'pass').length;
  return { scores, grades, passed, output: pyPrint(passed, 'of', scores.length, 'passed') };
}

export const controlSlots = (s: ControlState): Record<string, string> => ({
  scores: `[${parseScores(s.scores).join(', ')}]`,
  pass_mark: String(s.passMark),
});

/**
 * Every line Python runs, in order, with the variables after it: module lines see module variables,
 * lines inside grade() see only its parameters. Python keeps `s` and `result` after the loop ends.
 */
export function buildControlTrace(s: ControlState): Trace {
  const { scores, passed: total, output } = computeControl(s);
  const mod: Record<string, Py> = {};
  const steps: TraceStep[] = [];
  const at = (line: number, note: string, vars = mod, highlight?: number) =>
    steps.push({
      range: { line },
      vars: traceVars(vars),
      note,
      ...(highlight !== undefined && { highlight: { scores: [[highlight]] } }),
    });

  at(LINE.def, 'def defines the function grade. Nothing inside it runs until it is called.');
  mod.scores = scores;
  at(LINE.scores, `scores is a list of ${scores.length} numbers.`);
  mod.pass_mark = s.passMark;
  at(LINE.mark, `pass_mark is ${s.passMark}.`);
  let passed = 0;
  mod.passed = passed;
  at(LINE.passed, 'passed counts how many scores pass. It starts at 0.');
  scores.forEach((score, i) => {
    mod.s = score;
    at(LINE.for, `Iteration ${i + 1}: s takes the next item of scores, ${score}.`, mod, i);
    const local = { score, pass_mark: s.passMark };
    const ok = score >= s.passMark;
    at(
      LINE.if,
      `Inside grade(): ${score} >= ${s.passMark} is ${ok ? 'True' : 'False'}, so ${ok ? 'the if body runs' : 'the if body is skipped'}. Only the function’s own parameters are in scope here.`,
      local,
    );
    at(ok ? LINE.pass : LINE.fail, `grade() returns "${ok ? 'pass' : 'fail'}" and stops.`, local);
    mod.result = ok ? 'pass' : 'fail';
    at(LINE.call, `Back in the loop: result is "${mod.result}".`, mod, i);
    at(LINE.check, `result == "pass" is ${ok ? 'True' : 'False'}.`, mod, i);
    if (ok) {
      passed += 1;
      mod.passed = passed;
      at(LINE.add, `passed += 1 makes passed ${passed}.`, mod, i);
    }
  });
  at(
    LINE.for,
    scores.length
      ? 'No items left, so the loop ends. s and result keep their last values.'
      : 'scores is empty, so the loop body never runs.',
  );
  at(
    LINE.print,
    `print shows: ${output}${total === scores.length && scores.length ? ' (everyone passed)' : ''}`,
  );
  return { source: 'computed', steps };
}

export function controlReadout(s: ControlState, r: ControlResult): ReadoutItem[] {
  return [
    { label: 'scores (as Python sees them)', value: controlSlots(s).scores! },
    { label: 'grade(s, pass_mark) for each score', value: r.grades.join(', ') || '(none)' },
    { label: 'print(passed, "of", len(scores), "passed")', value: r.output },
  ];
}

export function controlExperiment(
  id: string,
  initial: ControlState,
  traceExample: string,
): ExperimentDef<ControlState, ControlResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'text',
        id: 'scores',
        label: 'scores (up to 6 whole numbers from 0 to 100, separated by commas)',
        maxLength: 40,
        get: (s) => s.scores,
        set: (s, v) => ({ ...s, scores: v.replace(/[^\d, ]/g, '') }),
      },
      {
        kind: 'slider',
        id: 'pass-mark',
        label: 'pass_mark',
        ...MARK_LIMITS,
        get: (s) => s.passMark,
        set: (s, v) => ({ ...s, passMark: v }),
      },
    ],
    compute: computeControl,
    trace: buildControlTrace,
    traceExample,
    readout: controlReadout,
  };
}
