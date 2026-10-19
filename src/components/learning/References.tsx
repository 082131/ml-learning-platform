import type { LessonMeta } from '@/lib/types';
import s from './References.module.css';

/** The lesson's sources, with the version each statement was checked against (constitution II). */
export function References({ refs }: { refs: NonNullable<LessonMeta['references']> }) {
  return (
    <section className={s.refs} aria-labelledby="lesson-references">
      <h2 id="lesson-references" className={s.title}>
        References
      </h2>
      <ul className={s.list}>
        {refs.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noreferrer">
              {r.title}
            </a>
            {r.version && <span className={s.version}> · {r.version}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
