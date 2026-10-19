import { Link } from 'react-router';
import { curriculum } from '@/app/content';
import { formatNumber } from '@/components/ui';
import type { LessonInfo } from '@/lib/curriculum';
import type { ProgressState } from '@/lib/progress/schema';
import s from './LessonSidebar.module.css';

export interface SectionAnchor {
  id: string;
  label: string;
}

interface Props {
  lesson: LessonInfo;
  sections: SectionAnchor[];
  progress: ProgressState;
  onNavigate?: () => void;
}

export function LessonSidebar({ lesson, sections, progress, onNavigate }: Props) {
  const siblings = curriculum.lessonsOf(lesson.track.id).filter((l) => l.chapter.id === lesson.chapter.id);
  const jump = (id: string) => {
    onNavigate?.();
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'start' });
    el?.focus({ preventScroll: true });
  };
  return (
    <div className={s.sidebar}>
      <nav aria-label="Lessons in this chapter">
        <p className={s.heading}>
          <Link to={`/learn/${lesson.track.id}`} onClick={onNavigate}>
            {lesson.track.code}
          </Link>{' '}
          / {lesson.chapter.title}
        </p>
        <ol className={s.lessons}>
          {siblings.map((l) => {
            const done = l.ref.id in progress.completed;
            return (
              <li key={l.ref.id}>
                <Link
                  to={`/learn/${l.ref.id}`}
                  aria-current={l.ref.id === lesson.ref.id ? 'page' : undefined}
                  className={s.lesson}
                  onClick={onNavigate}
                >
                  <span className={s.num}>{formatNumber(l.number)}</span>
                  <span className={s.lessonTitle}>{l.meta.title}</span>
                  <span className={s.mark} data-done={done} aria-label={done ? 'Complete' : undefined}>
                    {done ? '✓' : l.ref.status === 'outline' ? '…' : ''}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
      {sections.length > 0 && (
        <nav aria-label="On this page">
          <p className={s.heading}>On this page</p>
          <ul className={s.sections}>
            {sections.map((sec) => (
              <li key={sec.id}>
                <button type="button" className={s.sectionLink} onClick={() => jump(sec.id)}>
                  {sec.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
