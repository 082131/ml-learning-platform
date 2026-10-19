import { useMemo, useState } from 'react';
import { gradeOrder, move, shuffleItems } from '@/lib/quiz';
import type { QuizQuestion } from '@/lib/types';
import { Button } from '@/components/ui';
import { QuestionFrame, type Verdict } from './QuestionFrame';
import { useQuizRecord } from './useQuizRecord';
import s from './Assessment.module.css';

type Order = Extract<QuizQuestion, { type: 'order' }>;

/** Put items in order with Move up / Move down buttons, so it works by keyboard and touch alike. */
export function OrderQuestion({ q, number }: { q: Order; number: number }) {
  const { lessonId, saved, record } = useQuizRecord(q.id);
  const start = useMemo(() => shuffleItems(q.items, `${lessonId}#${q.id}`), [q.items, q.id, lessonId]);
  const [order, setOrder] = useState(start);
  const [result, setResult] = useState<{ verdict: Verdict; positions: boolean[] } | null>(null);
  const [moved, setMoved] = useState('');

  const check = () => {
    const graded = gradeOrder(q, order);
    record(graded.correct);
    const right = graded.positions.filter(Boolean).length;
    setResult({
      positions: graded.positions,
      verdict: {
        correct: graded.correct,
        text: graded.correct
          ? q.explain
          : `${right} of ${q.items.length} are in the right place. Move the marked items and try again.`,
      },
    });
  };
  const shift = (i: number, by: number) => {
    setOrder(move(order, i, i + by));
    setMoved(`Moved “${order[i]}” to position ${i + by + 1}.`);
  };

  return (
    <QuestionFrame
      number={number}
      saved={saved}
      verdict={result?.verdict ?? null}
      canCheck
      onCheck={check}
      onRetry={() => setResult(null)}
    >
      <p className={s.prompt} id={`${q.id}-prompt`}>
        <span className={s.number}>Q{number}.</span> {q.prompt}
      </p>
      <ol className={s.order} aria-labelledby={`${q.id}-prompt`}>
        {order.map((item, i) => (
          <li key={item} className={s.orderItem} data-right={result ? result.positions[i] : undefined}>
            <span className={s.number}>{i + 1}.</span>
            <span className={s.orderText}>
              {result && <span className={s.mark}>{result.positions[i] ? '✓ ' : '✗ '}</span>}
              {item}
            </span>
            <span className={s.orderButtons}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => shift(i, -1)}
                disabled={i === 0 || !!result}
                aria-label={`Move “${item}” up`}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => shift(i, 1)}
                disabled={i === order.length - 1 || !!result}
                aria-label={`Move “${item}” down`}
              >
                ↓
              </Button>
            </span>
          </li>
        ))}
      </ol>
      <p className="visually-hidden" aria-live="polite">
        {moved}
      </p>
    </QuestionFrame>
  );
}
