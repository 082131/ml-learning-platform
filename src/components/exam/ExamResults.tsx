import { useState } from 'react';
import { gradeAttempt, isCorrect, type Attempt } from '@/lib/exam/engine';
import type { ExamDef } from '@/lib/exam/types';
import { Badge, Button } from '@/components/ui';
import { QuestionNav } from './QuestionNav';
import { PromptText } from './PromptText';
import s from './Exam.module.css';

interface ExamResultsProps {
  exam: ExamDef;
  attempt: Attempt;
  onRetake: () => void;
}

type Filter = 'wrong' | 'flagged' | 'all';
const LETTERS = 'ABCDEFGH';

export function ExamResults({ exam, attempt, onRetake }: ExamResultsProps) {
  const result = gradeAttempt(exam, attempt);
  const [filter, setFilter] = useState<Filter>('wrong');
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const right = Object.fromEntries(exam.questions.map((q) => [q.id, isCorrect(q, attempt.answers[q.id])]));
  const shown = attempt.order
    .map((id, i) => ({ id, n: i + 1 }))
    .filter(({ id }) =>
      filter === 'all' ? true : filter === 'wrong' ? !right[id] : attempt.flagged.includes(id),
    );

  return (
    <div className={s.intro} style={{ maxWidth: 'none' }}>
      <section className={s.section} aria-labelledby="exam-score">
        <h2 id="exam-score" className={s.h2}>
          Your score
        </h2>
        <div className={s.score}>
          <span className={s.big} data-exam-score={result.percent}>
            {result.percent}%
          </span>
          <Badge tone={result.passed ? 'ok' : 'warn'}>
            {result.passed ? `Pass (≥ ${exam.passPercent}%)` : `Below the ${exam.passPercent}% pass mark`}
          </Badge>
          <span className={s.meta}>
            {result.correct} of {result.total} right · {result.answered} answered
          </span>
        </div>
      </section>

      <section className={s.section} aria-labelledby="exam-domains">
        <h2 id="exam-domains" className={s.h2}>
          By domain
        </h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <tbody>
              {result.byDomain.map((d) => {
                const pct = d.total ? Math.round((d.correct / d.total) * 100) : 0;
                return (
                  <tr key={d.id}>
                    <td>{d.title}</td>
                    <td style={{ width: '30%' }}>
                      <div className={s.meter} aria-hidden="true">
                        <span style={{ width: `${pct}%` }} data-low={pct < exam.passPercent} />
                      </div>
                    </td>
                    <td className={s.num}>
                      {d.correct}/{d.total} · {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={s.row}>
          <Button variant="primary" onClick={onRetake}>
            Take a new sitting
          </Button>
        </div>
      </section>

      <section className={s.section} aria-labelledby="exam-review">
        <h2 id="exam-review" className={s.h2}>
          Review
        </h2>
        <div className={s.row} role="group" aria-label="Show">
          {(['wrong', 'flagged', 'all'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'primary' : 'secondary'}
              onClick={() => setFilter(f)}
            >
              {f === 'wrong' ? `Wrong (${result.wrong.length})` : f === 'flagged' ? 'Flagged' : 'All'}
            </Button>
          ))}
        </div>
        <div className={s.runner}>
          <div className={s.review}>
            {shown.length === 0 && <p className={s.muted}>Nothing to show for this filter.</p>}
            {shown.map(({ id, n }) => {
              const item = byId.get(id)!;
              const chosen = attempt.answers[id] ?? [];
              return (
                <article key={id} id={`review-${n}`} className={s.question} data-review-item={id}>
                  <div className={s.prompt}>
                    <span className={s.qnum}>
                      Q{n} · {right[id] ? '✓ right' : chosen.length ? '✗ wrong' : '✗ blank'}
                    </span>
                    <PromptText text={item.prompt} />
                  </div>
                  {attempt.optionOrder[id]!.map((orig, pos) => {
                    const correct = item.answer.includes(orig);
                    const picked = chosen.includes(orig);
                    return (
                      <div key={orig} className={s.reviewOption} data-correct={correct} data-chosen={picked}>
                        <span className={s.letter}>{LETTERS[pos]}.</span>
                        <span>{item.options[orig]}</span>
                        <span className={s.tag}>
                          {correct ? 'answer' : ''}
                          {picked ? (correct ? ' · yours' : 'yours') : ''}
                        </span>
                      </div>
                    );
                  })}
                  <p className={s.explain}>{item.explain}</p>
                </article>
              );
            })}
          </div>
          <QuestionNav
            attempt={attempt}
            current={-1}
            results={right}
            onJump={(i) => {
              setFilter('all');
              requestAnimationFrame(() => document.getElementById(`review-${i + 1}`)?.scrollIntoView());
            }}
          />
        </div>
      </section>
    </div>
  );
}
