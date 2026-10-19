import { useState } from 'react';
import type { RunResult } from '@/lib/python/runner';
import type { CodeExample } from '@/lib/types';
import { Button } from '@/components/ui';
import { CodeEditor } from './CodeEditor';
import { usePythonRunner } from './pythonRuntime';
import { RunOutput } from './RunOutput';
import { PHASE_LABEL } from './runStatus';
import code from './Code.module.css';
import s from './PythonRunner.module.css';

interface PythonRunnerProps {
  /** A Python example; its source is the starting code and its expectedOutput is shown until a real run. */
  example?: CodeExample;
  /** Starting code when there is no example. */
  code?: string;
  /** Hidden assert statements run against the learner's code (MiniExercise). */
  tests?: string;
  title?: string;
  runLabel?: string;
  onResult?: (result: RunResult) => void;
}

/** Runs editable Python in the browser with Pyodide (US4). Nothing runs on a server. */
export function PythonRunner({
  example,
  code: start = '',
  tests,
  title,
  runLabel = 'Run',
  onResult,
}: PythonRunnerProps) {
  const initial = example?.source ?? start;
  const runner = usePythonRunner();
  const [source, setSource] = useState(initial);
  const [phase, setPhase] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  const run = async () => {
    setPhase('Starting');
    const r = await runner.run({ code: source, tests }, { onPhase: (p) => setPhase(PHASE_LABEL[p]) });
    setPhase(null);
    setResult(r);
    onResult?.(r);
  };

  return (
    <figure className={code.block} data-wide data-python-runner>
      <div className={code.frame}>
        <div className={code.header}>
          <span>{title ?? 'Python'} · runs in your browser</span>
        </div>
        <CodeEditor value={source} onChange={setSource} label={`${title ?? 'Python'} code editor`} />
        <div className={s.actions}>
          <Button variant="primary" onClick={run} disabled={phase !== null}>
            {runLabel}
          </Button>
          <Button
            onClick={() => {
              setSource(initial);
              setResult(null);
            }}
            disabled={phase !== null || source === initial}
          >
            Reset
          </Button>
          <span className={s.status} role="status">
            {phase && `${phase}…`}
            {phase === PHASE_LABEL['loading-runtime'] &&
              ' The first run downloads Python, which can take a while.'}
          </span>
        </div>
        {offline && !result && (
          <p className={s.offline}>
            You seem to be offline. Running Python needs a connection the first time.
          </p>
        )}
        {result ? (
          <RunOutput result={result} />
        ) : (
          example?.expectedOutput && (
            <div className={s.output}>
              <div className={s.outputHead}>
                <span>Expected output · not run yet</span>
              </div>
              <pre className={s.stream} tabIndex={0} role="group" aria-label="Expected output">
                {example.expectedOutput}
              </pre>
            </div>
          )
        )}
        {result?.status === 'load-failed' && example?.expectedOutput && (
          <div className={s.output}>
            <div className={s.outputHead}>
              <span>Expected output · from the lesson, not run</span>
            </div>
            <pre className={s.stream} tabIndex={0} role="group" aria-label="Expected output">
              {example.expectedOutput}
            </pre>
          </div>
        )}
      </div>
    </figure>
  );
}
