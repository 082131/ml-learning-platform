import { Link } from 'react-router';
import { curriculum } from '@/app/content';
import type { ProgressState } from '@/lib/progress/schema';
import s from './PrerequisiteList.module.css';

/** Each prerequisite links to its lesson and says whether it is complete (spec US2, scenario 2). */
export function PrerequisiteList({ ids, progress }: { ids: string[]; progress: ProgressState }) {
  if (ids.length === 0) return <p>None. This lesson starts from scratch.</p>;
  return (
    <ul className={s.list}>
      {ids.map((id) => {
        const info = curriculum.getLesson(id);
        const done = id in progress.completed;
        const outline = info?.ref.status === 'outline';
        return (
          <li key={id}>
            <Link to={`/learn/${id}`} className={s.chip} data-done={done}>
              <span className={s.state}>
                {done ? '✓ Complete' : outline ? 'Outline only' : 'Not complete'}
              </span>
              <span className={s.title}>{info?.meta.title ?? id}</span>
              {info && <span className={s.track}>{info.track.code}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
