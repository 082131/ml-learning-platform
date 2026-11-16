import { useState } from 'react';
import { questions, roles } from '@/app/interview';
import { formatClock } from '@/lib/exam/engine';
import {
  bankStats,
  buildDrill,
  filterQuestions,
  type QuestionFilter,
  type StatusFilter,
} from '@/lib/interview/practice';
import { clearRatings, rateQuestion } from '@/lib/interview/storage';
import type { QuestionKind, RoleId } from '@/lib/interview/types';
import { useNow } from '@/components/exam/useExamStore';
import { StatGrid } from '@/components/layout/StatGrid';
import { Button } from '@/components/ui';
import { QuestionCard } from './QuestionCard';
import { useInterviewStore } from './useInterviewStore';
import s from './Interview.module.css';

const DRILL_SIZE = 5;
const KINDS: { id: QuestionKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'technical', label: 'Technical' },
  { id: 'system-design', label: 'System design' },
  { id: 'behavioral', label: 'Behavioral' },
];
const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Any status' },
  { id: 'new', label: 'Not tried' },
  { id: 'review', label: 'Needs work' },
  { id: 'solid', label: 'Nailed' },
];
const roleChip = Object.fromEntries(roles.map((r) => [r.id, r.chip]));

interface ChipRowProps<T extends string> {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

function ChipRow<T extends string>({ label, options, value, onChange }: ChipRowProps<T>) {
  return (
    <div className={s.chipRow} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={s.chip}
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface Drill {
  ids: string[];
  at: number;
  startedAt: number;
}

interface PracticePanelProps {
  role: RoleId | 'all';
  onRole: (role: RoleId | 'all') => void;
}

/** The question bank: filter it, open any card, or run a five-question mock round that starts with your weak spots. */
export function PracticePanel({ role, onRole }: PracticePanelProps) {
  const { state, update } = useInterviewStore();
  const [kind, setKind] = useState<QuestionKind | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [drill, setDrill] = useState<Drill | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const now = useNow(drill !== null);

  const filter: QuestionFilter = { role, kind, status };
  const inRole = filterQuestions(questions, { role, kind: 'all', status: 'all' }, state.ratings);
  const shown = filterQuestions(questions, filter, state.ratings);
  const stats = bankStats(inRole, state.ratings);
  const info = roles.find((r) => r.id === role);
  const rate = (id: string) => (rating: 1 | 2 | 3) =>
    update((st) => rateQuestion(st, id, rating, Date.now()));

  if (drill) {
    const q = questions.find((x) => x.id === drill.ids[drill.at])!;
    const last = drill.at === drill.ids.length - 1;
    return (
      <div className={s.panel}>
        <div className={s.drillBar}>
          <span className={s.meta}>
            Mock round · question {drill.at + 1} of {drill.ids.length}
          </span>
          <span className={s.clock} role="timer" aria-label="Time on this question">
            {formatClock(Math.max(1, now - drill.startedAt))}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setDrill(null)}>
            End round
          </Button>
        </div>
        <QuestionCard
          key={q.id}
          question={q}
          roleLabel={roleChip[q.role] ?? q.role}
          record={state.ratings[q.id]}
          onRate={rate(q.id)}
          headingLevel={2}
        />
        <div className={s.row}>
          <Button
            variant="primary"
            onClick={() =>
              last ? setDrill(null) : setDrill({ ...drill, at: drill.at + 1, startedAt: Date.now() })
            }
          >
            {last ? 'Finish round' : 'Next question →'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.panel}>
      <ChipRow
        label="Role"
        options={[
          { id: 'all' as const, label: 'All roles' },
          ...roles.map((r) => ({ id: r.id, label: r.chip })),
        ]}
        value={role}
        onChange={onRole}
      />
      {info && <p className={s.loop}>{info.loop}</p>}
      <StatGrid
        label="Practice progress"
        stats={[
          { value: stats.total, label: 'Questions in this bank' },
          { value: stats.practiced, label: 'Practiced' },
          { value: stats.solid, label: 'Nailed' },
          { value: stats.review, label: 'Need another go' },
        ]}
      />
      <div className={s.row}>
        <Button
          variant="primary"
          disabled={inRole.length === 0}
          onClick={() =>
            setDrill({
              ids: buildDrill(inRole, state.ratings, DRILL_SIZE, `${Date.now()}`),
              at: 0,
              startedAt: Date.now(),
            })
          }
        >
          Start a {Math.min(DRILL_SIZE, inRole.length)}-question mock round
        </Button>
        <span className={s.hint}>One at a time, weakest first: missed, then partly, then new.</span>
      </div>

      <div className={s.filters}>
        <ChipRow label="Question type" options={KINDS} value={kind} onChange={setKind} />
        <ChipRow label="Status" options={STATUSES} value={status} onChange={setStatus} />
      </div>
      <p className={s.meta} role="status" data-shown={shown.length}>
        Showing {shown.length} of {inRole.length} questions
      </p>

      <div className={s.cards}>
        {shown.length === 0 && <p className={s.muted}>No questions match these filters.</p>}
        {shown.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            roleLabel={roleChip[q.role] ?? q.role}
            record={state.ratings[q.id]}
            onRate={rate(q.id)}
          />
        ))}
      </div>

      {stats.practiced > 0 &&
        (confirmReset ? (
          <div className={s.confirm}>
            <p>Clear your {stats.practiced} self-ratings in this bank? The questions stay.</p>
            <div className={s.row}>
              <Button
                onClick={() => {
                  update((st) =>
                    clearRatings(
                      st,
                      inRole.map((q) => q.id),
                    ),
                  );
                  setConfirmReset(false);
                }}
              >
                Clear ratings
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={s.row}>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              Reset ratings for this bank…
            </Button>
          </div>
        ))}
    </div>
  );
}
