import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
import s from './Assessment.module.css';

export interface Verdict {
  correct: boolean;
  /** Why this answer is right or wrong, never just whether (spec US1, scenario 3). */
  text: string;
}

interface QuestionFrameProps {
  number: number;
  saved?: { correct: boolean; attempts: number };
  verdict: Verdict | null;
  canCheck: boolean;
  onCheck: () => void;
  onRetry: () => void;
  children: ReactNode;
}

/** Shared shell: the answer controls, Check, feedback with its reason, Try again, and the saved attempts. */
export function QuestionFrame({
  number,
  saved,
  verdict,
  canCheck,
  onCheck,
  onRetry,
  children,
}: QuestionFrameProps) {
  return (
    <div className={s.question} data-question={number}>
      {children}
      <div className={s.row}>
        {verdict ? (
          <Button onClick={onRetry}>Try again</Button>
        ) : (
          <Button variant="primary" onClick={onCheck} disabled={!canCheck}>
            Check answer
          </Button>
        )}
        {saved && (
          <span className={s.meta}>
            {saved.attempts} attempt{saved.attempts === 1 ? '' : 's'} · last answer{' '}
            {saved.correct ? 'correct' : 'incorrect'}
          </span>
        )}
      </div>
      <div aria-live="polite">
        {verdict && (
          <div className={s.feedback} data-correct={verdict.correct}>
            <strong>{verdict.correct ? '✓ Correct.' : '✗ Not quite.'}</strong> {verdict.text}
          </div>
        )}
      </div>
    </div>
  );
}
