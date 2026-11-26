import { useState, type ReactNode } from 'react';
import { useProgress, useProgressStore } from '@/app/progress';
import { recordExercise } from '@/lib/progress/actions';
import { DATASETS } from '@/lib/sql/datasets';
import type { SqlCheckResult, SqlExerciseDef, SqlRunResult } from '@/lib/sql/types';
import { Badge, Button } from '@/components/ui';
import { InlineText } from '@/components/assessment/InlineText';
import { CodeEditor } from '@/components/code/CodeEditor';
import { PlainCode } from '@/components/code/PlainCode';
import { useLessonId } from '@/components/learning/LessonContext';
import a from '@/components/assessment/Assessment.module.css';
import { SqlOutput } from './SqlOutput';
import { useSqlRunner } from './sqlRuntime';
import s from './SqlTrack.module.css';

/** A SQL exercise: write a query, run the graded checks in SQLite, hints one at a time, explicit reveal. */
export function SqlExercise({ exercise: ex, children }: { exercise: SqlExerciseDef; children?: ReactNode }) {
  const key = `${useLessonId()}#${ex.id}`;
  const store = useProgressStore();
  const saved = useProgress().exercises[key];
  const runner = useSqlRunner();
  const [code, setCode] = useState(ex.starter);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<SqlCheckResult[] | null>(null);
  const [output, setOutput] = useState<SqlRunResult | null>(null);
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const setup = DATASETS[ex.dataset].sql;

  const run = async () => {
    setBusy(true);
    const [out, graded] = [await runner.run(setup, code), await runner.grade(setup, code, ex.checks)];
    setOutput(out);
    setChecks(graded.checks);
    setBusy(false);
    if (graded.status === 'ok' || graded.status === 'error')
      store.update((st) => recordExercise(st, key, { passed: graded.checks.every((c) => c.ok) }));
  };
  const allPassed = checks?.every((c) => c.ok) ?? false;

  return (
    <div className={a.exercise} data-exercise={ex.id}>
      <div className={a.prose}>{children ?? <InlineText text={ex.prompt} />}</div>
      {saved?.passed && <Badge tone="ok">✓ Tests passed</Badge>}
      <div className={a.codeBox}>
        <CodeEditor value={code} onChange={setCode} label="Your SQL" />
        <div className={s.actions}>
          <Button variant="primary" onClick={run} disabled={busy}>
            Run tests
          </Button>
          <Button onClick={() => setCode(ex.starter)} disabled={busy || code === ex.starter}>
            Reset
          </Button>
          <span className={s.status} role="status">
            {busy ? 'Running…' : checks ? `${checks.filter((c) => c.ok).length} of ${checks.length} checks passed` : ''}
          </span>
        </div>
        {checks && (
          <ul className={s.checks} aria-label="Checks">
            {checks.map((c) => (
              <li key={c.name} data-state={c.ok ? 'pass' : 'fail'}>
                <span aria-hidden="true">{c.ok ? '✓' : '✗'}</span> {c.name}
                <span className="visually-hidden">{c.ok ? ', passed' : ', failed'}</span>
                {!c.ok && c.why && <span className={s.why}> {c.why}</span>}
              </li>
            ))}
          </ul>
        )}
        {output && <SqlOutput result={output} />}
      </div>
      <div aria-live="polite">
        {allPassed && (
          <p className={a.feedback} data-correct="true">
            <strong>✓ All checks passed.</strong> Compare with the solution below to see another way to write it.
          </p>
        )}
      </div>
      <div className={a.hints}>
        {ex.hints.slice(0, hints).map((h, i) => (
          <div key={i} className={a.hint}>
            <span className={a.hintLabel}>Hint {i + 1}</span>
            <InlineText text={h} />
          </div>
        ))}
        <div className={a.row}>
          {hints < ex.hints.length && <Button onClick={() => setHints(hints + 1)}>Show hint {hints + 1} of {ex.hints.length}</Button>}
          {showSolution ? (
            <Button variant="ghost" onClick={() => setShowSolution(false)}>
              Hide solution
            </Button>
          ) : (
            <Button
              onClick={() => {
                setShowSolution(true);
                store.update((st) => recordExercise(st, key, { revealed: true }));
              }}
            >
              {saved?.revealed ? 'Show solution again' : 'Reveal solution'}
            </Button>
          )}
        </div>
      </div>
      {showSolution && (
        <div className={a.solution}>
          <span className={a.hintLabel}>Solution</span>
          <div className={a.codeBox}>
            <PlainCode source={ex.solution} language="sql" label="Solution code" />
          </div>
          <InlineText text={ex.explanation} />
        </div>
      )}
    </div>
  );
}
