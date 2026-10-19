import { useState, type ReactNode } from 'react';
import { toPyodideTrace } from '@/lib/python/trace';
import type { RunResult } from '@/lib/python/runner';
import type { Trace } from '@/lib/types';
import { Button } from '@/components/ui';
import { usePythonRunner } from './pythonRuntime';
import { PHASE_LABEL } from './runStatus';
import s from './StepThrough.module.css';

/** Records a trace by running the code in Pyodide with a line tracer, when the learner asks for it. */
export function useRecordedTrace(source: string): { trace?: Trace; panel: ReactNode; notice?: string } {
  const runner = usePythonRunner();
  const [phase, setPhase] = useState<string | null>(null);
  const [result, setResult] = useState<{ source: string; run: RunResult } | null>(null);

  const record = async () => {
    setPhase('Starting');
    const run = await runner.run({ code: source, trace: true }, { onPhase: (p) => setPhase(PHASE_LABEL[p]) });
    setPhase(null);
    setResult({ source, run });
  };

  const run = result?.source === source ? result.run : undefined;
  const trace = run?.steps?.length ? toPyodideTrace(run.steps) : undefined;
  const panel = (
    <div className={s.record}>
      <p>
        Run this code in Python in your browser to record each line it executes and the variables after it.
        The first run downloads the Python runtime.
      </p>
      <Button variant="primary" onClick={record} disabled={phase !== null}>
        {phase ? `${phase}…` : 'Record trace'}
      </Button>
      {run && !trace && (
        <p role="alert" className={s.error}>
          {run.message ?? 'The code ran but executed no lines to trace.'}
        </p>
      )}
    </div>
  );
  const notice = !trace
    ? undefined
    : run?.truncated
      ? 'Recording stopped after 500 steps, so the trace ends early.'
      : run?.status === 'error'
        ? `The code raised an error after the last step:\n${run.message ?? ''}`
        : undefined;
  return { trace, panel, notice };
}
