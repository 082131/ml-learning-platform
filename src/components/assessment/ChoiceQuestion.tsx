import { useId, useState } from 'react';
import { gradeChoice } from '@/lib/quiz';
import type { QuizQuestion } from '@/lib/types';
import { QuestionFrame, type Verdict } from './QuestionFrame';
import { useQuizRecord } from './useQuizRecord';
import s from './Assessment.module.css';

type Choice = Extract<QuizQuestion, { type: 'choice' }>;

export function ChoiceQuestion({ q, number }: { q: Choice; number: number }) {
  const { saved, record } = useQuizRecord(q.id);
  const [selected, setSelected] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const name = useId();

  const check = () => {
    if (selected === null) return;
    const { correct, explain } = gradeChoice(q, selected);
    record(correct);
    setVerdict({ correct, text: explain });
  };

  return (
    <QuestionFrame
      number={number}
      saved={saved}
      verdict={verdict}
      canCheck={selected !== null}
      onCheck={check}
      onRetry={() => {
        setVerdict(null);
        setSelected(null);
      }}
    >
      <fieldset className={s.fieldset} disabled={verdict !== null}>
        <legend className={s.prompt}>
          <span className={s.number}>Q{number}.</span> {q.prompt}
        </legend>
        {q.options.map((o, i) => (
          <label key={o.text} className={s.option} data-chosen={verdict !== null && selected === i}>
            <input type="radio" name={name} checked={selected === i} onChange={() => setSelected(i)} />
            <span>{o.text}</span>
          </label>
        ))}
      </fieldset>
    </QuestionFrame>
  );
}
