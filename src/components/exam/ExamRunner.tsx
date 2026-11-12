import { useEffect, useState } from 'react';
import { choose, formatClock, isMulti, timeLeft, toggleFlag, type Attempt } from '@/lib/exam/engine';
import type { ExamDef } from '@/lib/exam/types';
import { Button } from '@/components/ui';
import { PromptText } from './PromptText';
import { QuestionNav } from './QuestionNav';
import { useNow } from './useExamStore';
import s from './Exam.module.css';

interface ExamRunnerProps {
  exam: ExamDef;
  attempt: Attempt;
  onChange: (attempt: Attempt) => void;
  onSubmit: () => void;
}

const LETTERS = 'ABCDEFGH';
const LOW_TIME_MS = 10 * 60_000;

export function ExamRunner({ exam, attempt, onChange, onSubmit }: ExamRunnerProps) {
  const [current, setCurrent] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const now = useNow(true);
  const left = timeLeft(attempt, exam.minutes, now);
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const item = byId.get(attempt.order[current]!)!;
  const chosen = attempt.answers[item.id] ?? [];
  const multi = isMulti(item);
  const unanswered = attempt.order.filter((id) => !(attempt.answers[id]?.length ?? 0)).length;

  useEffect(() => {
    if (left === 0) onSubmit();
  }, [left, onSubmit]);

  const go = (i: number) => {
    setCurrent(Math.max(0, Math.min(attempt.order.length - 1, i)));
    setConfirming(false);
  };

  return (
    <div>
      <div className={s.bar}>
        <span className={s.clock} data-low={left < LOW_TIME_MS} role="timer" aria-label="Time left">
          {formatClock(left)}
        </span>
        <span className={s.meta}>
          Item {current + 1} of {attempt.order.length}
        </span>
        <Button variant="primary" size="sm" onClick={() => setConfirming(true)}>
          Submit exam
        </Button>
      </div>

      {confirming && (
        <div className={s.confirm} role="alertdialog" aria-labelledby="confirm-text">
          <p id="confirm-text">
            {unanswered > 0
              ? `${unanswered} item${unanswered === 1 ? ' is' : 's are'} unanswered and will count as wrong. `
              : 'Every item is answered. '}
            Submit now? You cannot change answers afterwards.
          </p>
          <div className={s.row}>
            <Button variant="primary" onClick={onSubmit}>
              Submit and see my score
            </Button>
            <Button onClick={() => setConfirming(false)}>Keep working</Button>
          </div>
        </div>
      )}

      <div className={s.runner} style={{ marginTop: 'var(--s-4)' }}>
        <div className={s.question} data-exam-item={item.id}>
          <fieldset className={s.fieldset}>
            <legend className={s.prompt}>
              <span className={s.qnum}>
                Q{current + 1}
                {multi ? ` · choose ${item.answer.length}` : ''}
              </span>
              <PromptText text={item.prompt} />
            </legend>
            {attempt.optionOrder[item.id]!.map((orig, pos) => (
              <label key={orig} className={s.option}>
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={`exam-${item.id}`}
                  checked={chosen.includes(orig)}
                  onChange={() => onChange(choose(attempt, item, orig))}
                />
                <span className={s.letter}>{LETTERS[pos]}.</span>
                <span>{item.options[orig]}</span>
              </label>
            ))}
          </fieldset>
          <div className={s.row}>
            <Button onClick={() => go(current - 1)} disabled={current === 0}>
              ← Previous
            </Button>
            <Button onClick={() => go(current + 1)} disabled={current === attempt.order.length - 1}>
              Next →
            </Button>
            <Button variant="ghost" onClick={() => onChange(toggleFlag(attempt, item.id))}>
              {attempt.flagged.includes(item.id) ? '⚑ Unflag' : '⚐ Flag for review'}
            </Button>
          </div>
        </div>
        <QuestionNav attempt={attempt} current={current} onJump={go} />
      </div>
    </div>
  );
}
