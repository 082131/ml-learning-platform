import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { curriculum } from '@/app/content';
import s from './Page.module.css';

interface Props {
  ids: string[];
  empty: string;
  /** Extra control per row, such as a remove button. */
  action?: (id: string) => ReactNode;
}

export function LessonLinkList({ ids, empty, action }: Props) {
  const lessons = ids.map((id) => curriculum.getLesson(id)).filter((l) => l !== undefined);
  if (lessons.length === 0) return <p className={s.muted}>{empty}</p>;
  return (
    <ul className={s.list}>
      {lessons.map((l) => (
        <li key={l.ref.id}>
          <span>
            <span className={s.mono}>{l.track.code}</span>{' '}
            <Link to={`/learn/${l.ref.id}`}>{l.meta.title}</Link>
          </span>
          {action?.(l.ref.id)}
        </li>
      ))}
    </ul>
  );
}
