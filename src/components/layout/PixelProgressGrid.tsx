import { useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { formatNumber } from '@/components/ui';
import type { LessonInfo } from '@/lib/curriculum';
import { lessonProgress } from '@/lib/progress/recommend';
import type { ProgressState } from '@/lib/progress/schema';
import s from './PixelProgressGrid.module.css';

export interface PixelGroup {
  id: string;
  label: string;
  lessons: LessonInfo[];
}

type CellState = 'complete' | 'in-progress' | 'not-started' | 'outline';

const STATE_TEXT: Record<CellState, string> = {
  complete: 'Complete',
  'in-progress': 'In progress',
  'not-started': 'Not started',
  outline: 'Outline only',
};

function cellState(l: LessonInfo, p: ProgressState): CellState {
  const progress = lessonProgress(l.ref.id, p);
  if (progress !== 'not-started') return progress;
  return l.ref.status === 'outline' ? 'outline' : 'not-started';
}

interface Props {
  label: string;
  groups: PixelGroup[];
  progress: ProgressState;
  /** Rows per group; columns follow from the lesson count. */
  rows?: number;
}

/**
 * The dark pixel band from reference 01, made functional: one cell per lesson.
 * Arrow keys move between cells, Enter opens the lesson, and hover or focus shows its title in the readout.
 */
export function PixelProgressGrid({ label, groups, progress, rows = 2 }: Props) {
  const all = groups.flatMap((g) => g.lessons);
  const [focusIndex, setFocusIndex] = useState(0);
  const [shown, setShown] = useState<LessonInfo | undefined>();
  const cells = useRef<(HTMLAnchorElement | null)[]>([]);

  const move = (to: number) => {
    const i = Math.max(0, Math.min(all.length - 1, to));
    setFocusIndex(i);
    cells.current[i]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const target = {
      ArrowRight: i + 1,
      ArrowDown: i + 1,
      ArrowLeft: i - 1,
      ArrowUp: i - 1,
      Home: 0,
      End: all.length - 1,
    }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    move(target);
  };

  const counts = all.reduce<Record<CellState, number>>(
    (acc, l) => ({ ...acc, [cellState(l, progress)]: acc[cellState(l, progress)] + 1 }),
    { complete: 0, 'in-progress': 0, 'not-started': 0, outline: 0 },
  );

  const indexOf = new Map(all.map((l, i) => [l.ref.id, i]));
  return (
    <section className={s.band} aria-label={label}>
      <p className="visually-hidden">
        Each cell is a lesson. Use the arrow keys to move between cells and Enter to open one.
      </p>
      <div className={s.groups}>
        {groups.map((g) => (
          <div key={g.id} className={s.group}>
            <span className={s.groupLabel}>{g.label}</span>
            <ul className={s.cells} style={{ gridTemplateRows: `repeat(${rows}, var(--cell))` }}>
              {g.lessons.map((l) => {
                const i = indexOf.get(l.ref.id) ?? 0;
                const state = cellState(l, progress);
                return (
                  <li key={l.ref.id}>
                    <Link
                      ref={(el) => {
                        cells.current[i] = el;
                      }}
                      to={`/learn/${l.ref.id}`}
                      className={s.cell}
                      data-state={state}
                      tabIndex={i === focusIndex ? 0 : -1}
                      aria-label={`${formatNumber(l.number)} ${l.meta.title}: ${STATE_TEXT[state]}`}
                      onKeyDown={(e) => onKeyDown(e, i)}
                      onFocus={() => {
                        setFocusIndex(i);
                        setShown(l);
                      }}
                      onMouseEnter={() => setShown(l)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className={s.footer}>
        <p className={s.readout} aria-hidden="true">
          {shown ? (
            <>
              <span className={s.readoutCode}>
                {shown.track.code} // {formatNumber(shown.number)}
              </span>{' '}
              {shown.meta.title} · {STATE_TEXT[cellState(shown, progress)]}
            </>
          ) : (
            'Hover or focus a cell to see its lesson'
          )}
        </p>
        <ul className={s.legend} aria-label="Legend">
          {(Object.keys(STATE_TEXT) as CellState[]).map((k) => (
            <li key={k}>
              <span className={s.swatch} data-state={k} aria-hidden="true" />
              {STATE_TEXT[k]} {counts[k]}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
