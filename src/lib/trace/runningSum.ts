import type { Trace, TraceStep } from '../types';
import { array, scalar, text } from './values';

/** The code this trace steps through. `{{xs}}` is filled from the same list the trace is built from. */
export const RUNNING_SUM_SOURCE = `xs = {{xs}}
total = 0
for x in xs:
    total = total + x
print(total)`;

/** A computed trace of summing a list with a loop: one step per executed line, in order. */
export function buildRunningSumTrace(xs: number[]): Trace {
  const steps: TraceStep[] = [];
  const list = array(xs);
  steps.push({
    range: { line: 1 },
    vars: { xs: list },
    note: `Create the list xs with ${xs.length} numbers.`,
  });
  let total = 0;
  steps.push({
    range: { line: 2 },
    vars: { xs: list, total: scalar(total) },
    note: 'Start the running total at 0.',
  });
  for (const [i, x] of xs.entries()) {
    steps.push({
      range: { line: 3 },
      vars: { xs: list, total: scalar(total), x: scalar(x) },
      note: `Loop iteration ${i + 1}: x takes the next item, ${x}.`,
      highlight: { xs: [[i]] },
    });
    const next = total + x;
    steps.push({
      range: { line: 4, startCol: 12, endCol: 21 },
      vars: { xs: list, total: scalar(next), x: scalar(x) },
      note: `Add x to the total: ${total} + ${x} = ${next}.`,
      highlight: { xs: [[i]] },
    });
    total = next;
  }
  const after = {
    xs: list,
    total: scalar(total),
    ...(xs.length ? { x: scalar(xs[xs.length - 1] ?? 0) } : {}),
  };
  steps.push({
    range: { line: 5 },
    vars: { ...after, output: text(String(total)) },
    note: `The loop is done. print shows the final total, ${total}. Note that x keeps its last value after the loop.`,
  });
  return { source: 'computed', steps };
}
