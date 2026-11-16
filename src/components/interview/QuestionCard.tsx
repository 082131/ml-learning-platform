import { useId, useState } from 'react';
import type { Rating, RatingRecord } from '@/lib/interview/storage';
import type { InterviewQuestion } from '@/lib/interview/types';
import { InlineText } from '@/components/assessment/InlineText';
import { PromptText } from '@/components/exam/PromptText';
import { Badge, Button } from '@/components/ui';
import s from './Interview.module.css';

const KIND_LABEL: Record<InterviewQuestion['kind'], string> = {
  technical: 'Technical',
  'system-design': 'System design',
  behavioral: 'Behavioral',
};

export const RATINGS: { value: Rating; label: string }[] = [
  { value: 1, label: 'Missed it' },
  { value: 2, label: 'Partly' },
  { value: 3, label: 'Nailed it' },
];

interface QuestionCardProps {
  question: InterviewQuestion;
  roleLabel: string;
  record?: RatingRecord;
  onRate: (rating: Rating) => void;
  /** Start with the answer showing (never used in a drill). */
  initiallyOpen?: boolean;
  /** Heading level for the prompt, so the card fits lists and the one-at-a-time drill. */
  headingLevel?: 2 | 3;
}

/** One question: answer it out loud, reveal the model answer, tick what you covered, then rate yourself. */
export function QuestionCard({
  question: q,
  roleLabel,
  record,
  onRate,
  initiallyOpen = false,
  headingLevel = 3,
}: QuestionCardProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const [ticked, setTicked] = useState<number[]>([]);
  const answerId = useId();
  const Heading = `h${headingLevel}` as const;
  const toggle = (i: number) => setTicked((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]));

  return (
    <article className={s.card} data-question={q.id} data-rating={record?.rating ?? 0}>
      <div className={s.tags}>
        <span className={s.tag}>{roleLabel}</span>
        <span className={s.tag}>{KIND_LABEL[q.kind]}</span>
        <span className={s.tag}>{q.topic}</span>
        {q.level === 'senior' && <span className={s.tag}>Senior</span>}
        {record && (
          <Badge tone={record.rating === 3 ? 'ok' : record.rating === 2 ? 'neutral' : 'warn'}>
            {RATINGS[record.rating - 1]!.label}
          </Badge>
        )}
      </div>
      <Heading className={s.prompt}>
        <PromptText text={q.prompt} />
      </Heading>

      {!open ? (
        <div className={s.row}>
          <Button
            variant="primary"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={answerId}
          >
            Reveal model answer
          </Button>
          <span className={s.hint}>Answer out loud first. Two minutes is a good length.</span>
        </div>
      ) : (
        <div id={answerId} className={s.answer}>
          <section className={s.block} aria-label="Model answer">
            <h4 className={s.blockTitle}>Model answer</h4>
            <div className={s.prose}>
              <InlineText text={q.answer} />
            </div>
          </section>

          <section className={s.block} aria-label="What a strong answer covers">
            <h4 className={s.blockTitle}>
              What a strong answer covers
              <span className={s.count}>
                {' '}
                · you covered {ticked.length} of {q.covers.length}
              </span>
            </h4>
            <ul className={s.checklist}>
              {q.covers.map((c, i) => (
                <li key={c}>
                  <label className={s.tick}>
                    <input type="checkbox" checked={ticked.includes(i)} onChange={() => toggle(i)} />
                    <span>{c}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <div className={s.pair}>
            <section className={s.block} aria-label="Red flags">
              <h4 className={s.blockTitle}>Red flags</h4>
              <ul className={s.bullets}>
                {q.redFlags.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
            <section className={s.block} aria-label="Likely follow-ups">
              <h4 className={s.blockTitle}>Likely follow-ups</h4>
              <ul className={s.bullets}>
                {q.followUps.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className={s.rate} role="group" aria-label="Rate your answer">
            <span className={s.rateLabel}>How did you do?</span>
            {RATINGS.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={record?.rating === r.value ? 'primary' : 'secondary'}
                aria-pressed={record?.rating === r.value}
                onClick={() => onRate(r.value)}
              >
                {r.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Hide answer
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
