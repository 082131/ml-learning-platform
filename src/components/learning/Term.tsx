import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { curriculum, glossaryById } from '@/app/content';
import { Popover } from '@/components/ui';
import s from './Term.module.css';

/** Inline glossary term. Click, Enter or Space opens its definition with a link to the lesson that introduces it. */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const term = glossaryById.get(id);
  if (!term) {
    console.error(`<Term id="${id}"> is not in content/glossary.ts`);
    return <>{children}</>;
  }
  const intro = curriculum.getLesson(term.introducedIn);
  return (
    <Popover trigger={children ?? term.term} triggerClassName={s.trigger} label={`Definition: ${term.term}`}>
      <strong className={s.name}>{term.term}</strong>
      <span className={s.short}>{term.short}</span>
      <span className={s.links}>
        {intro && <Link to={`/learn/${intro.ref.id}`}>Introduced in: {intro.meta.title}</Link>}
        <Link to={`/glossary?term=${term.id}`}>Open in glossary</Link>
      </span>
    </Popover>
  );
}
