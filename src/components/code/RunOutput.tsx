import type { RunResult } from '@/lib/python/runner';
import s from './PythonRunner.module.css';

const HEADING: Record<RunResult['status'], string> = {
  ok: 'Output',
  error: 'Error',
  'test-failed': 'Test failed',
  timeout: 'Stopped',
  'load-failed': 'Python runtime couldn’t load',
};

/** Real output of a run: stdout, stderr, the traceback or why it stopped, figures, and the runtime version. */
export function RunOutput({ result }: { result: RunResult }) {
  const failed = result.status !== 'ok';
  return (
    <div className={s.output} data-run-status={result.status}>
      <div className={s.outputHead}>
        <span>{HEADING[result.status]}</span>
        {result.version && (
          <span>
            Ran in your browser · Python {result.version.python} · Pyodide {result.version.pyodide}
          </span>
        )}
      </div>
      {result.stdout && (
        <pre className={s.stream} tabIndex={0} role="group" aria-label="Printed output">
          {result.stdout.replace(/\n$/, '')}
        </pre>
      )}
      {result.stderr && (
        <pre className={`${s.stream} ${s.stderr}`} tabIndex={0} role="group" aria-label="Warnings (stderr)">
          {result.stderr.replace(/\n$/, '')}
        </pre>
      )}
      {failed && result.message && (
        <pre className={`${s.stream} ${s.error}`} role="alert" tabIndex={0}>
          {result.status === 'load-failed'
            ? `${result.message}\nCheck your connection and try again. The code above still works as a reading example.`
            : result.message}
        </pre>
      )}
      {result.images.map((png, i) => (
        <img
          key={i}
          className={s.figure}
          src={`data:image/png;base64,${png}`}
          alt={`Figure ${i + 1} drawn by this code`}
        />
      ))}
      {result.status === 'ok' && !result.stdout && !result.stderr && result.images.length === 0 && (
        <p className={s.empty}>The code ran and printed nothing.</p>
      )}
    </div>
  );
}
