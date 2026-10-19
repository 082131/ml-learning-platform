import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { curriculum, glossary } from '@/app/content';
import { PageHeader } from '@/components/layout/PageHeader';
import s from './GlossaryPage.module.css';

const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term));

export default function GlossaryPage() {
  const [params] = useSearchParams();
  const target = params.get('term');

  useEffect(() => {
    if (!target) return;
    const el = document.getElementById(`term-${target}`);
    el?.scrollIntoView({ block: 'start' });
    el?.focus({ preventScroll: true });
  }, [target]);

  return (
    <>
      <PageHeader label="Glossary" title="Glossary">
        <p className={s.lead}>
          {glossary.length} terms. Each one links to the lesson that introduces it. Terms grow as lessons are
          written.
        </p>
      </PageHeader>
      <dl className={s.list}>
        {sorted.map((t) => {
          const intro = curriculum.getLesson(t.introducedIn);
          return (
            <div
              key={t.id}
              id={`term-${t.id}`}
              tabIndex={-1}
              className={s.entry}
              data-target={t.id === target}
            >
              <dt className={s.term}>{t.term}</dt>
              <dd className={s.def}>
                <p>{t.short}</p>
                {t.long && <p className={s.long}>{t.long}</p>}
                {t.aliases?.length ? <p className={s.meta}>Also called: {t.aliases.join(', ')}</p> : null}
                {intro && (
                  <p className={s.meta}>
                    Introduced in <Link to={`/learn/${intro.ref.id}`}>{intro.meta.title}</Link>
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </>
  );
}
