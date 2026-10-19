import type { QuizQuestion } from '@/lib/types';
import { ChoiceQuestion } from './ChoiceQuestion';
import { NumericQuestion } from './NumericQuestion';
import { OrderQuestion } from './OrderQuestion';
import s from './Assessment.module.css';

/** A lesson's knowledge check: choice, numeric and order questions with specific feedback (FR-012). */
export function KnowledgeCheck({ questions }: { questions: QuizQuestion[] }) {
  return (
    <div className={s.check}>
      {questions.map((q, i) => {
        const number = i + 1;
        if (q.type === 'choice') return <ChoiceQuestion key={q.id} q={q} number={number} />;
        if (q.type === 'numeric') return <NumericQuestion key={q.id} q={q} number={number} />;
        return <OrderQuestion key={q.id} q={q} number={number} />;
      })}
    </div>
  );
}
