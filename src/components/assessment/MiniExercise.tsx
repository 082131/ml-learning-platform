import { useState, type ReactNode } from 'react';
import { useProgress, useProgressStore } from '@/app/progress';
import { recordExercise } from '@/lib/progress/actions';
import type { RunResult } from '@/lib/python/runner';
import type { CodeExample, Exercise } from '@/lib/types';
import { Badge, Button } from '@/components/ui';
import { PlainCode } from '@/components/code/PlainCode';
import { PythonRunner } from '@/components/code/PythonRunner';
import { useLessonId } from '@/components/learning/LessonContext';
import { InlineText } from './InlineText';
import s from './Assessment.module.css';

interface MiniExerciseProps {
  exercise: Exercise;
  language?: CodeExample['language'];
  /** MDX prose for the prompt. Without it, `exercise.prompt` is shown as text. */
  children?: ReactNode;
}

/** A small exercise: hints one at a time, Pyodide tests when present, and an explicit reveal (US1, scenario 4). */
export function MiniExercise({ exercise: ex, language = 'python', children }: MiniExerciseProps) {
  const key = `${useLessonId()}#${ex.id}`;
  const store = useProgressStore();
  const saved = useProgress().exercises[key];
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult['status'] | null>(null);

  const onResult = (r: RunResult) => {
    setLastRun(r.status);
    if (r.status === 'ok' || r.status === 'test-failed')
      store.update((st) => recordExercise(st, key, { passed: r.status === 'ok' }));
  };
  const reveal = () => {
    setShowSolution(true);
    store.update((st) => recordExercise(st, key, { revealed: true }));
  };

  return (
    <div className={s.exercise} data-exercise={ex.id}>
      <div className={s.prose}>{children ?? <InlineText text={ex.prompt} />}</div>
      {saved?.passed && <Badge tone="ok">✓ Tests passed</Badge>}

      {ex.tests ? (
        <>
          <PythonRunner
            code={ex.starter ?? ''}
            tests={ex.tests}
            title="Your solution"
            runLabel="Run tests"
            onResult={onResult}
          />
          <div aria-live="polite">
            {lastRun === 'ok' && (
              <p className={s.feedback} data-correct="true">
                <strong>✓ All tests passed.</strong> Compare with the solution below to see another way to
                write it.
              </p>
            )}
          </div>
        </>
      ) : (
        ex.starter && (
          <div className={s.codeBox}>
            <PlainCode source={ex.starter} language={language} label="Starter code" />
          </div>
        )
      )}

      <div className={s.hints}>
        {ex.hints.slice(0, hints).map((h, i) => (
          <div key={i} className={s.hint}>
            <span className={s.hintLabel}>Hint {i + 1}</span>
            <InlineText text={h} />
          </div>
        ))}
        <div className={s.row}>
          {hints < ex.hints.length && (
            <Button onClick={() => setHints(hints + 1)}>
              Show hint {hints + 1} of {ex.hints.length}
            </Button>
          )}
          {showSolution ? (
            <Button variant="ghost" onClick={() => setShowSolution(false)}>
              Hide solution
            </Button>
          ) : (
            <Button onClick={reveal}>{saved?.revealed ? 'Show solution again' : 'Reveal solution'}</Button>
          )}
        </div>
      </div>

      {showSolution && (
        <div className={s.solution}>
          <span className={s.hintLabel}>Solution</span>
          <div className={s.codeBox}>
            <PlainCode source={ex.solution} language={language} label="Solution code" />
          </div>
          <InlineText text={ex.explanation} />
        </div>
      )}
    </div>
  );
}
