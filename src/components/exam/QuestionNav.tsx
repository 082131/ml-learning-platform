import type { Attempt } from '@/lib/exam/engine';
import s from './Exam.module.css';

interface QuestionNavProps {
  attempt: Attempt;
  current: number;
  onJump: (index: number) => void;
  /** After submitting: which items were right. */
  results?: Record<string, boolean>;
}

/** The 100-cell map of the sitting: answered, flagged, current and (after submitting) right or wrong. */
export function QuestionNav({ attempt, current, onJump, results }: QuestionNavProps) {
  const answered = attempt.order.filter((id) => (attempt.answers[id]?.length ?? 0) > 0).length;
  return (
    <nav className={s.nav} aria-label="Question map">
      <p className={s.meta}>
        {answered} of {attempt.order.length} answered · {attempt.flagged.length} flagged
      </p>
      <div className={s.grid}>
        {attempt.order.map((id, i) => {
          const done = (attempt.answers[id]?.length ?? 0) > 0;
          const flagged = attempt.flagged.includes(id);
          const result = results ? (results[id] ? 'right' : 'wrong') : undefined;
          const state = result ?? (done ? 'answered' : 'not answered');
          return (
            <button
              key={id}
              type="button"
              className={s.cell}
              data-answered={done}
              data-flagged={flagged}
              data-current={i === current}
              data-result={result}
              aria-current={i === current ? 'step' : undefined}
              aria-label={`Question ${i + 1}, ${state}${flagged ? ', flagged' : ''}`}
              onClick={() => onJump(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className={s.legend}>
        {results ? (
          <>
            <span>Green: right</span>
            <span>Red: wrong or blank</span>
          </>
        ) : (
          <>
            <span>Filled: answered</span>
            <span>Orange ring: flagged</span>
          </>
        )}
      </p>
    </nav>
  );
}
