import { useId, useState } from 'react';
import { gradeNumeric, parseAnswer } from '@/lib/quiz';
import type { QuizQuestion } from '@/lib/types';
import { QuestionFrame, type Verdict } from './QuestionFrame';
import { useQuizRecord } from './useQuizRecord';
import s from './Assessment.module.css';

type Numeric = Extract<QuizQuestion, { type: 'numeric' }>;

export function NumericQuestion({ q, number }: { q: Numeric; number: number }) {
  const { saved, record } = useQuizRecord(q.id);
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [invalid, setInvalid] = useState(false);
  const id = useId();

  const check = () => {
    const { correct, valid } = gradeNumeric(q, parseAnswer(value));
    setInvalid(!valid);
    if (!valid) return;
    record(correct);
    setVerdict({ correct, text: correct ? q.explain : `Hint: ${q.hint}` });
  };

  return (
    <QuestionFrame
      number={number}
      saved={saved}
      verdict={verdict}
      canCheck={value.trim() !== ''}
      onCheck={check}
      onRetry={() => setVerdict(null)}
    >
      <label htmlFor={id} className={s.prompt}>
        <span className={s.number}>Q{number}.</span> {q.prompt}
      </label>
      <input
        id={id}
        className={s.input}
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !verdict && check()}
        readOnly={verdict !== null}
        aria-invalid={invalid}
      />
      {invalid && <p className={s.error}>Enter a number, for example 0.25.</p>}
      {q.tolerance > 0 && <p className={s.meta}>Answers within ±{q.tolerance} count as correct.</p>}
    </QuestionFrame>
  );
}
