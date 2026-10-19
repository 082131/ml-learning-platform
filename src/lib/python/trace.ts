import type { Trace, TraceStep } from '../types';
import { changesFrom, formatValue, removedFrom } from '../trace/values';
import type { HarnessResult } from './protocol';

type RawStep = NonNullable<HarnessResult['steps']>[number];

/** Describes what a recorded line did, from the variables before and after it. */
export function describeStep(prev: TraceStep | undefined, step: TraceStep, scope: string): string {
  const where = scope === '<module>' ? '' : ` inside ${scope}()`;
  const changes = changesFrom(prev, step);
  const parts = Object.entries(changes).flatMap(([name, change]) => {
    const value = formatValue(step.vars[name]!);
    if (change === 'new') return [`${name} is now ${value}`];
    if (change === 'changed') return [`${name} changed from ${formatValue(prev!.vars[name]!)} to ${value}`];
    return [];
  });
  const gone = removedFrom(prev, step);
  if (gone.length) parts.push(`${gone.join(', ')} ${gone.length === 1 ? 'is' : 'are'} out of scope`);
  return `Line ${step.range.line} ran${where}. ${parts.length ? `${capitalize(parts.join('; '))}.` : 'No variable changed.'}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Turns steps recorded by the Pyodide harness into a trace the StepThrough component renders. */
export function toPyodideTrace(steps: RawStep[]): Trace {
  const out: TraceStep[] = [];
  for (const raw of steps) {
    const step: TraceStep = { range: { line: raw.line }, vars: raw.vars, note: '' };
    step.note = describeStep(out.at(-1), step, raw.scope);
    out.push(step);
  }
  return { source: 'pyodide', steps: out };
}
